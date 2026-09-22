package com.dukaanai.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @Value("${dukaanai.ai.provider:mock}")
    private String aiProvider;

    @GetMapping({"/health", "/api/health"})
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "DukaanAI Backend (Spring Boot)",
                "aiProvider", aiProvider,
                "version", "1.0.0"
        ));
    }
}
