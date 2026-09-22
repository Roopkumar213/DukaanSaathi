import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../store';
import { Button } from '../components/ui';
import { aiApi, NaturalSaleParseResponse } from '../api/aiApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: string;
  action?: { label: string; page: string };
  error?: boolean;
  failedQuery?: string;
  parsedSale?: NaturalSaleParseResponse;
}

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

const LOCALIZED_SUGGESTIONS: Record<string, string[]> = {
  en: [
    'How much rice is left?',
    'Who owes me money?',
    'How much did I sell today?',
    'Which products are low in stock?',
    'Ramesh ki 2 kilo rice icha 340 rupees',
  ],
  hi: [
    'चावल कितना बचा है?',
    'किसका उधार बाकी है?',
    'आज की कमाई कितनी हुई?',
    'कौन सा सामान कम है?',
    'रमेश को 2 किलो चावल दिया 340 रुपये',
  ],
  te: [
    'బియ్యం ఎంత ఉంది?',
    'ఎవరి వద్ద అప్పు బాకీ ఉంది?',
    'ఈరోజు ఎంత అమ్మకం జరిగింది?',
    'ఏ సరుకులు తక్కువగా ఉన్నాయి?',
    'రమేష్ కి 2 కిలోల బియ్యం ఇచ్చా 340 రూపాయలు',
  ],
  ta: [
    'அரிசி எவ்வளவு உள்ளது?',
    'யார் கடன் வைத்துள்ளார்கள்?',
    'இன்று விற்பனை எவ்வளவு?',
    'எந்த பொருட்கள் குறைவாக உள்ளன?',
  ],
  kn: [
    'ಅಕ್ಕಿ ಎಷ್ಟು ಉಳಿದಿದೆ?',
    'ಯಾರು ಹಣ ಕೊಡಬೇಕು?',
    'ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಯಿತು?',
    'ಯಾವ ವಸ್ತುಗಳ ಸ್ಟಾಕ್ ಕಡಿಮೆಯಾಗಿದೆ?',
  ],
};

