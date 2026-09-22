package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SaleItemRepository extends JpaRepository<SaleItem, String> {
    List<SaleItem> findBySaleId(String saleId);
}
