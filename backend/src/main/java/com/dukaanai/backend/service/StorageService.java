package com.dukaanai.backend.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface StorageService {
    String store(MultipartFile file, String shopId) throws IOException;
    byte[] load(String filename) throws IOException;
}
