package com.dukaanai.backend.controller;

import com.dukaanai.backend.security.UserPrincipal;
import com.dukaanai.backend.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MediaController {

    private final StorageService storageService;

    @PostMapping("/api/media/upload")
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) throws IOException {
        String shopId = principal != null ? principal.getShopId() : null;
        String url = storageService.store(file, shopId);
        return ResponseEntity.ok(Map.of("url", url, "fileName", file.getOriginalFilename() != null ? file.getOriginalFilename() : ""));
    }

    @GetMapping("/uploads/{filename:.+}")
    public ResponseEntity<byte[]> getFile(@PathVariable String filename) throws IOException {
        byte[] data = storageService.load(filename);

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) mediaType = MediaType.IMAGE_PNG;
        else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mediaType = MediaType.IMAGE_JPEG;
        else if (lower.endsWith(".webm")) mediaType = MediaType.parseMediaType("audio/webm");
        else if (lower.endsWith(".wav")) mediaType = MediaType.parseMediaType("audio/wav");
        else if (lower.endsWith(".mp3")) mediaType = MediaType.parseMediaType("audio/mpeg");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(data);
    }
}
