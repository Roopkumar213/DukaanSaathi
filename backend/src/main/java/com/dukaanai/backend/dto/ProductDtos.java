package com.dukaanai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductDto {
        private String id;
        private String name;
        private String category;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal price;
        private BigDecimal minStock;
        private String status; // AVAILABLE, LOW_STOCK, OUT_OF_STOCK
        private LocalDateTime updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductRequest {
        @NotBlank(message = "Product name is required")
        private String name;

        @Builder.Default
        private String category = "General";

        @NotNull(message = "Quantity is required")
        private BigDecimal quantity;

        @Builder.Default
        private String unit = "kg";

        @NotNull(message = "Price is required")
        private BigDecimal price;

        @Builder.Default
        private BigDecimal minStock = new BigDecimal("5.00");
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StockAdjustmentRequest {
        @NotNull(message = "Quantity delta is required")
        private BigDecimal quantityDelta;

        @Builder.Default
        private String type = "IN"; // IN or OUT

        private String reason;
    }
}
