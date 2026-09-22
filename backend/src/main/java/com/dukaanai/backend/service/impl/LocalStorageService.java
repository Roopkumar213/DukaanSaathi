package com.dukaanai.backend.service.impl;

import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.entity.UploadedDocument;
import com.dukaanai.backend.repository.ShopRepository;
import com.dukaanai.backend.repository.UploadedDocumentRepository;
import com.dukaanai.backend.service.StorageService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocalStorageService implements StorageService {

    @Value("${dukaanai.storage.upload-dir:uploads}")
    private String uploadDir;

    private Path rootLocation;
    private final UploadedDocumentRepository documentRepository;
    private final ShopRepository shopRepository;

    @PostConstruct
    public void init() {
        this.rootLocation = Paths.get(uploadDir);
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    @Override
    public String store(MultipartFile file, String shopId) throws IOException {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed");
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf(".");
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }
        String storedFilename = UUID.randomUUID().toString() + extension;
        Path destination = this.rootLocation.resolve(storedFilename);

        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

        if (shopId != null) {
            Shop shop = shopRepository.findById(shopId).orElse(null);
            if (shop != null) {
                UploadedDocument doc = UploadedDocument.builder()
                        .shop(shop)
                        .fileName(originalFilename)
                        .filePath("/uploads/" + storedFilename)
                        .contentType(file.getContentType())
                        .fileSize(file.getSize())
                        .build();
                documentRepository.save(doc);
            }
        }

        return "/uploads/" + storedFilename;
    }

    @Override
    public byte[] load(String filename) throws IOException {
        Path file = rootLocation.resolve(filename);
        if (Files.exists(file) && Files.isReadable(file)) {
            return Files.readAllBytes(file);
        } else {
            throw new NoSuchFileException("Could not read file: " + filename);
        }
    }
}
