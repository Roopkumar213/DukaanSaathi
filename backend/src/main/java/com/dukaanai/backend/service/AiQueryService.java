package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.AiDtos.AiQueryResponse;
import com.dukaanai.backend.dto.AiDtos.NaturalSaleParseResponse;
import com.dukaanai.backend.dto.CustomerDtos.CustomerDto;
import com.dukaanai.backend.dto.CustomerDtos.PaymentDto;
import com.dukaanai.backend.dto.ProductDtos.ProductDto;
import com.dukaanai.backend.dto.SaleDtos.SaleResponse;
import com.dukaanai.backend.dto.SaleDtos.SaleSummaryDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiQueryService {

    private final InventoryService inventoryService;
    private final CustomerKhataService customerKhataService;
    private final SaleService saleService;
    private final AIService aiService;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    public AiQueryResponse executeQuery(String shopId, String question) {
        return executeQuery(shopId, question, "en");
    }

    public AiQueryResponse executeQuery(String shopId, String question, String language) {
        String q = question.trim().toLowerCase();

        // ─────────────────────────────────────────────────────────────────────────────
        // 1. ACTION INTENT: CREATE SALE DICTATION
        // E.g.: "Ramesh ki 2 kilo rice icha 340 rupees", "2 kg sugar given to Suresh 80 rs"
        // ─────────────────────────────────────────────────────────────────────────────
        if (isSaleDictationIntent(q)) {
            try {
                NaturalSaleParseResponse parsed = aiService.parseNaturalSale(question);
                if (parsed != null && parsed.getItems() != null && !parsed.getItems().isEmpty()) {
                    String itemsSummary = parsed.getItems().stream()
                            .map(i -> i.getQuantity() + " " + i.getUnit() + " " + i.getName())
                            .collect(Collectors.joining(", "));

                    String paymentNote = parsed.getAmountCredit().compareTo(BigDecimal.ZERO) > 0
                            ? "Paid ₹" + parsed.getAmountPaid() + ", Due ₹" + parsed.getAmountCredit()
                            : "Full payment received (₹" + parsed.getAmountPaid() + ")";

                    String reply = "I understood this sale for " + parsed.getCustomerName() + ": "
                            + itemsSummary + " for a total of ₹" + parsed.getTotalAmount()
                            + " (" + paymentNote + "). Please review and confirm below to record to your ledger.";

                    return AiQueryResponse.builder()
                            .queryType("CREATE_SALE")
                            .reply(reply)
                            .data(parsed)
                            .actionLabel("Confirm in Sales")
                            .actionPage("sales")
                            .build();
                }
            } catch (Exception e) {
                log.warn("Failed to parse sale dictation: {}", e.getMessage());
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 2. LOW STOCK INQUIRY
        // E.g.: "Which products are low in stock?", "What is out of stock?", "khatam ho raha hai"
        // ─────────────────────────────────────────────────────────────────────────────
        if (isLowStockIntent(q)) {
            List<ProductDto> lowStock = inventoryService.getLowStock(shopId);
            List<ProductDto> allProducts = inventoryService.getProducts(shopId);

            String reply;
            if (allProducts.isEmpty()) {
                reply = "You have no products cataloged in your inventory yet.";
            } else if (lowStock.isEmpty()) {
                reply = "All " + allProducts.size() + " product(s) in your catalog are currently above their minimum stock thresholds. No items are low in stock.";
            } else {
                String itemsList = lowStock.stream()
                        .map(p -> p.getName() + " (" + p.getQuantity() + " " + p.getUnit() + " left, min alert: " + p.getMinStock() + ")")
                        .collect(Collectors.joining(", "));
                reply = "You have " + lowStock.size() + " product(s) running low in stock: " + itemsList + ".";
            }

            String groundedReply = tryGenerateGroundedResponse(question, "LOW_STOCK_QUERY", lowStock, reply, language);
            return AiQueryResponse.builder()
                    .queryType("LOW_STOCK_LIST")
                    .reply(groundedReply)
                    .data(lowStock)
                    .actionLabel("Open Inventory")
                    .actionPage("inventory")
                    .build();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 3. INVENTORY & STOCK INQUIRY
        // E.g.: "How much rice is left?", "Sugar stock", "బియ్యం ఎంత ఉంది?", "चामल कितना है"
        // ─────────────────────────────────────────────────────────────────────────────
        String targetProductKey = extractProductKeyword(q);
        if (targetProductKey != null || isGeneralInventoryIntent(q)) {
            List<ProductDto> products = inventoryService.getProducts(shopId);

            if (targetProductKey != null) {
                String standardName = normalizeProductName(targetProductKey);

                ProductDto matched = products.stream()
                        .filter(p -> p.getName().equalsIgnoreCase(standardName) ||
                                p.getName().toLowerCase().contains(targetProductKey) ||
                                p.getName().toLowerCase().contains(standardName.toLowerCase()))
                        .findFirst()
                        .orElse(null);

                String reply;
                if (matched != null) {
                    if (matched.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                        reply = matched.getName() + " is currently out of stock (0 " + matched.getUnit() + " remaining).";
                    } else {
                        reply = "You currently have " + matched.getQuantity() + " " + matched.getUnit() + " of "
                                + matched.getName() + " in stock, priced at ₹" + matched.getPrice() + "/" + matched.getUnit() + ".";
                    }
                } else {
                    // ZERO-DATA RULE: Never hallucinate quantity for a missing product
                    reply = standardName + " is not currently available in your inventory.";
                }

                String groundedReply = tryGenerateGroundedResponse(question, "INVENTORY_QUERY", matched, reply, language);
                return AiQueryResponse.builder()
                        .queryType("INVENTORY_CHECK")
                        .reply(groundedReply)
                        .data(matched)
                        .actionLabel("Open Inventory")
                        .actionPage("inventory")
                        .build();
            }

            // General inventory catalog inquiry
            String reply;
            if (products.isEmpty()) {
                reply = "You have no products cataloged in your inventory yet. Add your first product to start tracking stock.";
            } else {
                reply = "Your shop inventory currently has " + products.size() + " active product item(s).";
            }

            String groundedReply = tryGenerateGroundedResponse(question, "INVENTORY_QUERY", products, reply, language);
            return AiQueryResponse.builder()
                    .queryType("INVENTORY_LIST")
                    .reply(groundedReply)
                    .data(products)
                    .actionLabel("Open Inventory")
                    .actionPage("inventory")
                    .build();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 4. KHATA & DEBTOR INQUIRY (WHO OWES MONEY)
        // E.g.: "Who owes me money?", "How much does Ramesh owe me?", "udhar kiska hai"
        // ─────────────────────────────────────────────────────────────────────────────
        if (isKhataIntent(q)) {
            List<CustomerDto> allCustomers = customerKhataService.getCustomers(shopId, false);

            // Check if asking about a specific customer
            CustomerDto matchedCustomer = findCustomerInText(q, allCustomers);
            if (matchedCustomer != null) {
                String reply;
                if (matchedCustomer.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                    reply = matchedCustomer.getName() + " currently owes you ₹" + matchedCustomer.getBalance() + " on their Khata ledger.";
                } else {
                    reply = matchedCustomer.getName() + " has no outstanding balance. Their Khata account is completely clear.";
                }

                String groundedReply = tryGenerateGroundedResponse(question, "KHATA_QUERY", matchedCustomer, reply, language);
                return AiQueryResponse.builder()
                        .queryType("CUSTOMER_KHATA")
                        .reply(groundedReply)
                        .data(matchedCustomer)
                        .actionLabel("Open Khata")
                        .actionPage("khata")
                        .build();
            }

            // All debtors
            List<CustomerDto> debtors = customerKhataService.getCustomers(shopId, true);
            String reply;
            if (debtors.isEmpty()) {
                reply = "No customers currently have outstanding payments. All accounts are settled.";
            } else {
                BigDecimal totalDebt = debtors.stream()
                        .map(CustomerDto::getBalance)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                String debtorListStr = debtors.stream()
                        .limit(5)
                        .map(c -> c.getName() + " (₹" + c.getBalance() + ")")
                        .collect(Collectors.joining(", "));

                reply = debtors.size() + " customer(s) currently owe you a total of ₹" + totalDebt + ". Outstanding balances: " + debtorListStr + ".";
            }

            String groundedReply = tryGenerateGroundedResponse(question, "KHATA_QUERY", debtors, reply, language);
            return AiQueryResponse.builder()
                    .queryType("DEBTOR_LIST")
                    .reply(groundedReply)
                    .data(debtors)
                    .actionLabel("Open Khata")
                    .actionPage("khata")
                    .build();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 5. SALES & REVENUE INQUIRY
        // E.g.: "How much did I sell today?", "What were today's sales?", "kamai kitni hui"
        // ─────────────────────────────────────────────────────────────────────────────
        if (isSalesIntent(q)) {
            SaleSummaryDto summary = saleService.getSummary(shopId);

            String reply;
            if (summary.getTransactionCount() == 0) {
                reply = "You have no sales recorded today.";
            } else {
                reply = "Today you recorded " + summary.getTransactionCount() + " sale(s) totaling ₹"
                        + summary.getTotalSales() + " (₹" + summary.getReceivedSales() + " received, ₹"
                        + summary.getCreditSales() + " on credit).";
            }

            String groundedReply = tryGenerateGroundedResponse(question, "SALES_QUERY", summary, reply, language);
            return AiQueryResponse.builder()
                    .queryType("TODAY_SALES_SUMMARY")
                    .reply(groundedReply)
                    .data(summary)
                    .actionLabel("Open Sales")
                    .actionPage("sales")
                    .build();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 6. PAYMENTS INQUIRY
        // E.g.: "How much payment did I receive today?", "Did Ramesh pay anything?"
        // ─────────────────────────────────────────────────────────────────────────────
        if (isPaymentIntent(q)) {
            List<PaymentDto> payments = customerKhataService.getPayments(shopId);

            String reply;
            if (payments.isEmpty()) {
                reply = "No customer payments have been recorded yet.";
            } else {
                BigDecimal totalPayments = payments.stream()
                        .map(PaymentDto::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                reply = "You have recorded " + payments.size() + " payment(s) totaling ₹" + totalPayments + ".";
            }

            String groundedReply = tryGenerateGroundedResponse(question, "PAYMENT_QUERY", payments, reply, language);
            return AiQueryResponse.builder()
                    .queryType("PAYMENT_SUMMARY")
                    .reply(groundedReply)
                    .data(payments)
                    .actionLabel("Open Payments")
                    .actionPage("payments")
                    .build();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 7. SPECIFIC CUSTOMER PURCHASE INQUIRY
        // E.g.: "How much did Ramesh buy?", "What did Ramesh purchase?"
        // ─────────────────────────────────────────────────────────────────────────────
        List<CustomerDto> allCustomers = customerKhataService.getCustomers(shopId, false);
        CustomerDto customer = findCustomerInText(q, allCustomers);
        if (customer != null) {
            List<SaleResponse> custSales = saleService.getSales(shopId, null, customer.getName());
            BigDecimal totalPurchased = custSales.stream()
                    .map(SaleResponse::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            String reply = customer.getName() + " has made " + custSales.size() + " purchase(s) totaling ₹"
                    + totalPurchased + ". Current outstanding Khata balance is ₹" + customer.getBalance() + ".";

            String groundedReply = tryGenerateGroundedResponse(question, "CUSTOMER_QUERY", customer, reply, language);
            return AiQueryResponse.builder()
                    .queryType("CUSTOMER_PURCHASES")
                    .reply(groundedReply)
                    .data(customer)
                    .actionLabel("Open Khata")
                    .actionPage("khata")
                    .build();
        }

        // Check if user asked about customers in general
        if (q.contains("customer") || q.contains("grahak") || q.contains("vyapari") || q.contains("client")) {
            String reply;
            if (allCustomers.isEmpty()) {
                reply = "You have no customers registered in your shop records yet.";
            } else {
                reply = "You currently have " + allCustomers.size() + " registered customer(s) in your Dukaan ledger.";
            }

            String groundedReply = tryGenerateGroundedResponse(question, "CUSTOMER_QUERY", allCustomers, reply, language);
            return AiQueryResponse.builder()
                    .queryType("CUSTOMER_LIST")
                    .reply(groundedReply)
                    .data(allCustomers)
                    .actionLabel("Open Khata")
                    .actionPage("khata")
                    .build();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 8. UNKNOWN / OUT OF SCOPE QUERY
        // E.g. Weather, general trivia, politics, recipes
        // ─────────────────────────────────────────────────────────────────────────────
        if (isOutOfScopeQuery(q)) {
            return AiQueryResponse.builder()
                    .queryType("UNKNOWN")
                    .reply("I am your DukaanAI assistant. I can help you manage your shop's sales, inventory levels, customer Khata ledgers, and payments. Ask me about stock, sales today, or customer dues.")
                    .data(null)
                    .build();
        }

        // Fallback: General Shop Overview
        SaleSummaryDto summary = saleService.getSummary(shopId);
        List<ProductDto> products = inventoryService.getProducts(shopId);
        List<CustomerDto> debtors = customerKhataService.getCustomers(shopId, true);

        String reply = "DukaanAI Store Overview: Today you recorded " + summary.getTransactionCount()
                + " sale(s) (₹" + summary.getTotalSales() + "), with "
                + products.size() + " cataloged product(s) and "
                + debtors.size() + " customer(s) with outstanding dues. How can I assist you with your shop records?";

        return AiQueryResponse.builder()
                .queryType("GENERAL_SUMMARY")
                .reply(reply)
                .data(summary)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helper: AI Grounding with Gemini / Fallback
    // ─────────────────────────────────────────────────────────────────────────────
    private String tryGenerateGroundedResponse(String question, String intent, Object dbData, String fallbackText, String language) {
        try {
            String jsonTruth = objectMapper.writeValueAsString(dbData != null ? dbData : Map.of("recordFound", false));
            String aiResult = aiService.generateGroundedResponse(question, intent, jsonTruth, language);
            if (aiResult != null && !aiResult.trim().isEmpty()) {
                return aiResult.trim();
            }
        } catch (Exception e) {
            log.warn("Gemini grounding skipped: {}", e.getMessage());
        }
        return fallbackText;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Intent Classification Helpers (Multilingual: EN, HI, TE, TA, KN, etc.)
    // ─────────────────────────────────────────────────────────────────────────────
    private boolean isSaleDictationIntent(String q) {
        return (q.contains("icha") || q.contains("diya") || q.contains("de do") || q.contains("becha") ||
                q.contains("ammanu") || q.contains("vittren") || q.contains("maaratavagide") ||
                q.contains("दिया") || q.contains("बेचा") || q.contains("ఇచ్చా") || q.contains("అమ్మాను") ||
                q.contains("sold to") || q.contains("given to") ||
                ((q.contains("rupees") || q.contains("rs") || q.contains("₹") || q.contains("रुपये") || q.contains("రూపాయలు")) &&
                        (q.contains("kilo") || q.contains("kg") || q.contains("packet") || q.contains("liter") || q.contains("ltr") || q.contains("किलो") || q.contains("కిలో"))));
    }

    private boolean isLowStockIntent(String q) {
        if (q.contains("कमाई") || q.contains("kamai")) return false;
        return q.contains("low in stock") || q.contains("low stock") || q.contains("out of stock") ||
                q.contains("running out") || q.contains("khatam") || q.contains("kam hai") ||
                q.contains("aipoyindi") || q.contains("thakkuva") || q.contains("theerndhu") ||
                q.contains("mugiyithu") || q.contains("reorder") ||
                q.contains("खत्म") || q.contains("कम है") || q.contains("कम स्टॉक") ||
                q.contains("తక్కువ") || q.contains("అయిపోయింది") ||
                q.contains("குறைவு") || q.contains("காலி") || q.contains("ಕಡಿಮೆ");
    }

    private boolean isGeneralInventoryIntent(String q) {
        return q.contains("stock") || q.contains("inventory") || q.contains("left") ||
                q.contains("available") || q.contains("maal") || q.contains("baki") ||
                q.contains("saruku") || q.contains("irukku") || q.contains("idheya") ||
                q.contains("स्टॉक") || q.contains("सामान") || q.contains("बचा") ||
                q.contains("సరుకులు") || q.contains("ఉంది") || q.contains("இருப்பு") ||
                q.contains("உள்ளது") || q.contains("ಇದೆ") || q.contains("ಉಳಿದಿದೆ");
    }

    private boolean isKhataIntent(String q) {
        return q.contains("who owes") || q.contains("owes me") || q.contains("owe me") ||
                q.contains("udhar") || q.contains("khata") || q.contains("debt") ||
                q.contains("balance") || q.contains("outstanding") || q.contains("baki hai") ||
                q.contains("baaki") || q.contains("appu") || q.contains("kadan") ||
                q.contains("saala") || q.contains("उधार") || q.contains("खाता") ||
                q.contains("बकाया") || q.contains("అప్పు") || q.contains("బాకీ") ||
                q.contains("கடன்") || q.contains("பாக்கி") || q.contains("ಸಾಲ");
    }

    private boolean isSalesIntent(String q) {
        return q.contains("today") || q.contains("aaj") || q.contains("kamai") ||
                q.contains("bikri") || q.contains("sell today") || q.contains("sold today") ||
                q.contains("sales") || q.contains("revenue") || q.contains("ammakam") ||
                q.contains("vittren") || q.contains("maarata") || q.contains("income") ||
                q.contains("आज") || q.contains("कमाई") || q.contains("बिक्री") ||
                q.contains("ఈరోజు") || q.contains("అమ్మకం") || q.contains("இன்று") ||
                q.contains("விற்பனை") || q.contains("ಇಂದು") || q.contains("ಮಾರಾಟ");
    }

    private boolean isPaymentIntent(String q) {
        return q.contains("payment") || q.contains("payments") || q.contains("vasooli") ||
                q.contains("jamakharach") || q.contains("paid today") || q.contains("received today") ||
                q.contains("भुगतान") || q.contains("వసూలు");
    }

    private boolean isOutOfScopeQuery(String q) {
        return q.contains("weather") || q.contains("temperature") || q.contains("joke") ||
                q.contains("movie") || q.contains("cricket") || q.contains("football") ||
                q.contains("song") || q.contains("recipe") || q.contains("news") ||
                q.contains("capital of") || q.contains("who is the president") ||
                q.contains("मौसम") || q.contains("चुटकुला");
    }

    private String extractProductKeyword(String q) {
        // Multi-language dictionary mapping regional terms to canonical keys
        Map<String, String[]> productSynonyms = new HashMap<>();
        productSynonyms.put("rice", new String[]{"rice", "chawal", "biyyam", "arisi", "akki", "tandul", "चावल", "बिయ్యం", "அரிசி", "ಅಕ್ಕಿ"});
        productSynonyms.put("sugar", new String[]{"sugar", "cheeni", "panchadara", "sakkarai", "shakkare", "chini", "चीनी", "शक्कर", "పంచదార", "சர்க்கரை", "ಸಕ್ಕರೆ"});
        productSynonyms.put("oil", new String[]{"oil", "tel", "noone", "ennai", "yenne", "तेल", "నూనె", "எண்ணெய்", "ಎಣ್ಣೆ"});
        productSynonyms.put("dal", new String[]{"dal", "daal", "pappu", "paruppu", "bele", "दाल", "పప్పు", "பருப்பு", "ಬೇಳೆ"});
        productSynonyms.put("atta", new String[]{"atta", "wheat", "godhuma", "godhumai", "flour", "maida", "आटा", "गेंहू", "గోధుమ", "கோதுமை", "ಗೋಧಿ"});
        productSynonyms.put("milk", new String[]{"milk", "doodh", "paalu", "paal", "haalu", "दूध", "పాలు", "பால்", "ಹಾಲು"});
        productSynonyms.put("tea", new String[]{"tea", "chai", "chaaya", "chaa", "चाय", "టీ", "தேநீர்", "ಟೀ"});
        productSynonyms.put("surf", new String[]{"surf", "surf excel", "detergent", "soap", "sabun", "sabbu", "साइकिल", "साबुन", "సాబు"});
        productSynonyms.put("biscuit", new String[]{"biscuit", "biscuits", "cookie", "बिस्कुट", "బిస్కెట్"});
        productSynonyms.put("salt", new String[]{"salt", "namak", "uppu", "नमक", "ఉప్పు", "உப்பு", "ಉಪ್ಪು"});

        for (Map.Entry<String, String[]> entry : productSynonyms.entrySet()) {
            for (String synonym : entry.getValue()) {
                if (q.contains(synonym)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }

    private String normalizeProductName(String key) {
        switch (key) {
            case "rice": return "Rice";
            case "sugar": return "Sugar";
            case "oil": return "Oil";
            case "dal": return "Dal";
            case "atta": return "Atta";
            case "milk": return "Milk";
            case "tea": return "Tea";
            case "surf": return "Surf";
            case "biscuit": return "Biscuit";
            case "salt": return "Salt";
            default: return Character.toUpperCase(key.charAt(0)) + key.substring(1);
        }
    }

    private CustomerDto findCustomerInText(String q, List<CustomerDto> customers) {
        for (CustomerDto c : customers) {
            if (c.getName() != null && !c.getName().trim().isEmpty()) {
                if (q.contains(c.getName().toLowerCase().trim())) {
                    return c;
                }
            }
        }
        return null;
    }
}
