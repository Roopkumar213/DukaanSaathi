import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../store';
import { useVoiceSession, VoiceState } from '../hooks/useVoiceSession';

interface SuggestedPrompt {
  label: string;
  query: string;
  category: string;
}

const LANGUAGE_PROMPTS: Record<string, SuggestedPrompt[]> = {
  te: [
    { label: 'రమేష్ కి 1 kg బియ్యం అమ్మాను', query: 'రమేష్ కి 1 kg బియ్యం అమ్మాను', category: 'sale' },
    { label: 'బియ్యం ఎంత స్టాక్ ఉంది?', query: 'బియ్యం ఎంత స్టాక్ ఉంది?', category: 'stock' },
    { label: 'రమేష్ ఎంత బాకీ ఉన్నాడు?', query: 'రమేష్ ఎంత బాకీ ఉన్నాడు?', category: 'khata' },
    { label: 'ఈరోజు అమ్మకాలు ఎంత?', query: 'ఈరోజు అమ్మకాలు ఎంత?', category: 'sales' },
  ],
  hi: [
    { label: 'रमेश को 1 किलो चावल बेचा', query: 'रमेश को 1 किलो चावल बेचा', category: 'sale' },
    { label: 'चावल का कितना स्टॉक बचा है?', query: 'चावल का कितना स्टॉक बचा है?', category: 'stock' },
    { label: 'रमेश पर कितना उधार बाकी है?', query: 'रमेश पर कितना उधार बाकी है?', category: 'khata' },
    { label: 'आज की कुल कमाई कितनी हुई?', query: 'आज की कुल कमाई कितनी हुई?', category: 'sales' },
  ],
  ta: [
    { label: 'ரமேஷிற்கு 1 கிலோ அரிசி விற்றேன்', query: 'ரமேஷிற்கு 1 கிலோ அரிசி விற்றேன்', category: 'sale' },
    { label: 'அரிசி இருப்பு எவ்வளவு உள்ளது?', query: 'அரிசி இருப்பு எவ்வளவு உள்ளது?', category: 'stock' },
    { label: 'ரமேஷ் எவ்வளவு கடன் பாக்கி வைத்துள்ளார்?', query: 'ரமேஷ் எவ்வளவு கடன் பாக்கி வைத்துள்ளார்?', category: 'khata' },
    { label: 'இன்றைய விற்பனை எவ்வளவு?', query: 'இன்றைய விற்பனை எவ்வளவு?', category: 'sales' },
  ],
  kn: [
    { label: 'ರಮೇಶ್‌ಗೆ 1 ಕೆಜಿ ಅಕ್ಕಿ ಮಾರಾಟ ಮಾಡಿದೆ', query: 'ರಮೇಶ್‌ಗೆ 1 ಕೆಜಿ ಅಕ್ಕಿ ಮಾರಾಟ ಮಾಡಿದೆ', category: 'sale' },
    { label: 'ಅಕ್ಕಿ ಎಷ್ಟು ಸ್ಟಾಕ್ ಉಳಿದಿದೆ?', query: 'ಅಕ್ಕಿ ಎಷ್ಟು ಸ್ಟಾಕ್ ಉಳಿದಿದೆ?', category: 'stock' },
    { label: 'ರಮೇಶ್ ಎಷ್ಟು ಸಾಲ ಬಾಕಿ ಉಳಿಸಿಕೊಂಡಿದ್ದಾರೆ?', query: 'ರಮೇಶ್ ಎಷ್ಟು ಸಾಲ ಬಾಕಿ ಉಳಿಸಿಕೊಂಡಿದ್ದಾರೆ?', category: 'khata' },
    { label: 'ಇಂದಿನ ಒಟ್ಟು ಮಾರಾಟ ಎಷ್ಟು?', query: 'ಇಂದಿನ ಒಟ್ಟು ಮಾರಾಟ ಎಷ್ಟು?', category: 'sales' },
  ],
  en: [
    { label: 'Sold 1 kg rice to Ramesh', query: 'Sold 1 kg rice to Ramesh', category: 'sale' },
    { label: 'How much rice is left?', query: 'How much rice is left?', category: 'stock' },
    { label: 'Who owes me money?', query: 'Who owes me money?', category: 'khata' },
    { label: 'How much did I sell today?', query: 'How much did I sell today?', category: 'sales' },
  ],
};

