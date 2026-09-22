package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.CustomerDtos.CustomerDto;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentClaim;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentVerificationResult;
import com.dukaanai.backend.dto.ProductDtos.ProductDto;
import com.dukaanai.backend.dto.SaleDtos.CreateSaleRequest;
import com.dukaanai.backend.dto.SaleDtos.SaleItemRequest;
import com.dukaanai.backend.dto.SaleDtos.SaleResponse;
import com.dukaanai.backend.dto.SaleDtos.SaleSummaryDto;
import com.dukaanai.backend.entity.Customer;
import com.dukaanai.backend.entity.Product;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.entity.VoiceTransactionAuditLog;
import com.dukaanai.backend.repository.CustomerRepository;
import com.dukaanai.backend.repository.ProductRepository;
import com.dukaanai.backend.repository.ShopRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VoiceBusinessTools {

    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final ShopRepository shopRepository;
    private final SaleService saleService;
    private final InventoryService inventoryService;
    private final CustomerKhataService customerKhataService;
    private final PaymentVerificationService paymentVerificationService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    // Cache of pending sales awaiting merchant confirmation
    private final Map<String, PendingSaleDraft> pendingSales = new java.util.concurrent.ConcurrentHashMap<>();

    @Getter
    @Setter
    @Builder
    public static class PendingSaleDraft {
        private String draftId;
        private String shopId;
        private String customerId;
        private String customerName;
        private List<PendingItem> items;
        private BigDecimal totalAmount;
        private BigDecimal amountPaid;
        private BigDecimal amountCredit;
        private String paymentMode;
        private String verificationStatus;
        private String auditLogId;
        private long createdAtMillis;
    }

    @Getter
    @Setter
    @Builder
    public static class PendingItem {
        private String productId;
        private String productName;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
        private BigDecimal availableStock;
    }

    @Getter
    @Setter
    @Builder
    public static class ToolExecutionResult {
        private boolean success;
        private String toolName;
        private String message;
        private Object data;
        private String errorCode;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. DYNAMIC VOCABULARY GENERATION (Zero Hardcoding)
    // ─────────────────────────────────────────────────────────────────────────────
    public List<String> getShopContextVocabulary(String shopId) {
        Set<String> vocab = new LinkedHashSet<>();
        shopRepository.findById(shopId).ifPresent(s -> vocab.add(s.getName()));

        // Add real product names from merchant DB
        List<Product> products = productRepository.findByShopIdOrderByCreatedAtDesc(shopId);
        for (Product p : products) {
            vocab.add(p.getName());
        }

        // Add real customer names from merchant DB
        List<Customer> customers = customerRepository.findByShopIdOrderByNameAsc(shopId);
        for (Customer c : customers) {
            vocab.add(c.getName());
        }

        // Standard Kirana units & payment terms
        vocab.addAll(Arrays.asList("kg", "kilo", "gram", "packet", "litre", "bottle", "piece", "UPI", "Cash", "Khata", "Udhaar", "Biyyam", "Chawal", "Rice"));
        return new ArrayList<>(vocab);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. SEARCH PRODUCTS
    // ─────────────────────────────────────────────────────────────────────────────
    public ToolExecutionResult searchProducts(String shopId, String query) {
        if (query == null || query.trim().isEmpty()) {
            List<ProductDto> all = inventoryService.getProducts(shopId);
            return ToolExecutionResult.builder()
                    .success(true)
                    .toolName("search_products")
                    .data(all)
                    .message("Found " + all.size() + " product(s).")
                    .build();
        }

        List<ProductDto> matches = inventoryService.searchProducts(shopId, query.trim());
        if (matches.isEmpty()) {
            return ToolExecutionResult.builder()
                    .success(false)
                    .toolName("search_products")
                    .errorCode("PRODUCT_NOT_FOUND")
                    .message(query + " is not currently available in your inventory.")
                    .build();
        }

        return ToolExecutionResult.builder()
                .success(true)
                .toolName("search_products")
                .data(matches)
                .message("Found " + matches.size() + " product(s) matching '" + query + "'.")
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. GET PRODUCT PRICE & INVENTORY AUTHORITATIVELY
    // ─────────────────────────────────────────────────────────────────────────────
    public ToolExecutionResult checkInventoryAndPrice(String shopId, String productName) {
        List<ProductDto> matches = inventoryService.searchProducts(shopId, productName);
        if (matches.isEmpty()) {
            return ToolExecutionResult.builder()
                    .success(false)
                    .toolName("check_inventory")
                    .errorCode("PRODUCT_NOT_FOUND")
                    .message(productName + " is not found in your inventory.")
                    .build();
        }

        ProductDto p = matches.get(0);
        Map<String, Object> details = new HashMap<>();
        details.put("productId", p.getId());
        details.put("productName", p.getName());
        details.put("unitPrice", p.getPrice());
        details.put("stockQuantity", p.getQuantity());
        details.put("unit", p.getUnit());
        details.put("isLowStock", p.getQuantity().compareTo(p.getMinStock()) <= 0);

        return ToolExecutionResult.builder()
                .success(true)
                .toolName("check_inventory")
                .data(details)
                .message("You have " + p.getQuantity() + " " + p.getUnit() + " of " + p.getName() + " in stock, priced at ₹" + p.getPrice() + "/" + p.getUnit() + ".")
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. SEARCH CUSTOMER & GET LEDGER
    // ─────────────────────────────────────────────────────────────────────────────
    public ToolExecutionResult searchCustomerAndLedger(String shopId, String customerName) {
        List<CustomerDto> matches = customerKhataService.searchCustomers(shopId, customerName);
        if (matches.isEmpty()) {
            return ToolExecutionResult.builder()
                    .success(false)
                    .toolName("search_customer")
                    .errorCode("CUSTOMER_NOT_FOUND")
                    .message("No customer named '" + customerName + "' was found in your Khata records.")
                    .build();
        }

        CustomerDto c = matches.get(0);
        Map<String, Object> data = new HashMap<>();
        data.put("customerId", c.getId());
        data.put("customerName", c.getName());
        data.put("phone", c.getPhone());
        data.put("outstandingBalance", c.getBalance());

        String message = c.getBalance().compareTo(BigDecimal.ZERO) > 0
                ? c.getName() + " currently owes you ₹" + c.getBalance() + " on their Khata ledger."
                : c.getName() + " has no outstanding dues. Account is settled.";

        return ToolExecutionResult.builder()
                .success(true)
                .toolName("search_customer")
                .data(data)
                .message(message)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. CALCULATE SALE (Strict Authoritative Pricing & Inventory Validation)
    // ─────────────────────────────────────────────────────────────────────────────
    public ToolExecutionResult calculateSale(
            String shopId,
            String customerName,
            List<Map<String, Object>> requestedItems,
            String paymentMode,
            BigDecimal claimedAmount,
            String spokenTranscript) {

        if (requestedItems == null || requestedItems.isEmpty()) {
            return ToolExecutionResult.builder()
                    .success(false)
                    .toolName("calculate_sale")
                    .errorCode("EMPTY_ITEMS")
                    .message("No items were specified for the sale.")
                    .build();
        }

        List<PendingItem> pendingItems = new ArrayList<>();
        BigDecimal authoritativeTotal = BigDecimal.ZERO;

        for (Map<String, Object> reqItem : requestedItems) {
            String name = (String) reqItem.get("name");
            Object qtyObj = reqItem.get("quantity");
            BigDecimal qty = qtyObj instanceof Number
                    ? BigDecimal.valueOf(((Number) qtyObj).doubleValue())
                    : (qtyObj != null ? new BigDecimal(qtyObj.toString()) : BigDecimal.ONE);

            if (qty.compareTo(BigDecimal.ZERO) <= 0) {
                return ToolExecutionResult.builder()
                        .success(false)
                        .toolName("calculate_sale")
                        .errorCode("INVALID_QUANTITY")
                        .message("Quantity for " + name + " must be greater than zero.")
                        .build();
            }

            // Find authoritative product in DB
            List<ProductDto> matches = inventoryService.searchProducts(shopId, name);
            if (matches.isEmpty()) {
                return ToolExecutionResult.builder()
                        .success(false)
                        .toolName("calculate_sale")
                        .errorCode("PRODUCT_NOT_FOUND")
                        .message("Cannot create sale: '" + name + "' is not available in your store inventory.")
                        .build();
            }

            ProductDto dbProduct = matches.get(0);

            // Strict Inventory Check: No negative stock
            if (dbProduct.getQuantity().compareTo(qty) < 0) {
                return ToolExecutionResult.builder()
                        .success(false)
                        .toolName("calculate_sale")
                        .errorCode("INSUFFICIENT_STOCK")
                        .message("Insufficient stock for " + dbProduct.getName() + ". Available: " +
                                dbProduct.getQuantity() + " " + dbProduct.getUnit() + ", requested: " + qty + " " + dbProduct.getUnit() + ".")
                        .build();
            }

            BigDecimal unitPrice = dbProduct.getPrice();
            BigDecimal subtotal = unitPrice.multiply(qty);
            authoritativeTotal = authoritativeTotal.add(subtotal);

            pendingItems.add(PendingItem.builder()
                    .productId(dbProduct.getId())
                    .productName(dbProduct.getName())
                    .quantity(qty)
                    .unit(dbProduct.getUnit())
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .availableStock(dbProduct.getQuantity())
                    .build());
        }

        // Determine Payment Split
        String mode = paymentMode != null ? paymentMode.toUpperCase() : "CASH";
        BigDecimal paid = claimedAmount != null ? claimedAmount : authoritativeTotal;
        BigDecimal credit = BigDecimal.ZERO;

        if ("KHATA".equals(mode) || "CREDIT".equals(mode)) {
            paid = BigDecimal.ZERO;
            credit = authoritativeTotal;
        } else if (paid.compareTo(authoritativeTotal) < 0) {
            credit = authoritativeTotal.subtract(paid);
        }

        // Payment Verification Check
        PaymentVerificationResult verResult = paymentVerificationService.verifyClaim(
                PaymentClaim.builder()
                        .shopId(shopId)
                        .customerName(customerName)
                        .billAmount(authoritativeTotal)
                        .claimedAmount(paid)
                        .paymentMode(mode)
                        .build()
        );

        // Resolve Customer ID if exists
        String customerId = null;
        if (customerName != null && !customerName.trim().isEmpty()) {
            List<CustomerDto> custMatches = customerKhataService.searchCustomers(shopId, customerName);
            if (!custMatches.isEmpty()) {
                customerId = custMatches.get(0).getId();
            }
        }

        String draftId = UUID.randomUUID().toString();

        // Audit log initial intent
        VoiceTransactionAuditLog auditEntry = auditLogService.logTransaction(
                shopId,
                null,
                "VOICE",
                spokenTranscript,
                "CREATE_SALE",
                "Items: " + pendingItems.size() + ", Total: ₹" + authoritativeTotal,
                "Calculated ₹" + authoritativeTotal + " (" + paid + " paid, " + credit + " credit)",
                null,
                null,
                "PENDING_CONFIRMATION"
        );

        PendingSaleDraft draft = PendingSaleDraft.builder()
                .draftId(draftId)
                .shopId(shopId)
                .customerId(customerId)
                .customerName(customerName != null ? customerName : "Walk-in Customer")
                .items(pendingItems)
                .totalAmount(authoritativeTotal)
                .amountPaid(paid)
                .amountCredit(credit)
                .paymentMode(mode)
                .verificationStatus(verResult.getStatus())
                .auditLogId(auditEntry.getId())
                .createdAtMillis(System.currentTimeMillis())
                .build();

        pendingSales.put(draftId, draft);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("draftId", draftId);
        responseData.put("customerName", draft.getCustomerName());
        responseData.put("items", draft.getItems());
        responseData.put("totalAmount", draft.getTotalAmount());
        responseData.put("amountPaid", draft.getAmountPaid());
        responseData.put("amountCredit", draft.getAmountCredit());
        responseData.put("paymentMode", draft.getPaymentMode());
        responseData.put("verificationNotes", verResult.getNotes());
        responseData.put("verificationStatus", verResult.getStatus());

        String spokenSummary = draft.getCustomerName() + " ki " +
                pendingItems.stream().map(i -> i.getQuantity() + " " + i.getUnit() + " " + i.getProductName())
                        .collect(Collectors.joining(", ")) +
                ", Total bill is ₹" + draft.getTotalAmount() + ". Please confirm to record the sale.";

        return ToolExecutionResult.builder()
                .success(true)
                .toolName("calculate_sale")
                .data(responseData)
                .message(spokenSummary)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. FINALIZE SALE (Atomic Execution with Authoritative SaleService)
    // ─────────────────────────────────────────────────────────────────────────────
    @Transactional
    public ToolExecutionResult finalizeSale(String shopId, String userId, String draftId) {
        PendingSaleDraft draft = pendingSales.remove(draftId);
        if (draft == null) {
            return ToolExecutionResult.builder()
                    .success(false)
                    .toolName("finalize_sale")
                    .errorCode("DRAFT_NOT_FOUND")
                    .message("Pending sale expired or not found. Please speak the sale items again.")
                    .build();
        }

        try {
            // Build authoritative CreateSaleRequest
            List<SaleItemRequest> itemRequests = draft.getItems().stream()
                    .map(item -> SaleItemRequest.builder()
                            .productId(item.getProductId())
                            .productName(item.getProductName())
                            .quantity(item.getQuantity())
                            .unit(item.getUnit())
                            .unitPrice(item.getUnitPrice())
                            .build())
                    .collect(Collectors.toList());

            CreateSaleRequest saleRequest = CreateSaleRequest.builder()
                    .customerName(draft.getCustomerName())
                    .items(itemRequests)
                    .receivedAmount(draft.getAmountPaid())
                    .paymentMode(draft.getPaymentMode())
                    .rawInput("Recorded via DukaanSaathi Voice Assistant")
                    .build();

            // Execute atomic sale inside existing authoritative SaleService
            SaleResponse savedSale = saleService.createSale(shopId, saleRequest);

            // Update audit log
            auditLogService.updateConfirmation(draft.getAuditLogId(), "CONFIRMED", savedSale.getId());

            log.info("Successfully executed atomic voice sale: id={}, total={}", savedSale.getId(), savedSale.getTotalAmount());

            Map<String, Object> data = new HashMap<>();
            data.put("saleId", savedSale.getId());
            data.put("totalAmount", savedSale.getTotalAmount());
            data.put("customerName", savedSale.getCustomerName());
            data.put("amountPaid", savedSale.getReceivedAmount());
            data.put("amountCredit", savedSale.getOutstandingAmount());

            return ToolExecutionResult.builder()
                    .success(true)
                    .toolName("finalize_sale")
                    .data(data)
                    .message("Sale recorded successfully for ₹" + savedSale.getTotalAmount() + ".")
                    .build();

        } catch (Exception e) {
            log.error("Failed to finalize sale: {}", e.getMessage(), e);
            auditLogService.updateConfirmation(draft.getAuditLogId(), "FAILED", null);
            return ToolExecutionResult.builder()
                    .success(false)
                    .toolName("finalize_sale")
                    .errorCode("TRANSACTION_FAILED")
                    .message("Failed to finalize sale: " + e.getMessage())
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. QUERY SALES & METRICS
    // ─────────────────────────────────────────────────────────────────────────────
    public ToolExecutionResult querySalesSummary(String shopId) {
        SaleSummaryDto summary = saleService.getSummary(shopId);
        if (summary.getTransactionCount() == 0) {
            return ToolExecutionResult.builder()
                    .success(true)
                    .toolName("query_sales")
                    .data(summary)
                    .message("You have no sales recorded today.")
                    .build();
        }

        String msg = "Today you recorded " + summary.getTransactionCount() + " sale(s) totaling ₹" +
                summary.getTotalSales() + " (₹" + summary.getReceivedSales() + " received, ₹" +
                summary.getCreditSales() + " on credit).";

        return ToolExecutionResult.builder()
                .success(true)
                .toolName("query_sales")
                .data(summary)
                .message(msg)
                .build();
    }
}
