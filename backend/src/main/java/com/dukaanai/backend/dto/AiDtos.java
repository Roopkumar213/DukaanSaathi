package com.dukaanai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

public class AiDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NaturalSaleParseRequest {
        @NotBlank(message = "Text is required")
        private String text;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ParsedSaleItem {
        private String name;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal estimatedPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NaturalSaleParseResponse {
        private String customerName;
        private List<ParsedSaleItem> items;
        private BigDecimal totalAmount;
        private BigDecimal amountPaid;
        private BigDecimal amountCredit;
        private String paymentMode; // CASH, UPI, KHATA, SPLIT
        private Double confidenceScore;
        private String rawText;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiQueryRequest {
        @NotBlank(message = "Question is required")
        private String question;
        private String language; // e.g. en, hi, te, ta, kn, etc.
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiQueryResponse {
        private String queryType;
        private String reply;
        private Object data;
        private String actionLabel;
        private String actionPage;
    }
}
