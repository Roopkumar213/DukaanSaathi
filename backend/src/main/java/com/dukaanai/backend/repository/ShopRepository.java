package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, String> {
    List<Shop> findByOwner(User owner);
    Optional<Shop> findFirstByOwnerId(String ownerId);
}