export default function AIAssistant() {
  const { t, i18n } = useTranslation();
  const { navigate, addSale, showToast } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'en';
  const suggestions = LOCALIZED_SUGGESTIONS[currentLang] || LOCALIZED_SUGGESTIONS['en'];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Real Browser Speech Recognition (Web Speech API)
  function handleToggleVoice() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('info', 'Voice recognition is not supported in this browser. Please type your question.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;

      // Match regional language code where possible
      const langCodes: Record<string, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        te: 'te-IN',
        ta: 'ta-IN',
        kn: 'kn-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        bn: 'bn-IN',
        pa: 'pa-IN',
      };
      recognition.lang = langCodes[currentLang] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        if (err.error === 'not-allowed') {
          showToast('error', 'Microphone access was denied. Please check your browser permissions.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
      showToast('error', 'Could not initialize microphone input.');
    }
  }

  async function handleSend(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: Message = { id: makeId(), role: 'user', text: q };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    try {
      // Direct call to authoritative Spring Boot AI query endpoint
      const res = await aiApi.query(q, currentLang);

      if (res.queryType === 'CREATE_SALE' && res.data) {
        setMessages(m => [
          ...m,
          {
            id: makeId(),
            role: 'assistant',
            text: res.reply,
            source: 'DukaanAI Natural Language Sale Parser',
            parsedSale: res.data as NaturalSaleParseResponse,
            action: res.actionLabel ? { label: res.actionLabel, page: res.actionPage || 'sales' } : undefined,
          },
        ]);
      } else {
        setMessages(m => [
          ...m,
          {
            id: makeId(),
            role: 'assistant',
            text: res.reply,
            source: 'DukaanAI Live Store Database',
            action: res.actionLabel ? { label: res.actionLabel, page: res.actionPage || 'inventory' } : undefined,
          },
        ]);
      }
    } catch (err: any) {
      console.error('AI Query failed:', err);
      setMessages(m => [
        ...m,
        {
          id: makeId(),
          role: 'assistant',
          text: "I couldn't process that request right now. Please try again.",
          source: 'Server Connection Error',
          error: true,
          failedQuery: q,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Section 19: User confirms sale before execution
  async function handleConfirmSale(parsed: NaturalSaleParseResponse) {
    setConfirmingSale(true);
    try {
      await addSale({
        customer: parsed.customerName,
        items: parsed.items.map(i => ({
          product: i.name,
          quantity: Number(i.quantity),
          unit: i.unit,
          price: Number(parsed.totalAmount) / (Number(i.quantity) || 1),
          total: Number(parsed.totalAmount),
        })),
        total: Number(parsed.totalAmount),
        received: Number(parsed.amountPaid),
        outstanding: Number(parsed.amountCredit),
        status: parsed.amountCredit > 0 ? (parsed.amountPaid > 0 ? 'partial' : 'credit') : 'paid',
        paymentMode: (parsed.paymentMode?.toLowerCase() === 'upi' ? 'upi' : 'cash') as any,
      });

      setMessages(m => [
        ...m,
        {
          id: makeId(),
          role: 'assistant',
          text: `Sale recorded successfully for ${parsed.customerName}! Your inventory and Khata ledger have been updated.`,
          source: 'Authoritative Backend Transaction Committed',
          action: { label: 'View in Sales Ledger', page: 'sales' },
        },
      ]);
      showToast('success', 'Sale recorded to database!');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to record sale');
    } finally {
      setConfirmingSale(false);
    }
  }

  return (
    <div className="max-w-[780px] mx-auto p-4 sm:p-6 flex flex-col h-[calc(100vh-64px)]">
      {/* Contextual Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E40AF]">Kirana Assistant</span>
            <span className="text-xs text-[#94A3B8]">/</span>
            <span className="text-xs text-[#64748B]">Real Database Grounding</span>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] mt-0.5">DukaanAI Shop Assistant</h1>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-[#64748B] hover:text-[#B91C1C] hover:underline cursor-pointer flex items-center gap-1"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center my-auto py-10">
            <div className="w-12 h-12 rounded-[10px] bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="max-w-md">
              <p className="text-base font-semibold text-[#0F172A]">Ask anything about your store</p>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                Queries are answered directly from your store database. You can check stock quantities, debtor dues, today's sales, or dictate sales in natural language.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-w-lg pt-1">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="px-3.5 py-2 rounded-[6px] text-xs font-medium bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#1E40AF] hover:text-[#1E40AF] hover:bg-[#EFF6FF]/40 transition-colors cursor-pointer text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-[6px] bg-[#0F172A] flex items-center justify-center text-white mr-2.5 mt-1 flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            )}

            <div className={`max-w-[540px] ${msg.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-[8px] px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#1E40AF] text-white'
                    : msg.error
                      ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                      : 'bg-white border border-[#E2E8F0] text-[#0F172A]'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {/* Section 19: Structured Sale Review Card */}
                {msg.parsedSale && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex flex-col gap-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Sale Confirmation Required:
                    </p>
                    <div className="bg-[#F8F9FA] rounded-[6px] p-3 border border-[#E2E8F0] text-xs flex flex-col gap-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Customer</span>
                        <span className="font-semibold text-[#0F172A]">{msg.parsedSale.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Product Items</span>
                        <span className="font-semibold text-[#0F172A] text-right">
                          {msg.parsedSale.items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Total Amount</span>
                        <span className="font-semibold text-[#0F172A]">₹{msg.parsedSale.totalAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Amount Received</span>
                        <span className="font-semibold text-[#15803D]">₹{msg.parsedSale.amountPaid}</span>
                      </div>
                      {msg.parsedSale.amountCredit > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Outstanding Credit</span>
                          <span className="font-semibold text-[#B45309]">₹{msg.parsedSale.amountCredit}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={confirmingSale}
                        onClick={() => handleConfirmSale(msg.parsedSale!)}
                        className="flex-1"
                      >
                        Confirm Sale
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate('sales')}
                        className="flex-1"
                      >
                        Edit in Sales
                      </Button>
                    </div>
                  </div>
                )}

                {/* Retry Button on Error */}
                {msg.error && msg.failedQuery && (
                  <div className="mt-2 pt-2 border-t border-[#FDE68A] flex justify-end">
                    <button
                      onClick={() => handleSend(msg.failedQuery)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#92400E] bg-white border border-[#FDE68A] rounded hover:bg-[#FEF3C7] transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Source & Action Links */}
              {msg.role === 'assistant' && msg.source && (
                <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-[#94A3B8]">
                  <span>{msg.source}</span>
                  {msg.action && !msg.error && (
                    <button
                      onClick={() => navigate(msg.action!.page as any)}
                      className="text-xs text-[#1E40AF] hover:underline font-medium cursor-pointer flex items-center gap-0.5"
                    >
                      {msg.action.label} →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center gap-2.5 animate-slide-up">
            <div className="w-7 h-7 rounded-[6px] bg-[#0F172A] flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 flex items-center gap-2 text-xs text-[#64748B]">
              <span className="w-2 h-2 rounded-full bg-[#1E40AF] animate-ping" />
              <span>DukaanAI is checking store records...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Voice Status Pill */}
      {isListening && (
        <div className="mb-2 p-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] flex items-center justify-between text-xs text-[#1E40AF] animate-fade-in">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
            Listening to your speech in real-time... Speak your question.
          </span>
          <button
            type="button"
            onClick={handleToggleVoice}
            className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
          >
            Stop
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="border border-[#CBD5E1] rounded-[10px] bg-white flex items-end gap-2 p-2.5 focus-within:border-[#1E40AF] focus-within:ring-1 focus-within:ring-[#1E40AF] transition-all">
        <textarea
          value={input}
          disabled={loading}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about your shop, or enter a sale (e.g. Ramesh 2kg rice 120 rs)..."
          rows={1}
          className="flex-1 text-sm text-[#0F172A] bg-transparent outline-none resize-none px-2 py-1 placeholder-[#94A3B8] leading-relaxed max-h-28"
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Real speech recognition button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            title={isListening ? 'Stop listening' : 'Start voice input (Speech-to-Text)'}
            className={`w-8 h-8 flex items-center justify-center rounded-[6px] transition-colors cursor-pointer ${
              isListening
                ? 'bg-[#FEE2E2] text-[#DC2626] animate-pulse'
                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E40AF]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 bg-[#1E40AF] text-white rounded-[6px] flex items-center justify-center hover:bg-[#1D4ED8] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L2 7l5 2 2 5L14 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
