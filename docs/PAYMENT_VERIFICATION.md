# DukaanSaathi Payment Verification & UPI Architecture

## 1. Core Rule: Claimed vs. Verified Payments

A common vulnerability in voice assistants is treating spoken statements as financial truth:
> *"He paid ₹200 by UPI."*

In DukaanSaathi, the assistant **never claims a UPI payment was received** solely because the customer or shopkeeper spoke it.

Instead, the system separates:
1. **Claimed Payment**: Reported by the user via voice or text.
2. **Verified Payment**: Cryptographically confirmed by an authoritative UPI provider gateway or bank webhook.

---

## 2. Payment Verification Service Hierarchy

```
PaymentVerificationService (Interface)
  ├── ManualPaymentVerificationService
  │     └─ Marks payment as "CLAIMED_PENDING_MERCHANT_CHECK"
  │     └─ Calculates change or credit split for cash/manual payments
  │
  ├── UpiProviderPaymentVerificationService
  │     └─ Verifies HMAC-SHA256 signatures on provider webhooks
  │     └─ Enforces idempotency via providerTransactionId
  │     └─ Matches claimed referenceId against verified payments
  │
  └── UnavailablePaymentVerificationService
        └─ Active when payment gateways are offline; alerts merchant to verify manually
```

---

## 3. Real-Time UPI Webhook Specification

### Endpoint
`POST /api/payments/webhook/upi`

### Request Headers
- `Content-Type: application/json`
- `X-UPI-Signature: <HMAC-SHA256 signature>`

### Request Body
```json
{
  "providerTransactionId": "UPI_TX_987654321",
  "shopId": "b526c044-4594-4233-a023-208501c78aa8",
  "customerName": "Ramesh",
  "amount": 340.00,
  "currency": "INR",
  "status": "SUCCESS",
  "payerVpa": "ramesh@okhdfcbank",
  "timestamp": "2026-09-22T10:30:00"
}
```

### Idempotency Protection
- Repeated webhook deliveries with the same `providerTransactionId` return:
```json
{
  "success": true,
  "status": "DUPLICATE",
  "message": "Transaction already processed and verified."
}
```
No secondary payment or duplicate ledger record is ever created.

### Payment Mismatch Handling
If a bill is ₹340.00, but the verified UPI webhook is for ₹300.00:
- The payment records ₹300.00 received.
- The remaining ₹40.00 is automatically routed to the customer's Khata credit ledger.
- The voice assistant naturally informs the shopkeeper:
  > *"The bill is ₹340, but only ₹300 has been verified as received. ₹40 is still outstanding and added to Khata."*
