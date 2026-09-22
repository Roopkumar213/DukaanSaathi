package com.dukaanai.backend.repository;

import com.dukaanai.backend.entity.UploadedDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UploadedDocumentRepository extends JpaRepository<UploadedDocument, String> {
    List<UploadedDocument> findByShopIdOrderByCreatedAtDesc(String shopId);
}
