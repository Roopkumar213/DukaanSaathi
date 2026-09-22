package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.VoiceTransactionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VoiceTransactionAuditLogRepository extends JpaRepository<VoiceTransactionAuditLog, String> {
    List<VoiceTransactionAuditLog> findByShopIdOrderByTimestampDesc(String shopId);
}
