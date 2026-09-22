package com.dukaanai.backend.service.impl;

import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentClaim;
import com.dukaanai.backend.dto.PaymentVerificationDtos.PaymentVerificationResult;
import com.dukaanai.backend.dto.PaymentVerificationDtos.UpiWebhookPayload;
import com.dukaanai.backend.dto.PaymentVerificationDtos.WebhookResponse;
import com.dukaanai.backend.repository.PaymentRepository;
import com.dukaanai.backend.service.PaymentVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service("manualPaymentVerificationService")
@RequiredArgsConstructor
@Slf4j
public class ManualPaymentVerificationService implements PaymentVerificationService {

    private final PaymentRepository paymentRepository;

    @Override
    public PaymentVerificationResult verifyClaim(PaymentClaim claim) {
        BigDecimal bill = claim.getBillAmount() != null ? claim.getBillAmount() : BigDecimal.ZERO;
        BigDecimal claimed = claim.getClaimedAmount() != null ? claim.getClaimedAmount() : BigDecimal.ZERO;
        String mode = claim.getPaymentMode() != null ? claim.getPaymentMode().toUpperCase() : "CASH";

        // Mismatch check: Bill vs Claimed
        BigDecimal difference = bill.subtract(claimed);

        if ("CASH".equals(mode)) {
            if (claimed.compareTo(bill) >= 0) {
                BigDecimal change = claimed.subtract(bill);
                String notes = change.compareTo(BigDecimal.ZERO) > 0
                        ? "Cash received ₹" + claimed + ". Bill is ₹" + bill + ". Return change ₹" + change + "."
                        : "Full cash payment of ₹" + bill + " confirmed by merchant.";
                return PaymentVerificationResult.builder()
                        .status("CLAIMED_PENDING_MERCHANT_CHECK")
                        .provider("MANUAL")
                        .providerTransactionId(claim.getReferenceId())
                        .verifiedAmount(bill)
                        .differenceAmount(BigDecimal.ZERO)
                        .notes(notes)
                        .allowsFinalization(true)
                        .build();
            } else {
                return PaymentVerificationResult.builder()
                        .status("MISMATCH")
                        .provider("MANUAL")
                        .providerTransactionId(claim.getReferenceId())
                        .verifiedAmount(claimed)
                        .differenceAmount(difference)
                        .notes("Partial cash payment of ₹" + claimed + " reported. Remaining ₹" + difference + " will be recorded in customer Khata ledger.")
                        .allowsFinalization(true)
                        .build();
            }
        }

        if ("UPI".equals(mode)) {
            // Strict requirement: Never fabricate UPI verification solely from spoken input!
            boolean hasProviderRecord = claim.getReferenceId() != null &&
                    paymentRepository.existsByShopIdAndProviderTransactionId(claim.getShopId(), claim.getReferenceId());

            if (hasProviderRecord) {
                return PaymentVerificationResult.builder()
                        .status("VERIFIED")
                        .provider("UPI_PROVIDER")
                        .providerTransactionId(claim.getReferenceId())
                        .verifiedAmount(claimed)
                        .differenceAmount(difference.max(BigDecimal.ZERO))
                        .notes("UPI payment of ₹" + claimed + " matched with verified provider transaction.")
                        .allowsFinalization(true)
                        .build();
            }

            // Unverified UPI: require merchant verification
            String notes = "Shopkeeper reported UPI payment of ₹" + claimed +
                    ", but no gateway webhook confirmation received. Marked as unverified claim pending bank/app check.";
            if (difference.compareTo(BigDecimal.ZERO) > 0) {
                notes += " Unsettled balance of ₹" + difference + " will be recorded to Khata.";
            }

            return PaymentVerificationResult.builder()
                    .status("CLAIMED_PENDING_MERCHANT_CHECK")
                    .provider("MANUAL")
                    .providerTransactionId(claim.getReferenceId())
                    .verifiedAmount(BigDecimal.ZERO)
                    .differenceAmount(difference)
                    .notes(notes)
                    .allowsFinalization(true)
                    .build();
        }

        // Credit / Khata
        return PaymentVerificationResult.builder()
                .status("VERIFIED")
                .provider("MANUAL")
                .providerTransactionId(null)
                .verifiedAmount(BigDecimal.ZERO)
                .differenceAmount(bill)
                .notes("Full bill amount of ₹" + bill + " added to customer credit ledger (Khata).")
                .allowsFinalization(true)
                .build();
    }

    @Override
    public WebhookResponse processWebhook(UpiWebhookPayload payload, String incomingSignature) {
        // Fallback webhook processor for manual profile
        return WebhookResponse.builder()
                .success(false)
                .status("DISABLED")
                .message("Real-time UPI gateway webhook is operating in manual verification mode.")
                .build();
    }

    @Override
    public String getProviderName() {
        return "MANUAL";
    }
}
