package com.dukaanai.backend.service;

import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentClaim;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentVerificationResult;
import com.dukaanai.backend.dto.PaymentVerificationDtos.UpiWebhookPayload;
import com.dukaanai.backend.dto.PaymentVerificationDtos.WebhookResponse;
import com.dukaanai.backend.entity.Shop;
import com.dukaanai.backend.repository.ShopRepository;
import com.dukaanai.backend.service.impl.UpiProviderPaymentVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
public class PaymentVerificationServiceTest {

    @Autowired
    private PaymentVerificationService paymentVerificationService;

    @Autowired
    private UpiProviderPaymentVerificationService upiProviderService;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private com.dukaanai.backend.repository.UserRepository userRepository;

    private Shop testShop;
    private final String testSecret = "dukaansaathi-upi-webhook-test-secret";

    @BeforeEach
    void setUp() {
        com.dukaanai.backend.entity.User owner = userRepository.save(com.dukaanai.backend.entity.User.builder()
                .email("pay-owner-" + System.currentTimeMillis() + "@test.local")
                .password("hashedPassword")
                .fullName("Payment Merchant")
                .build());

        testShop = shopRepository.save(Shop.builder()
                .name("Saathi Payment Test Shop")
                .owner(owner)
                .address("Bangalore, Karnataka")
                .build());
    }

    private String computeHmacSignature(String txId, String shopId, BigDecimal amount) throws Exception {
        String data = txId + "|" + shopId + "|" + amount;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(testSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("UPI Webhook Verification & Duplicate Idempotency Protection")
    void testUpiWebhookAndIdempotency() throws Exception {
        String txId = "UPI_TX_" + System.currentTimeMillis();
        BigDecimal amount = new BigDecimal("340.00");
        String signature = computeHmacSignature(txId, testShop.getId(), amount);

        UpiWebhookPayload payload = UpiWebhookPayload.builder()
                .providerTransactionId(txId)
                .shopId(testShop.getId())
                .customerName("Ramesh")
                .amount(amount)
                .currency("INR")
                .status("SUCCESS")
                .payerVpa("ramesh@upi")
                .timestamp(LocalDateTime.now())
                .build();

        // 1. Initial Webhook delivery -> should succeed and record verified payment
        WebhookResponse resp1 = upiProviderService.processWebhook(payload, signature);
        assertTrue(resp1.isSuccess());
        assertEquals("VERIFIED", resp1.getStatus());
        assertNotNull(resp1.getPaymentId());

        // 2. Duplicate Webhook delivery with same providerTransactionId -> must be caught as DUPLICATE
        WebhookResponse resp2 = upiProviderService.processWebhook(payload, signature);
        assertTrue(resp2.isSuccess(), "Duplicate response still reports success to provider");
        assertEquals("DUPLICATE", resp2.getStatus(), "Must recognize duplicate transaction");
    }

    @Test
    @DisplayName("Invalid HMAC signature is rejected with HTTP 401 equivalent status")
    void testInvalidSignatureRejection() {
        UpiWebhookPayload payload = UpiWebhookPayload.builder()
                .providerTransactionId("FORGED_TX_123")
                .shopId(testShop.getId())
                .amount(new BigDecimal("500.00"))
                .build();

        WebhookResponse resp = upiProviderService.processWebhook(payload, "invalid_signature_hash");
        assertFalse(resp.isSuccess());
        assertEquals("INVALID_SIGNATURE", resp.getStatus());
    }

    @Test
    @DisplayName("Spoken UPI claim without gateway confirmation is strictly marked UNVERIFIED")
    void testUnverifiedSpokenUpiClaim() {
        PaymentClaim claim = PaymentClaim.builder()
                .shopId(testShop.getId())
                .customerName("Ramesh")
                .billAmount(new BigDecimal("340.00"))
                .claimedAmount(new BigDecimal("340.00"))
                .paymentMode("UPI")
                .referenceId("UNCONFIRMED_UTR_999999")
                .build();

        PaymentVerificationResult result = paymentVerificationService.verifyClaim(claim);
        assertEquals("CLAIMED_PENDING_MERCHANT_CHECK", result.getStatus());
        assertEquals(BigDecimal.ZERO, result.getVerifiedAmount(), "Verified amount must be ZERO until confirmed by gateway or merchant");
    }
}
