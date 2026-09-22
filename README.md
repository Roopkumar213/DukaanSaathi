# DukaanSaathi — Your Shop, Just Talk

[![Spring Boot 3.3.4](https://img.shields.io/badge/Backend-Spring%20Boot%203.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20+%20Vite%208-blue.svg)](https://react.dev/)
[![Gemini Live API](https://img.shields.io/badge/AI-Gemini%20Live%20Multimodal-orange.svg)](https://ai.google.dev/)
[![Multilingual](https://img.shields.io/badge/Languages-11%20Indian%20Languages-indigo.svg)](#supported-languages)

**DukaanSaathi** is a voice-first AI operating assistant designed specifically for Indian kirana store owners and local retailers. It enables shopkeepers to speak naturally in their own mother tongue (Telugu, Hindi, Tamil, Kannada, Hinglish, etc.), understands everyday shop transactions, validates prices and stock against the authoritative database, presents instant confirmation cards, and executes atomic financial ledger updates.

---

## 🚀 Key Highlights

1. **Multilingual Real-Time Voice Transaction Assistant**:
   - Supports 11 Indian languages with natural code-switching (e.g., *"Ramesh ki 1 kg rice ammanu"*).
   - Powered by Google's Gemini Live API with bidirectional raw PCM audio streaming.
   - Dynamic shop vocabulary injection from the merchant's live database.
   - Instant barge-in / speech interruption.
2. **Zero Dummy Data & Authoritative Pricing**:
   - The AI **never** invents prices, stock quantities, customer names, or mathematical totals.
   - All product prices (`quantity × database price`) and inventory deductions are computed strictly by backend services.
3. **Financial Safety & Interactive Confirmation**:
   - Spoken sales generate a visual review card with itemized breakdown and payment terms.
   - Sales are only committed to the database after merchant confirmation.
4. **Payment Verification & UPI Webhook Architecture**:
   - Strict separation between claimed payments and verified payments.
   - Gateway webhook endpoint (`/api/payments/webhook/upi`) with HMAC signature validation and idempotency protection against duplicate transactions.
5. **Audit Logging**:
   - Every financial voice operation is permanently recorded with spoken transcripts, recognized intents, database results, and status.
6. **Digital Khata & Billing Engine**:
   - Authoritative credit ledger, inventory tracking, POS billing, and optical invoice scanning.

---

## 📁 Repository Structure

```
DukaanSaathi/
├── .env.example                     # Environment variables template
├── docs/
│   ├── VOICE_ARCHITECTURE.md        # Voice session & audio pipeline architecture
│   ├── AI_TOOLS.md                  # Controlled backend business tools
│   └── PAYMENT_VERIFICATION.md      # Payment verification & UPI webhook spec
├── backend/                         # Spring Boot 3.3.4 (Java 21)
│   ├── src/main/java/com/dukaanai/backend/
│   │   ├── config/                  # WebSocket & security configuration
│   │   ├── controller/              # REST & Webhook controllers
│   │   ├── dto/                     # Data transfer objects
│   │   ├── entity/                  # JPA entities
│   │   ├── repository/              # Spring Data JPA repositories
│   │   ├── security/                # JWT & authentication filters
│   │   ├── service/                 # Authoritative business & AI services
│   │   └── websocket/               # VoiceSessionHandler (Gemini Live bridge)
│   └── src/test/                    # Automated test suite (100% pass)
└── Frontend/                        # React 19 + TypeScript + Vite 8
    ├── src/
    │   ├── api/                     # REST API clients
    │   ├── components/              # Navigation, Header, UI components
    │   ├── context/                 # Auth context
    │   ├── hooks/                   # useVoiceSession (Web Audio & WebSocket)
    │   ├── i18n/                    # 11 Indian language translations
    │   └── pages/                   # AIAssistant, Dashboard, Sales, Khata, etc.
    └── package.json
```

---

## 🛠️ Getting Started

### Prerequisites
- **Java 21**
- **Node.js 20+**
- (Optional) **Gemini API Key** with Gemini Live API access

### 1. Backend Setup

```bash
cd backend

# Run the backend (defaults to Dev profile with in-memory / persistent file DB)
./mvnw spring-boot:run
```

The Spring Boot backend will start on `http://localhost:8080`.

### 2. Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will run on `http://localhost:5173`.

---

## 🧪 Testing

Run the full automated test suite covering authoritative pricing, stock validation, UPI webhooks, idempotency, and zero-dummy-data guarantees:

```bash
cd backend
./mvnw test
```

---

## 🔒 Security Model

- `GEMINI_API_KEY` is strictly held on the backend and is **never** sent to the client browser.
- All WebSocket connections (`/ws/voice-assistant`) require a cryptographically verified JWT token.
- Multi-tenant data isolation ensures a shopkeeper can only query and modify their own shop's data.
