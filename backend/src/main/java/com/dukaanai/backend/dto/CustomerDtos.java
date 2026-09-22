package com.dukaanai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CustomerDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerDto {
        private String id;
        private String name;
        private String phone;
        private BigDecimal balance;
        private BigDecimal creditLimit;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerRequest {
        @NotBlank(message = "Customer name is required")
        private String name;

        private String phone;

        @Builder.Default
        private BigDecimal balance = BigDecimal.ZERO;

        @Builder.Default
        private BigDecimal creditLimit = new BigDecimal("5000.00");
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerDetailDto {
        private String id;
        private String name;
        private String phone;
        private BigDecimal balance;
        private BigDecimal creditLimit;
        private List<KhataTransactionDto> transactions;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class KhataTransactionDto {
        private String id;
        private String type; // SALE, DEBIT, CREDIT
        private BigDecimal amount;
        private BigDecimal balanceAfter;
        private String note;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentRecordRequest {
        @NotNull(message = "Payment amount is required")
        private BigDecimal amount;

        @Builder.Default
        private String paymentMode = "CASH";

        private String note;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentDto {
        private String id;
        private String customerId;
        private String customerName;
        private String saleId;
        private BigDecimal amount;
        private String paymentMode;
        private String note;
        private LocalDateTime createdAt;
    }
}
