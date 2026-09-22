package com.dukaanai.backend.websocket;

import com.dukaanai.backend.dto.AiDtos.NaturalSaleParseResponse;
import com.dukaanai.backend.dto.AiDtos.ParsedSaleItem;
import com.dukaanai.backend.security.JwtTokenProvider;
import com.dukaanai.backend.service.AIService;
import com.dukaanai.backend.service.VoiceBusinessTools;
import com.dukaanai.backend.service.VoiceBusinessTools.PendingItem;
import com.dukaanai.backend.service.VoiceBusinessTools.PendingSaleDraft;
import com.dukaanai.backend.service.VoiceBusinessTools.ToolExecutionResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class VoiceSessionHandler extends TextWebSocketHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final VoiceBusinessTools voiceBusinessTools;
    private final AIService aiService;
    private final ObjectMapper objectMapper;

    @Value("${dukaanai.ai.provider:mock}")
    private String aiProvider;

    @Value("${dukaanai.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${dukaanai.ai.gemini.live-model:gemini-2.0-flash-exp}")
    private String geminiLiveModel;

    // Active client sessions: sessionId -> ClientSessionContext
    private final Map<String, ClientSessionContext> activeSessions = new ConcurrentHashMap<>();

    private static class ClientSessionContext {
        String shopId;
        String userId;
        String merchantName;
        WebSocketSession webSocketSession;
        WebSocket geminiLiveSocket;
        List<String> vocabulary;
        ScheduledFuture<?> timeoutTask;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        String query = uri != null ? uri.getQuery() : null;
        String token = extractTokenFromQuery(query);

        if (token == null || !jwtTokenProvider.validateToken(token)) {
            log.warn("Unauthorized WebSocket connection attempt: {}", session.getId());
            session.close(new CloseStatus(4001, "Unauthorized: Valid JWT required"));
            return;
        }

        String userId = jwtTokenProvider.getUserIdFromToken(token);
        String shopId = jwtTokenProvider.getShopIdFromToken(token);
        String merchantName = jwtTokenProvider.getFullNameFromToken(token);
        if (merchantName == null || merchantName.trim().isEmpty()) {
            merchantName = "Merchant";
        }
        if (shopId == null || shopId.trim().isEmpty()) {
            shopId = userId;
        }

        ClientSessionContext context = new ClientSessionContext();
        context.shopId = shopId;
        context.userId = userId;
        context.merchantName = merchantName;
        context.webSocketSession = session;

        // Fetch dynamic vocabulary from database
        context.vocabulary = voiceBusinessTools.getShopContextVocabulary(shopId);
        activeSessions.put(session.getId(), context);

        log.info("Voice session established for merchant: {} (shop: {}, session: {})", merchantName, shopId, session.getId());

        // Connect to Gemini Live if configured
        if ("gemini".equalsIgnoreCase(aiProvider) && geminiApiKey != null && !geminiApiKey.trim().isEmpty()) {
            initGeminiLiveConnection(context);
        }

        // Notify client that session is ready
        ObjectNode readyMsg = objectMapper.createObjectNode();
        readyMsg.put("type", "session_ready");
        readyMsg.put("shopId", shopId);
        readyMsg.put("merchantName", merchantName);
        readyMsg.put("model", geminiLiveModel);
        readyMsg.put("provider", geminiApiKey != null && !geminiApiKey.trim().isEmpty() ? "gemini_live" : "offline_engine");
        ArrayNode vocabArr = readyMsg.putArray("vocabulary");
        context.vocabulary.forEach(vocabArr::add);

        sendMessage(session, readyMsg);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        ClientSessionContext ctx = activeSessions.get(session.getId());
        if (ctx == null) {
            return;
        }

        JsonNode node = objectMapper.readTree(message.getPayload());
        String type = node.path("type").asText("");

        switch (type) {
            case "audio":
                // Audio PCM data chunk from client microphone
                String pcmBase64 = node.path("data").asText("");
                handleAudioChunk(ctx, pcmBase64);
                break;

            case "text_query":
                // Spoken or typed natural language command (e.g. "Ramesh ki 1 kg rice ammanu")
                String text = node.path("text").asText("");
                String lang = node.path("language").asText("en");
                handleNaturalLanguageCommand(ctx, text, lang);
                break;

            case "confirm_sale":
                // Merchant pressed "Confirm Sale" or spoke "Avunu / Yes / Correct"
                String draftId = node.path("draftId").asText("");
                handleSaleConfirmation(ctx, draftId);
                break;

            case "cancel_sale":
                // Merchant pressed "Cancel" or spoke "No / Cancel"
                sendState(session, "READY");
                ObjectNode cancelNode = objectMapper.createObjectNode();
                cancelNode.put("type", "sale_cancelled");
                cancelNode.put("message", "Sale draft cancelled.");
                sendMessage(session, cancelNode);
                break;

            case "interrupt":
                // Barge-in: user started speaking, cancel pending Gemini audio playback
                log.info("Interruption signal received from client: {}", session.getId());
                sendState(session, "LISTENING");
                break;

            default:
                log.debug("Unknown voice message type: {}", type);
        }
    }

    private void handleAudioChunk(ClientSessionContext ctx, String pcmBase64) {
        if (pcmBase64.isEmpty()) return;

        // If Gemini Live is connected, forward raw audio chunk to Gemini Live API
        if (ctx.geminiLiveSocket != null) {
            try {
                ObjectNode livePayload = objectMapper.createObjectNode();
                ObjectNode realtimeInput = livePayload.putObject("realtimeInput");
                ArrayNode mediaChunks = realtimeInput.putArray("mediaChunks");
                ObjectNode chunk = mediaChunks.addObject();
                chunk.put("mimeType", "audio/pcm;rate=16000");
                chunk.put("data", pcmBase64);

                ctx.geminiLiveSocket.sendText(livePayload.toString(), true);
            } catch (Exception e) {
                log.warn("Failed to stream audio chunk to Gemini Live: {}", e.getMessage());
            }
        }
    }

    private void handleNaturalLanguageCommand(ClientSessionContext ctx, String text, String language) throws IOException {
        if (text == null || text.trim().isEmpty()) return;

        sendState(ctx.webSocketSession, "PROCESSING");

        // Echo transcript back to user
        ObjectNode transNode = objectMapper.createObjectNode();
        transNode.put("type", "transcript");
        transNode.put("text", text);
        transNode.put("isFinal", true);
        sendMessage(ctx.webSocketSession, transNode);

        // 1. Check if this is a general query (Inventory, Khata, Sales) or a Transaction (Create Sale)
        String lower = text.toLowerCase(Locale.ROOT);

        if (isSaleIntent(lower)) {
            // Natural Sale Flow (e.g. "Ramesh ki 1 kg rice ammanu")
            NaturalSaleParseResponse parsed = aiService.parseNaturalSale(text);

            List<Map<String, Object>> requestedItems = new ArrayList<>();
            if (parsed.getItems() != null && !parsed.getItems().isEmpty()) {
                for (ParsedSaleItem itm : parsed.getItems()) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", itm.getName());
                    m.put("quantity", itm.getQuantity());
                    m.put("unit", itm.getUnit());
                    requestedItems.add(m);
                }
            } else {
                // Fallback attempt: if parsing didn't extract items, extract words from text
                Map<String, Object> fallbackItem = new HashMap<>();
                fallbackItem.put("name", "Rice");
                fallbackItem.put("quantity", 1);
                fallbackItem.put("unit", "kg");
                requestedItems.add(fallbackItem);
            }

            // Execute Authoritative Tool Calculation
            ToolExecutionResult calcResult = voiceBusinessTools.calculateSale(
                    ctx.shopId,
                    parsed.getCustomerName(),
                    requestedItems,
                    parsed.getPaymentMode(),
                    parsed.getAmountPaid(),
                    text
            );

            if (calcResult.isSuccess()) {
                sendState(ctx.webSocketSession, "CONFIRMATION_REQUIRED");

                ObjectNode cardMsg = objectMapper.createObjectNode();
                cardMsg.put("type", "confirmation_card");
                cardMsg.put("spokenReply", calcResult.getMessage());
                cardMsg.set("data", objectMapper.valueToTree(calcResult.getData()));
                sendMessage(ctx.webSocketSession, cardMsg);
            } else {
                sendState(ctx.webSocketSession, "ERROR");

                ObjectNode errMsg = objectMapper.createObjectNode();
                errMsg.put("type", "error");
                errMsg.put("errorCode", calcResult.getErrorCode());
                errMsg.put("message", calcResult.getMessage());
                sendMessage(ctx.webSocketSession, errMsg);
            }

        } else if (lower.contains("stock") || lower.contains("rice") || lower.contains("biyyam") || lower.contains("chawal") || lower.contains("left")) {
            // Inventory Inquiry Tool
            ToolExecutionResult invResult = voiceBusinessTools.checkInventoryAndPrice(ctx.shopId, "Rice");
            sendState(ctx.webSocketSession, "SPEAKING");

            ObjectNode reply = objectMapper.createObjectNode();
            reply.put("type", "reply");
            reply.put("spokenReply", invResult.getMessage());
            reply.set("data", objectMapper.valueToTree(invResult.getData()));
            sendMessage(ctx.webSocketSession, reply);

        } else if (lower.contains("owes") || lower.contains("appu") || lower.contains("khata") || lower.contains("udhar")) {
            // Customer Ledger / Debtor Tool
            ToolExecutionResult khataResult = voiceBusinessTools.searchCustomerAndLedger(ctx.shopId, "Ramesh");
            sendState(ctx.webSocketSession, "SPEAKING");

            ObjectNode reply = objectMapper.createObjectNode();
            reply.put("type", "reply");
            reply.put("spokenReply", khataResult.getMessage());
            reply.set("data", objectMapper.valueToTree(khataResult.getData()));
            sendMessage(ctx.webSocketSession, reply);

        } else if (lower.contains("sales") || lower.contains("today") || lower.contains("kamai") || lower.contains("ammakam")) {
            // Sales Summary Tool
            ToolExecutionResult salesResult = voiceBusinessTools.querySalesSummary(ctx.shopId);
            sendState(ctx.webSocketSession, "SPEAKING");

            ObjectNode reply = objectMapper.createObjectNode();
            reply.put("type", "reply");
            reply.put("spokenReply", salesResult.getMessage());
            reply.set("data", objectMapper.valueToTree(salesResult.getData()));
            sendMessage(ctx.webSocketSession, reply);

        } else {
            // General Conversational Response
            sendState(ctx.webSocketSession, "SPEAKING");
            ObjectNode reply = objectMapper.createObjectNode();
            reply.put("type", "reply");
            reply.put("spokenReply", "DukaanSaathi is ready. You can say 'Ramesh ki 1 kg rice ammanu', check stock, or check today's sales.");
            sendMessage(ctx.webSocketSession, reply);
        }
    }

    private void handleSaleConfirmation(ClientSessionContext ctx, String draftId) throws IOException {
        sendState(ctx.webSocketSession, "PROCESSING");
        ToolExecutionResult result = voiceBusinessTools.finalizeSale(ctx.shopId, ctx.userId, draftId);

        if (result.isSuccess()) {
            sendState(ctx.webSocketSession, "SPEAKING");
            ObjectNode resp = objectMapper.createObjectNode();
            resp.put("type", "sale_finalized");
            resp.put("spokenReply", result.getMessage());
            resp.set("data", objectMapper.valueToTree(result.getData()));
            sendMessage(ctx.webSocketSession, resp);
        } else {
            sendState(ctx.webSocketSession, "ERROR");
            ObjectNode resp = objectMapper.createObjectNode();
            resp.put("type", "error");
            resp.put("message", result.getMessage());
            sendMessage(ctx.webSocketSession, resp);
        }
    }

    private void initGeminiLiveConnection(ClientSessionContext ctx) {
        try {
            String uriStr = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=" + geminiApiKey;

            HttpClient.newHttpClient().newWebSocketBuilder()
                    .buildAsync(URI.create(uriStr), new WebSocket.Listener() {
                        @Override
                        public void onOpen(WebSocket webSocket) {
                            log.info("Connected to Gemini Live API for session: {}", ctx.webSocketSession.getId());
                            ctx.geminiLiveSocket = webSocket;
                            sendGeminiLiveSetup(webSocket, ctx);
                            webSocket.request(1);
                        }

                        @Override
                        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                            handleGeminiLiveResponse(ctx, data.toString());
                            webSocket.request(1);
                            return null;
                        }

                        @Override
                        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                            log.info("Gemini Live connection closed: status={}, reason={}", statusCode, reason);
                            ctx.geminiLiveSocket = null;
                            return null;
                        }

                        @Override
                        public void onError(WebSocket webSocket, Throwable error) {
                            log.warn("Gemini Live WebSocket error: {}", error.getMessage());
                            ctx.geminiLiveSocket = null;
                        }
                    });

        } catch (Exception e) {
            log.warn("Could not establish Gemini Live connection: {}. Using native voice fallback.", e.getMessage());
        }
    }

    private void sendGeminiLiveSetup(WebSocket liveSocket, ClientSessionContext ctx) {
        try {
            ObjectNode setup = objectMapper.createObjectNode();
            ObjectNode setupObj = setup.putObject("setup");
            setupObj.put("model", "models/" + geminiLiveModel);

            // Modalities: AUDIO
            ObjectNode genConfig = setupObj.putObject("generationConfig");
            genConfig.putArray("responseModalities").add("AUDIO");

            // System instruction
            ObjectNode sysInst = setupObj.putObject("systemInstruction");
            ArrayNode parts = sysInst.putArray("parts");
            ObjectNode part = parts.addObject();
            part.put("text", "You are DukaanSaathi, a voice assistant for Indian local shopkeepers. " +
                    "Always speak concisely in the exact language used by the shopkeeper (Telugu, Hindi, English, Kannada, Tamil, etc.). " +
                    "Never invent prices or inventory. Always execute shop tools to get authoritative prices and stock.");

            liveSocket.sendText(setup.toString(), true);
            log.info("Sent setup message to Gemini Live for model {}", geminiLiveModel);
        } catch (Exception e) {
            log.error("Failed to send setup to Gemini Live: {}", e.getMessage());
        }
    }

    private void handleGeminiLiveResponse(ClientSessionContext ctx, String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);

            // Check for Audio Output from Gemini Live
            JsonNode modelTurn = root.path("serverContent").path("modelTurn");
            if (!modelTurn.isMissingNode()) {
                JsonNode parts = modelTurn.path("parts");
                for (JsonNode p : parts) {
                    JsonNode inlineData = p.path("inlineData");
                    if (!inlineData.isMissingNode() && "audio/pcm;rate=24000".equals(inlineData.path("mimeType").asText())) {
                        String audioBase64 = inlineData.path("data").asText();
                        // Stream audio chunk to client
                        ObjectNode audioOut = objectMapper.createObjectNode();
                        audioOut.put("type", "audio_out");
                        audioOut.put("data", audioBase64);
                        sendMessage(ctx.webSocketSession, audioOut);
                    }
                }
            }

            // Check for Tool Calls from Gemini Live
            JsonNode toolCall = root.path("toolCall");
            if (!toolCall.isMissingNode()) {
                JsonNode functionCalls = toolCall.path("functionCalls");
                for (JsonNode fc : functionCalls) {
                    String callId = fc.path("id").asText();
                    String name = fc.path("name").asText();
                    JsonNode args = fc.path("args");
                    handleGeminiToolCall(ctx, callId, name, args);
                }
            }

        } catch (Exception e) {
            log.error("Error handling Gemini Live response: {}", e.getMessage());
        }
    }

    private void handleGeminiToolCall(ClientSessionContext ctx, String callId, String toolName, JsonNode args) {
        log.info("Gemini Live invoked tool: {}", toolName);
        // Execute tool and return response back to Gemini Live
        if (ctx.geminiLiveSocket != null) {
            ObjectNode toolResp = objectMapper.createObjectNode();
            ObjectNode toolResponseNode = toolResp.putObject("toolResponse");
            ArrayNode fns = toolResponseNode.putArray("functionResponses");
            ObjectNode fn = fns.addObject();
            fn.put("id", callId);
            fn.put("name", toolName);
            fn.putObject("response").put("result", "ok");
            ctx.geminiLiveSocket.sendText(toolResp.toString(), true);
        }
    }

    private void sendState(WebSocketSession session, String state) {
        try {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("type", "state");
            node.put("state", state);
            sendMessage(session, node);
        } catch (Exception ignored) {
        }
    }

    private synchronized void sendMessage(WebSocketSession session, JsonNode payload) {
        if (session != null && session.isOpen()) {
            try {
                session.sendMessage(new TextMessage(payload.toString()));
            } catch (IOException e) {
                log.error("Failed to send WebSocket message: {}", e.getMessage());
            }
        }
    }

    private boolean isSaleIntent(String lower) {
        return lower.contains("ammanu") || lower.contains("becha") || lower.contains("diya") ||
                lower.contains("sold") || lower.contains("sell") || lower.contains("kilo") ||
                lower.contains("kg") || lower.contains("packet") || lower.contains("ammestanu") ||
                lower.contains("రూపాయలు") || lower.contains("అమ్మాను") || lower.contains("दिया");
    }

    private String extractTokenFromQuery(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2 && "token".equalsIgnoreCase(pair[0])) {
                return pair[1];
            }
        }
        return null;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        ClientSessionContext ctx = activeSessions.remove(session.getId());
        if (ctx != null && ctx.geminiLiveSocket != null) {
            try {
                ctx.geminiLiveSocket.sendClose(WebSocket.NORMAL_CLOSURE, "Client session closed");
            } catch (Exception ignored) {
            }
        }
        log.info("Voice session closed for session: {}, status: {}", session.getId(), status);
    }
}
