package com.dukaanai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class SaleDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateSaleRequest {
        @NotBlank(message = "Customer name is required")
        private String customerName;

        private String customerPhone;

        @NotEmpty(message = "Items list cannot be empty")
        private List<SaleItemRequest> items;

        @NotNull(message = "Received amount is required")
        private BigDecimal receivedAmount;

        @Builder.Default
        private String paymentMode = "CASH"; // CASH, UPI, KHATA, SPLIT

        private String rawInput;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SaleItemRequest {
        private String productId;

        @NotBlank(message = "Product name is required")
        private String productName;

        @NotNull(message = "Quantity is required")
        private BigDecimal quantity;

        @Builder.Default
        private String unit = "kg";

        private BigDecimal unitPrice; // Optional if existing product price used
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SaleItemDto {
        private String id;
        private String productId;
        private String productName;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SaleResponse {
        private String id;
        private String shopId;
        private String customerId;
        private String customerName;
        private BigDecimal totalAmount;
        private BigDecimal receivedAmount;
        private BigDecimal outstandingAmount;
        private String paymentMode;
        private String status;
        private String rawInput;
        private List<SaleItemDto> items;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SaleSummaryDto {
        private BigDecimal totalSales;
        private BigDecimal receivedSales;
        private BigDecimal creditSales;
        private long transactionCount;
    }
}
