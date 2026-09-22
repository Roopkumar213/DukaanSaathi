package com.dukaanai.backend.service;

import com.dukaanai.backend.entity.VoiceTransactionAuditLog;
import com.dukaanai.backend.repository.VoiceTransactionAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final VoiceTransactionAuditLogRepository auditLogRepository;

    @Transactional
    public VoiceTransactionAuditLog logTransaction(
            String shopId,
            String userId,
            String channel,
            String spokenTranscript,
            String recognizedIntent,
            String requestedAction,
            String validatedAction,
            String saleId,
            String paymentId,
            String confirmationStatus) {

        VoiceTransactionAuditLog logEntry = VoiceTransactionAuditLog.builder()
                .shopId(shopId)
                .userId(userId)
                .channel(channel != null ? channel : "VOICE")
                .spokenTranscript(spokenTranscript)
                .recognizedIntent(recognizedIntent)
                .requestedAction(requestedAction)
                .validatedAction(validatedAction)
                .saleId(saleId)
                .paymentId(paymentId)
                .confirmationStatus(confirmationStatus != null ? confirmationStatus : "PENDING_CONFIRMATION")
                .timestamp(LocalDateTime.now())
                .build();

        log.info("Recording voice audit log for shop={}, intent={}, status={}", shopId, recognizedIntent, confirmationStatus);
        return auditLogRepository.save(logEntry);
    }

    @Transactional
    public void updateConfirmation(String auditLogId, String status, String saleId) {
        auditLogRepository.findById(auditLogId).ifPresent(entry -> {
            entry.setConfirmationStatus(status);
            if (saleId != null) {
                entry.setSaleId(saleId);
            }
            auditLogRepository.save(entry);
        });
    }

    public List<VoiceTransactionAuditLog> getShopAuditLogs(String shopId) {
        return auditLogRepository.findByShopIdOrderByTimestampDesc(shopId);
    }
}
