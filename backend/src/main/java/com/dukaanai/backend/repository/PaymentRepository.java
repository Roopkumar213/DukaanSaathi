package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {
    List<Payment> findByShopIdOrderByCreatedAtDesc(String shopId);
    List<Payment> findByCustomerIdOrderByCreatedAtDesc(String customerId);
}
