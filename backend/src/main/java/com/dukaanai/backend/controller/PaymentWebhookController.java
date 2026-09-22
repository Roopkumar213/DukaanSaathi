package com.dukaanai.backend.controller;

import com.dukaanai.backend.dto.PaymentVerificationDtos.UpiWebhookPayload;
import com.dukaanai.backend.dto.PaymentVerificationDtos.WebhookResponse;
import com.dukaanai.backend.service.PaymentVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/webhook")
@RequiredArgsConstructor
@Slf4j
public class PaymentWebhookController {

    private final PaymentVerificationService paymentVerificationService;

    @PostMapping("/upi")
    public ResponseEntity<WebhookResponse> handleUpiWebhook(
            @RequestBody UpiWebhookPayload payload,
            @RequestHeader(value = "X-UPI-Signature", required = false) String signature) {

        log.info("Received UPI webhook: txId={}, shopId={}, amount={}",
                payload.getProviderTransactionId(), payload.getShopId(), payload.getAmount());

        WebhookResponse response = paymentVerificationService.processWebhook(payload, signature);

        if (!response.isSuccess() && "INVALID_SIGNATURE".equals(response.getStatus())) {
            return ResponseEntity.status(401).body(response);
        }

        return ResponseEntity.ok(response);
    }
}
