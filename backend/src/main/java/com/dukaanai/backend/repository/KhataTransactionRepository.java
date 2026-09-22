package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.KhataTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KhataTransactionRepository extends JpaRepository<KhataTransaction, String> {
    List<KhataTransaction> findByShopIdOrderByCreatedAtDesc(String shopId);
    List<KhataTransaction> findByCustomerIdOrderByCreatedAtDesc(String customerId);
}