export default function AIAssistant() {
  const { t, i18n } = useTranslation();
  const { navigate } = useApp();
  const currentLang = i18n.language ? i18n.language.substring(0, 2) : 'en';

  const {
    state,
    transcript,
    spokenReply,
    pendingSale,
    saleSuccessMessage,
    errorMessage,
    shopVocabulary,
    connect,
    startListening,
    stopListening,
    sendTextCommand,
    confirmSale,
    cancelSale,
    interruptSpeaking,
  } = useVoiceSession();

  const [textInput, setTextInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(currentLang);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const prompts = LANGUAGE_PROMPTS[selectedLanguage] || LANGUAGE_PROMPTS.en;

  const handleMicClick = () => {
    if (state === 'SPEAKING') {
      interruptSpeaking();
      return;
    }
    if (state === 'LISTENING') {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendTextCommand(textInput.trim(), selectedLanguage);
    setTextInput('');
  };

  const handlePromptClick = (query: string) => {
    sendTextCommand(query, selectedLanguage);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Top Bar / Header */}
      <div className="border-b border-[#E2E8F0] bg-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0F172A] flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0F172A]">DukaanSaathi</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]">
                Voice Operating Assistant
              </span>
            </div>
            <p className="text-xs text-[#64748B]">Your shop, just talk &bull; Multilingual real-time voice &amp; sales billing</p>
          </div>
        </div>

        {/* State Indicator Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F1F5F9] text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'LISTENING'
                  ? 'bg-[#10B981] animate-pulse'
                  : state === 'SPEAKING'
                  ? 'bg-[#3B82F6] animate-pulse'
                  : state === 'PROCESSING'
                  ? 'bg-[#F59E0B] animate-spin'
                  : state === 'CONFIRMATION_REQUIRED'
                  ? 'bg-[#F97316]'
                  : state === 'READY'
                  ? 'bg-[#10B981]'
                  : 'bg-[#94A3B8]'
              }`}
            />
            <span className="font-medium text-[#334155]">
              {state === 'LISTENING' && 'Listening to you...'}
              {state === 'SPEAKING' && 'DukaanSaathi Speaking'}
              {state === 'PROCESSING' && 'Checking shop records...'}
              {state === 'CONFIRMATION_REQUIRED' && 'Confirmation Required'}
              {state === 'READY' && 'Voice Assistant Ready'}
              {state === 'CONNECTING' && 'Connecting...'}
              {state === 'DISCONNECTED' && 'Disconnected'}
              {state === 'ERROR' && 'Connection Issue'}
            </span>
          </div>

          {state === 'DISCONNECTED' && (
            <button
              onClick={connect}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-[#0F172A] text-white hover:bg-[#1E293B]"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Main Assistant Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
        {/* Language Selection Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-lg border border-[#E2E8F0]">
          <span className="text-xs font-medium text-[#64748B] px-2">Spoken Language:</span>
          {[
            { code: 'te', label: 'తెలుగు' },
            { code: 'hi', label: 'हिन्दी' },
            { code: 'en', label: 'English' },
            { code: 'ta', label: 'தமிழ்' },
            { code: 'kn', label: 'ಕನ್ನಡ' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                selectedLanguage === lang.code
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-transparent text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Central Voice Command Panel */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-wider text-[#64748B] font-semibold mb-3">
            Natural Voice Command
          </p>
          <p className="text-base text-[#0F172A] max-w-lg font-medium mb-6">
            Say what you sold or ask about your shop naturally in your own language.
            <br />
            <span className="text-xs text-[#64748B] font-normal">
              Example: &ldquo;Ramesh ki 1 kg rice ammanu&rdquo; or &ldquo;How much rice is left?&rdquo;
            </span>
          </p>

          {/* Clean Mic Button (Restrained Kirana Aesthetic, No Purple AI Orbs) */}
          <div className="relative flex items-center justify-center mb-4">
            <button
              onClick={handleMicClick}
              aria-label={state === 'LISTENING' ? 'Stop listening' : 'Start speaking'}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                state === 'LISTENING'
                  ? 'bg-[#EF4444] text-white shadow-lg ring-4 ring-red-100 scale-105'
                  : state === 'SPEAKING'
                  ? 'bg-[#3B82F6] text-white ring-4 ring-blue-100'
                  : 'bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-sm'
              }`}
            >
              {state === 'LISTENING' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
                </svg>
              ) : state === 'SPEAKING' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-xs font-semibold text-[#334155]">
            {state === 'LISTENING' && 'Tap to stop & process'}
            {state === 'SPEAKING' && 'Assistant speaking • Tap to interrupt'}
            {state === 'PROCESSING' && 'Checking database records...'}
            {state === 'READY' && 'Tap microphone to speak'}
          </p>

          {/* Active Transcript */}
          {transcript && (
            <div className="mt-4 w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">You said:</span>
              <p className="text-sm font-semibold text-[#0F172A] mt-0.5">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}

          {/* Spoken Reply Text */}
          {spokenReply && (
            <div className="mt-2 w-full bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#15803D]">DukaanSaathi:</span>
              <p className="text-sm text-[#14532D] mt-0.5">{spokenReply}</p>
            </div>
          )}
        </div>

        {/* Section 19: Visual Confirmation Card */}
        {pendingSale && (
          <div className="bg-white rounded-xl border-2 border-[#F97316] shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#FED7AA] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                <h2 className="text-base font-bold text-[#9A3412]">Review &amp; Confirm Sale</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-[#FFEDD5] text-[#9A3412] font-semibold">
                Pending Merchant Confirmation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block">Customer</span>
                <span className="text-sm font-bold text-[#0F172A]">{pendingSale.customerName}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Payment Mode &amp; Verification</span>
                <span className="text-sm font-semibold text-[#0F172A]">
                  {pendingSale.paymentMode} ({pendingSale.verificationStatus})
                </span>
                {pendingSale.verificationNotes && (
                  <p className="text-[11px] text-[#C2410C] mt-0.5">{pendingSale.verificationNotes}</p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {pendingSale.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-2 font-medium text-[#0F172A]">{item.productName}</td>
                      <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold font-mono">₹{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Split */}
            <div className="bg-[#FFF7ED] p-3.5 rounded-lg border border-[#FFEDD5] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#9A3412]">Total Bill Amount:</span>
                <div className="text-xs text-[#78350F] mt-0.5">
                  Paid: ₹{pendingSale.amountPaid.toFixed(2)} &bull; Khata Credit: ₹{pendingSale.amountCredit.toFixed(2)}
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-[#9A3412]">₹{pendingSale.totalAmount.toFixed(2)}</span>
            </div>

            {/* Confirmation Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => cancelSale(pendingSale.draftId)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('sales')}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
              >
                Edit in Sales
              </button>
              <button
                onClick={() => confirmSale(pendingSale.draftId)}
                className="text-xs font-bold px-5 py-2 rounded-lg bg-[#0F172A] text-white hover:bg-[#1E293B] shadow"
              >
                Confirm Sale (Avunu / Yes)
              </button>
            </div>
          </div>
        )}

        {/* Sale Success Notification */}
        {saleSuccessMessage && (
          <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#166534]">Sale Finalized Successfully</h3>
                <p className="text-xs text-[#15803D] mt-0.5">{saleSuccessMessage}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('sales')}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-[#166534] text-white hover:bg-[#14532D]"
            >
              View in Sales
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EF4444] flex items-center justify-center text-white font-bold">
              !
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#991B1B]">Voice Request</h3>
              <p className="text-xs text-[#B91C1C] mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Suggested Spoken Phrases Chips */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] block mb-2">
            Try speaking or tapping these shop queries:
          </span>
          <div className="flex flex-wrap gap-2">
            {prompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(p.query)}
                className="text-xs text-left px-3.5 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#94A3B8] text-[#334155] hover:bg-[#F8FAFC] transition shadow-xs flex items-center gap-2"
              >
                <span>&ldquo;{p.label}&rdquo;</span>
              </button>
            ))}
          </div>
        </div>

        {/* Shop Specific Vocabulary Tags */}
        {shopVocabulary.length > 0 && (
          <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] text-xs">
            <span className="text-[#64748B] font-semibold block mb-1.5">
              Live Shop Vocabulary (Grounded in Database):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {shopVocabulary.slice(0, 15).map((term, i) => (
                <span key={i} className="px-2 py-0.5 bg-[#F1F5F9] rounded text-[11px] text-[#475569]">
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Text Fallback Input */}
      <div className="border-t border-[#E2E8F0] bg-white px-4 md:px-8 py-3">
        <form onSubmit={handleSendText} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your request or speak above (e.g., 'Ramesh ki 1 kg rice ammanu')..."
            className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#0F172A] text-white hover:bg-[#1E293B] disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
