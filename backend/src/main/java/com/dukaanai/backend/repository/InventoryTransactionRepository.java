package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, String> {
    List<InventoryTransaction> findByShopIdOrderByCreatedAtDesc(String shopId);
    List<InventoryTransaction> findByProductIdOrderByCreatedAtDesc(String productId);
}
