package com.dukaanai.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "voice_transaction_audit_logs", indexes = {
        @Index(name = "idx_audit_shop_time", columnList = "shop_id, timestamp"),
        @Index(name = "idx_audit_intent", columnList = "recognized_intent")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoiceTransactionAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "shop_id", nullable = false)
    private String shopId;

    @Column(name = "user_id")
    private String userId;

    @Column(length = 20, nullable = false)
    private String channel; // VOICE, TEXT

    @Column(columnDefinition = "TEXT")
    private String spokenTranscript;

    @Column(name = "recognized_intent", length = 60)
    private String recognizedIntent; // CREATE_SALE, CHECK_INVENTORY, etc.

    @Column(columnDefinition = "TEXT")
    private String requestedAction; // JSON string of requested params

    @Column(columnDefinition = "TEXT")
    private String validatedAction; // Authoritative DB validated result

    @Column(length = 64)
    private String saleId;

    @Column(length = 64)
    private String paymentId;

    @Column(length = 30)
    private String confirmationStatus; // PENDING_CONFIRMATION, CONFIRMED, CANCELLED, REJECTED

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();
}
