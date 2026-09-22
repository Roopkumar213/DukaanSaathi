package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {
    List<Product> findByShopIdOrderByNameAsc(String shopId);

    List<Product> findByShopIdOrderByCreatedAtDesc(String shopId);

    Optional<Product> findByShopIdAndNameIgnoreCase(String shopId, String name);

    List<Product> findByShopIdAndNameContainingIgnoreCase(String shopId, String query);

    @Query("SELECT p FROM Product p WHERE p.shop.id = :shopId AND p.quantity <= p.minStock")
    List<Product> findLowStockProducts(@Param("shopId") String shopId);
}
