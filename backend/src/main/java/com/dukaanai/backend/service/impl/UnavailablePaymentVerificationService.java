package com.dukaanai.backend.service.impl;

import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentClaim;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentVerificationResult;
import com.dukaanai.backend.dto.PaymentVerificationDtos.UpiWebhookPayload;
import com.dukaanai.backend.dto.PaymentVerificationDtos.WebhookResponse;
import com.dukaanai.backend.service.PaymentVerificationService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service("unavailablePaymentVerificationService")
public class UnavailablePaymentVerificationService implements PaymentVerificationService {

    @Override
    public PaymentVerificationResult verifyClaim(PaymentClaim claim) {
        return PaymentVerificationResult.builder()
                .status("UNVERIFIED")
                .provider("UNAVAILABLE")
                .providerTransactionId(claim.getReferenceId())
                .verifiedAmount(BigDecimal.ZERO)
                .differenceAmount(claim.getBillAmount())
                .notes("Payment verification gateway is currently unavailable. Please verify payment physically.")
                .allowsFinalization(false)
                .build();
    }

    @Override
    public WebhookResponse processWebhook(UpiWebhookPayload payload, String incomingSignature) {
        return WebhookResponse.builder()
                .success(false)
                .status("SERVICE_UNAVAILABLE")
                .message("Payment verification service is offline.")
                .build();
    }

    @Override
    public String getProviderName() {
        return "UNAVAILABLE";
    }
}
