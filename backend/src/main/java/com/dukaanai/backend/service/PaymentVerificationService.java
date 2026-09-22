package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentClaim;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentVerificationResult;
import com.dukaanai.backend.dto.PaymentVerificationDtos.UpiWebhookPayload;
import com.dukaanai.backend.dto.PaymentVerificationDtos.WebhookResponse;

public interface PaymentVerificationService {

    /**
     * Evaluates a payment claim made via voice, chat, or direct entry.
     * Differentiates claimed amount from verified amount.
     */
    PaymentVerificationResult verifyClaim(PaymentClaim claim);

    /**
     * Handles real-time webhook callback from a registered UPI provider.
     * Enforces signature verification and idempotency protection against duplicate transactions.
     */
    WebhookResponse processWebhook(UpiWebhookPayload payload, String incomingSignature);

    /**
     * Provider identifier (UPI_PROVIDER, MANUAL, UNAVAILABLE).
     */
    String getProviderName();
}
