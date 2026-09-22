package com.dukaanai.backend.service.impl;

import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentClaim;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentVerificationResult;
import com.dukaanai.backend.dto.PaymentVerificationDtos.UpiWebhookPayload;
import com.dukaanai.backend.dto.PaymentVerificationDtos.WebhookResponse;
import com.dukaanai.backend.service.PaymentVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
@RequiredArgsConstructor
public class PaymentVerificationServiceImpl implements PaymentVerificationService {

    private final ManualPaymentVerificationService manualService;
    private final UpiProviderPaymentVerificationService upiProviderService;
    private final UnavailablePaymentVerificationService unavailableService;

    @Value("${dukaanai.payment.verification-provider:manual}")
    private String configuredProvider;

    private PaymentVerificationService getDelegate() {
        if ("upi".equalsIgnoreCase(configuredProvider) || "upi_provider".equalsIgnoreCase(configuredProvider)) {
            return upiProviderService;
        }
        if ("unavailable".equalsIgnoreCase(configuredProvider)) {
            return unavailableService;
        }
        return manualService;
    }

    @Override
    public PaymentVerificationResult verifyClaim(PaymentClaim claim) {
        return getDelegate().verifyClaim(claim);
    }

    @Override
    public WebhookResponse processWebhook(UpiWebhookPayload payload, String incomingSignature) {
        // Webhook processing always routes to UPI provider service for cryptographic verification
        return upiProviderService.processWebhook(payload, incomingSignature);
    }

    @Override
    public String getProviderName() {
        return getDelegate().getProviderName();
    }
}
