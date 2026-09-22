package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.AiDtos.NaturalSaleParseResponse;
import com.dukaanai.backend.service.impl.GeminiAIService;
import com.dukaanai.backend.service.impl.MockAIService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Primary
@Service
public class AIServiceFactory implements AIService {

    @Value("${dukaanai.ai.provider:mock}")
    private String provider;

    private final MockAIService mockAIService;
    private final GeminiAIService geminiAIService;

    public AIServiceFactory(MockAIService mockAIService, GeminiAIService geminiAIService) {
        this.mockAIService = mockAIService;
        this.geminiAIService = geminiAIService;
    }

    private AIService getService() {
        if ("gemini".equalsIgnoreCase(provider)) {
            return geminiAIService;
        }
        return mockAIService;
    }

    @Override
    public NaturalSaleParseResponse parseNaturalSale(String text) {
        return getService().parseNaturalSale(text);
    }

    @Override
    public String askAssistant(String prompt, String systemInstruction) {
        return getService().askAssistant(prompt, systemInstruction);
    }

    @Override
    public String generateGroundedResponse(String question, String intent, String groundedDataJson, String language) {
        return getService().generateGroundedResponse(question, intent, groundedDataJson, language);
    }
}
