package com.dukaanai.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private String type; // IN (stock added), OUT (stock sold), ADJUSTMENT

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal quantity;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal quantityAfter;

    private String reason;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
