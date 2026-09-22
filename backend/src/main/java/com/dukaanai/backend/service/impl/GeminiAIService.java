package com.dukaanai.backend.service.impl;

import com.dukaanai.backend.dto.AiDtos.NaturalSaleParseResponse;
import com.dukaanai.backend.dto.AiDtos.ParsedSaleItem;
import com.dukaanai.backend.service.AIService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service("geminiAIService")
public class GeminiAIService implements AIService {

    @Value("${dukaanai.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${dukaanai.ai.gemini.model:gemini-1.5-flash}")
    private String model;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final MockAIService fallbackService = new MockAIService();

    @Override
    public NaturalSaleParseResponse parseNaturalSale(String text) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.info("Gemini API key not configured, using MockAIService fallback.");
            return fallbackService.parseNaturalSale(text);
        }

        String prompt = "You are DukaanAI, a Kirana Store assistant in India. "
                + "Parse the following natural language sale text (which may be in Hindi, Hinglish, Telugu, or English) into strict JSON:\n"
                + "\"" + text.replace("\"", "\\\"") + "\"\n\n"
                + "Return JSON with schema:\n"
                + "{\n"
                + "  \"customerName\": \"string\",\n"
                + "  \"items\": [{\"name\": \"string\", \"quantity\": 1.0, \"unit\": \"kg|pcs|pack|L\", \"estimatedPrice\": 0.0}],\n"
                + "  \"totalAmount\": 0.0,\n"
                + "  \"amountPaid\": 0.0,\n"
                + "  \"amountCredit\": 0.0,\n"
                + "  \"paymentMode\": \"CASH|UPI|KHATA|SPLIT\"\n"
                + "}\n"
                + "DO NOT output markdown code fences or conversational text. Output pure JSON only.";

        try {
            String jsonResponse = callGemini(prompt);
            String cleanJson = cleanJson(jsonResponse);
            JsonNode root = objectMapper.readTree(cleanJson);

            String customerName = root.path("customerName").asText("Walk-in");
            BigDecimal totalAmount = new BigDecimal(root.path("totalAmount").asText("0"));
            BigDecimal amountPaid = new BigDecimal(root.path("amountPaid").asText("0"));
            BigDecimal amountCredit = new BigDecimal(root.path("amountCredit").asText("0"));
            String paymentMode = root.path("paymentMode").asText("CASH").toUpperCase();

            List<ParsedSaleItem> items = new ArrayList<>();
            JsonNode itemsNode = root.path("items");
            if (itemsNode.isArray()) {
                for (JsonNode it : itemsNode) {
                    items.add(ParsedSaleItem.builder()
                            .name(it.path("name").asText("Item"))
                            .quantity(new BigDecimal(it.path("quantity").asText("1")))
                            .unit(it.path("unit").asText("kg"))
                            .estimatedPrice(new BigDecimal(it.path("estimatedPrice").asText("0")))
                            .build());
                }
            }

            return NaturalSaleParseResponse.builder()
                    .customerName(customerName)
                    .items(items)
                    .totalAmount(totalAmount)
                    .amountPaid(amountPaid)
                    .amountCredit(amountCredit)
                    .paymentMode(paymentMode)
                    .confidenceScore(0.98)
                    .rawText(text)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse via Gemini, falling back to mock: {}", e.getMessage());
            return fallbackService.parseNaturalSale(text);
        }
    }

    @Override
    public String askAssistant(String prompt, String systemInstruction) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return fallbackService.askAssistant(prompt, systemInstruction);
        }

        try {
            String fullPrompt = systemInstruction != null ? systemInstruction + "\n\nUser: " + prompt : prompt;
            return callGemini(fullPrompt);
        } catch (Exception e) {
            log.error("Gemini assistant query failed: {}", e.getMessage());
            return fallbackService.askAssistant(prompt, systemInstruction);
        }
    }

    @Override
    public String generateGroundedResponse(String question, String intent, String groundedDataJson, String language) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return null; // Fallback to deterministic grounded response
        }

        String targetLang = (language != null && !language.trim().isEmpty()) ? language : "the language used in the question";
        String prompt = "You are DukaanAI, an authoritative, polite, and helpful digital assistant for an Indian retail Kirana store shopkeeper.\n"
                + "The merchant asked: \"" + question.replace("\"", "\\\"") + "\"\n"
                + "Detected Intent: " + intent + "\n"
                + "Target Language: " + targetLang + "\n\n"
                + "AUTHORITATIVE DATABASE RECORDS (STRICT GROUND TRUTH):\n"
                + groundedDataJson + "\n\n"
                + "CRITICAL RULES:\n"
                + "1. Base your answer STRICTLY on the database records above. NEVER hallucinate or invent numbers, products, customers, or amounts.\n"
                + "2. If the records indicate that a product is not found, or that there are zero sales, or zero debtors, explicitly state that fact.\n"
                + "3. Format amounts in Rupees (₹).\n"
                + "4. Respond naturally, clearly, and concisely in " + targetLang + ".\n"
                + "5. Do NOT output code fences or JSON. Reply directly with conversational text.";

        try {
            return callGemini(prompt);
        } catch (Exception e) {
            log.error("Gemini grounded response failed: {}", e.getMessage());
            return null;
        }
    }

    private String callGemini(String promptText) throws Exception {
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

        String requestBody = objectMapper.writeValueAsString(new Object() {
            public final Object[] contents = new Object[]{
                    new Object() {
                        public final Object[] parts = new Object[]{
                                new Object() {
                                    public final String text = promptText;
                                }
                        };
                    }
            };
        });

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini API error (" + response.statusCode() + "): " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }

    private String cleanJson(String raw) {
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        }
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
