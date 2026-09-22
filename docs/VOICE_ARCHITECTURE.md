# DukaanSaathi Voice Architecture

## 1. Executive Summary

**DukaanSaathi** (*"Your shop, just talk"*) provides Indian kirana and local retail shopkeepers with a voice-first operating assistant. The system supports natural spoken interactions in native Indian scripts, Romanized Indian languages (e.g. Hinglish, Telugu-English), and code-switching dialects.

```
Shopkeeper Microphone (16kHz PCM mono)
  ↓
Browser Voice UI (AIAssistant.tsx & useVoiceSession.ts)
  ↓ Secure WebSocket (ws://localhost:8080/ws/voice-assistant?token=JWT)
Spring Boot VoiceSessionHandler
  ├─ Authenticate JWT & Resolve Merchant ShopId
  ├─ Inject Dynamic Shop Vocabulary (Products, Customers, Units from DB)
  ├─ Bidirectional Audio Bridge
  ↓
Google Gemini Live API (Preferred model: gemini-2.0-flash-exp / gemini-3.8-live)
  ↓ Function / Tool Call Event
Spring Boot VoiceBusinessTools
  ├─ Authoritative DB Price Lookup (ProductRepository)
  ├─ Strict Stock Check (No negative inventory)
  ├─ Payment Verification (PaymentVerificationService)
  └─ Audit Log Creation (AuditLogService)
  ↓
Voice Confirmation Card (AIAssistant UI)
  ↓ Merchant Confirms ("Confirm Sale" / "Avunu" / "Yes")
Authoritative SaleService.createSale()
  ↓
Spoken Voice Audio Output (24kHz PCM) + Text Response played back to Merchant
```

---

## 2. Key Architectural Guarantees

### 1. Strict Zero-Hallucination & Authoritative Pricing
- Gemini Live is **never** permitted to invent product prices, invent customer credit balances, or compute mathematical bill totals on its own.
- When the shopkeeper says: *"Ramesh ki 1 kg rice ammanu"*:
  1. The assistant extracts: Customer = `Ramesh`, Product = `Rice`, Quantity = `1`, Unit = `kg`.
  2. Spring Boot executes `voiceBusinessTools.calculateSale(...)`.
  3. The database retrieves the authoritative unit price (e.g. ₹170.00/kg) and current stock (e.g. 25.00 kg).
  4. The backend computes: `1 kg × ₹170.00 = ₹170.00`.
  5. The backend validates that requested quantity (1 kg) $\le$ available stock (25 kg).
  6. A visual and spoken confirmation card is generated.

### 2. Zero Client-Side Secret Exposure
- The `GEMINI_API_KEY` is **never** included in frontend bundle, cookies, or browser storage.
- All Gemini Live WebSocket connections originate directly from the Spring Boot backend server.
- The browser authenticates with the backend using the merchant's standard JWT token.

### 3. Dynamic Shop Vocabulary (Zero Hardcoding)
- Upon WebSocket connection, the backend queries the authenticated merchant's live catalog and customer roster:
  - Product names (`Rice`, `Sugar`, `Dal`, `Atta`, etc.)
  - Customer names (`Ramesh`, `Suresh`, `Anitha`, etc.)
  - Store name (`Lakshmi Kirana & General Store`)
  - Measurement units (`kg`, `gram`, `packet`, `litre`, `bottle`)
  - Payment modes (`Cash`, `UPI`, `Khata`, `Udhaar`)
- These terms are dynamically injected into the Gemini Live session setup, providing context-aware transcription accuracy without hardcoding data.

### 4. Barge-in & Interruption Support
- When the merchant begins speaking while the assistant is talking, the frontend immediately cancels and purges the active `AudioContext` buffer queue and transmits an `interrupt` signal to the backend.
- The assistant immediately stops talking and transitions back to `LISTENING`.

---

## 3. Supported Languages & Code-Switching

DukaanSaathi supports 11 Indian languages with full code-switching:
1. **Telugu** (తెలుగు) — *"రమేష్ కి ఒక కిలో బియ్యం అమ్మాను"* / *"Ramesh ki 1 kg rice ammanu"*
2. **Hindi** (हिन्दी) — *"रमेश को 1 किलो चावल दिया"* / *"Ramesh ko ek kilo chawal diya"*
3. **English** — *"Sold 1 kg rice to Ramesh"*
4. **Tamil** (தமிழ்) — *"ரமேஷிற்கு 1 கிலோ அரிசி விற்றேன்"*
5. **Kannada** (ಕನ್ನಡ) — *"ರಮೇಶ್‌ಗೆ 1 ಕೆಜಿ ಅಕ್ಕಿ ಮಾರಾಟ ಮಾಡಿದೆ"*
6. **Malayalam** (മലയാളം)
7. **Marathi** (मराठी)
8. **Bengali** (বাংলা)
9. **Gujarati** (ગુજરાતી)
10. **Punjabi** (ਪੰਜਾਬੀ)
11. **Odia** (ଓଡ଼ିଆ)
