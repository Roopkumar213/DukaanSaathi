package com.dukaanai.backend.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentVerificationDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentClaim {
        private String shopId;
        private String customerId;
        private String customerName;
        private String saleId;
        private BigDecimal billAmount;
        private BigDecimal claimedAmount;
        private String paymentMode; // CASH, UPI, KHATA
        private String referenceId; // e.g. UPI UTR number or cash receipt note
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentVerificationResult {
        private String status; // VERIFIED, UNVERIFIED, CLAIMED_PENDING_MERCHANT_CHECK, MISMATCH, DUPLICATE
        private String provider; // UPI_PROVIDER, MANUAL, UNAVAILABLE
        private String providerTransactionId;
        private BigDecimal verifiedAmount;
        private BigDecimal differenceAmount;
        private String notes;
        private boolean allowsFinalization;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpiWebhookPayload {
        private String providerTransactionId;
        private String shopId;
        private String customerName;
        private BigDecimal amount;
        private String currency; // INR
        private String status;   // SUCCESS, FAILED
        private String payerVpa; // e.g. customer@okhdfcbank
        private LocalDateTime timestamp;
        private String signature; // HMAC signature
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WebhookResponse {
        private boolean success;
        private String status;
        private String message;
        private String paymentId;
    }
}
