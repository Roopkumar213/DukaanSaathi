package com.dukaanai.backend.service.impl;

import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentClaim;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentVerificationResult;
import com.dukaanai.backend.dto.PaymentVerificationDtos.UpiWebhookPayload;
import com.dukaanai.backend.dto.PaymentVerificationDtos.WebhookResponse;
import com.dukaanai.backend.entity.Payment;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.repository.PaymentRepository;
import com.dukaanai.backend.repository.ShopRepository;
import com.dukaanai.backend.service.PaymentVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service("upiProviderPaymentVerificationService")
@RequiredArgsConstructor
@Slf4j
public class UpiProviderPaymentVerificationService implements PaymentVerificationService {

    private final PaymentRepository paymentRepository;
    private final ShopRepository shopRepository;

    @Value("${dukaanai.payment.webhook-secret:dukaansaathi-upi-webhook-test-secret}")
    private String webhookSecret;

    @Override
    public PaymentVerificationResult verifyClaim(PaymentClaim claim) {
        if (!"UPI".equalsIgnoreCase(claim.getPaymentMode())) {
            // Forward non-UPI claims
            return PaymentVerificationResult.builder()
                    .status("CLAIMED_PENDING_MERCHANT_CHECK")
                    .provider("MANUAL")
                    .verifiedAmount(claim.getClaimedAmount())
                    .differenceAmount(BigDecimal.ZERO)
                    .notes("Non-UPI claim forwarded for merchant check.")
                    .allowsFinalization(true)
                    .build();
        }

        String refId = claim.getReferenceId();
        if (refId == null || refId.trim().isEmpty()) {
            return PaymentVerificationResult.builder()
                    .status("UNVERIFIED")
                    .provider("UPI_PROVIDER")
                    .verifiedAmount(BigDecimal.ZERO)
                    .differenceAmount(claim.getBillAmount())
                    .notes("No UPI reference ID provided. Payment is unverified.")
                    .allowsFinalization(false)
                    .build();
        }

        // Check if provider transaction is already verified in DB
        return paymentRepository.findByShopIdAndProviderTransactionId(claim.getShopId(), refId)
                .map(payment -> {
                    BigDecimal bill = claim.getBillAmount() != null ? claim.getBillAmount() : BigDecimal.ZERO;
                    BigDecimal verified = payment.getAmount();
                    BigDecimal diff = bill.subtract(verified);

                    if (diff.compareTo(BigDecimal.ZERO) > 0) {
                        return PaymentVerificationResult.builder()
                                .status("MISMATCH")
                                .provider("UPI_PROVIDER")
                                .providerTransactionId(refId)
                                .verifiedAmount(verified)
                                .differenceAmount(diff)
                                .notes("Verified UPI payment of ₹" + verified + " is less than bill amount of ₹" + bill + ". Outstanding ₹" + diff + " will be recorded to Khata.")
                                .allowsFinalization(true)
                                .build();
                    } else {
                        return PaymentVerificationResult.builder()
                                .status("VERIFIED")
                                .provider("UPI_PROVIDER")
                                .providerTransactionId(refId)
                                .verifiedAmount(verified)
                                .differenceAmount(BigDecimal.ZERO)
                                .notes("Verified UPI payment of ₹" + verified + " confirmed via gateway.")
                                .allowsFinalization(true)
                                .build();
                    }
                })
                .orElseGet(() -> PaymentVerificationResult.builder()
                        .status("UNVERIFIED")
                        .provider("UPI_PROVIDER")
                        .providerTransactionId(refId)
                        .verifiedAmount(BigDecimal.ZERO)
                        .differenceAmount(claim.getBillAmount())
                        .notes("No matching provider transaction found for reference: " + refId + ". Please verify UPI app manually.")
                        .allowsFinalization(true)
                        .build());
    }

    @Override
    @Transactional
    public WebhookResponse processWebhook(UpiWebhookPayload payload, String incomingSignature) {
        log.info("Processing UPI webhook for shop: {}, txId: {}", payload.getShopId(), payload.getProviderTransactionId());

        // 1. Signature Verification
        if (!verifySignature(payload, incomingSignature)) {
            log.warn("Invalid webhook signature for txId: {}", payload.getProviderTransactionId());
            return WebhookResponse.builder()
                    .success(false)
                    .status("INVALID_SIGNATURE")
                    .message("HMAC signature verification failed")
                    .build();
        }

        // 2. Idempotency Check (Duplicate Transaction Protection)
        if (paymentRepository.existsByShopIdAndProviderTransactionId(payload.getShopId(), payload.getProviderTransactionId())) {
            log.info("Duplicate payment webhook detected for txId: {}. Skipping.", payload.getProviderTransactionId());
            return WebhookResponse.builder()
                    .success(true)
                    .status("DUPLICATE")
                    .message("Transaction already processed and verified.")
                    .build();
        }

        // 3. Shop Validation
        Shop shop = shopRepository.findById(payload.getShopId()).orElse(null);
        if (shop == null) {
            log.error("Shop not found for webhook: {}", payload.getShopId());
            return WebhookResponse.builder()
                    .success(false)
                    .status("SHOP_NOT_FOUND")
                    .message("Target merchant shop does not exist")
                    .build();
        }

        // 4. Save Verified Payment Record
        Payment payment = Payment.builder()
                .shop(shop)
                .customerName(payload.getCustomerName() != null ? payload.getCustomerName() : "UPI Customer")
                .amount(payload.getAmount())
                .paymentMode("UPI")
                .providerTransactionId(payload.getProviderTransactionId())
                .verificationStatus("VERIFIED")
                .note("Verified UPI Payment via Gateway. Payer VPA: " + payload.getPayerVpa())
                .createdAt(payload.getTimestamp() != null ? payload.getTimestamp() : LocalDateTime.now())
                .build();

        Payment saved = paymentRepository.save(payment);

        log.info("Successfully recorded verified UPI payment id: {}", saved.getId());
        return WebhookResponse.builder()
                .success(true)
                .status("VERIFIED")
                .message("UPI payment verified and recorded successfully.")
                .paymentId(saved.getId())
                .build();
    }

    private boolean verifySignature(UpiWebhookPayload payload, String incomingSignature) {
        if (incomingSignature == null || incomingSignature.trim().isEmpty()) {
            return false;
        }
        try {
            String data = payload.getProviderTransactionId() + "|" + payload.getShopId() + "|" + payload.getAmount();
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String computedSignature = HexFormat.of().formatHex(rawHmac);
            return MessageDigest.isEqual(computedSignature.getBytes(StandardCharsets.UTF_8), incomingSignature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Error verifying webhook signature: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public String getProviderName() {
        return "UPI_PROVIDER";
    }
}
