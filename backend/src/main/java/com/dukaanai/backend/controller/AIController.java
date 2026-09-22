package com.dukaanai.backend.controller;

import com.dukaanai.backend.dto.AiDtos.*;
import com.dukaanai.backend.security.UserPrincipal;
import com.dukaanai.backend.service.AIService;
import com.dukaanai.backend.service.AiQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;
    private final AiQueryService aiQueryService;

    @PostMapping("/parse-sale")
    public ResponseEntity<NaturalSaleParseResponse> parseNaturalSale(@Valid @RequestBody NaturalSaleParseRequest req) {
        return ResponseEntity.ok(aiService.parseNaturalSale(req.getText()));
    }

    @PostMapping("/query")
    public ResponseEntity<AiQueryResponse> executeAiQuery(@AuthenticationPrincipal UserPrincipal principal,
                                                         @Valid @RequestBody AiQueryRequest req) {
        return ResponseEntity.ok(aiQueryService.executeQuery(principal.getShopId(), req.getQuestion(), req.getLanguage()));
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> askAssistant(@RequestBody Map<String, String> body) {
        String prompt = body.getOrDefault("prompt", body.getOrDefault("question", ""));
        String systemInstruction = "You are DukaanAI, a helpful, intelligent digital assistant for Kirana store shopkeepers in India.";
        String reply = aiService.askAssistant(prompt, systemInstruction);
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
