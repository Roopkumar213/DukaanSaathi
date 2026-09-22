package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, String> {
    List<Sale> findByShopIdOrderByCreatedAtDesc(String shopId);

    List<Sale> findByShopIdAndCreatedAtBetweenOrderByCreatedAtDesc(String shopId, LocalDateTime start, LocalDateTime end);

    List<Sale> findByShopIdAndCustomerNameContainingIgnoreCaseOrderByCreatedAtDesc(String shopId, String customerName);

    List<Sale> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s WHERE s.shop.id = :shopId AND s.createdAt >= :since")
    BigDecimal sumTotalSalesSince(@Param("shopId") String shopId, @Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(s.receivedAmount), 0) FROM Sale s WHERE s.shop.id = :shopId AND s.createdAt >= :since")
    BigDecimal sumReceivedSalesSince(@Param("shopId") String shopId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.shop.id = :shopId AND s.createdAt >= :since")
    long countSalesSince(@Param("shopId") String shopId, @Param("since") LocalDateTime since);
}
