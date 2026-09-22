package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, String> {
    List<Customer> findByShopIdOrderByNameAsc(String shopId);

    Optional<Customer> findByShopIdAndNameIgnoreCase(String shopId, String name);

    List<Customer> findByShopIdAndBalanceGreaterThanOrderByBalanceDesc(String shopId, BigDecimal balance);

    @Query("SELECT c FROM Customer c WHERE c.shop.id = :shopId AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')) OR c.phone LIKE CONCAT('%', :q, '%'))")
    List<Customer> searchCustomers(@Param("shopId") String shopId, @Param("q") String q);
}
