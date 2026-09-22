package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.AiDtos.NaturalSaleParseResponse;

public interface AIService {
    NaturalSaleParseResponse parseNaturalSale(String text);
    String askAssistant(String prompt, String systemInstruction);
    String generateGroundedResponse(String question, String intent, String groundedDataJson, String language);
}
