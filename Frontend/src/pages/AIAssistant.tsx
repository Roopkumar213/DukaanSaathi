import { useState, useRef, useEffect } from 'react';
import { useApp, fmt } from '../store';
import { Button, Card } from '../components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: string;
  action?: { label: string; page: string };
  error?: boolean;
}

function makeId() { return Math.random().toString(36).slice(2, 7); }

const suggestions = [
  'How much rice is left?',
  'Who owes me money?',
  'How much did I sell today?',
  'Which products are low in stock?',
  'What is Ramesh\'s balance?',
  'How many transactions today?',
];

export default function AIAssistant() {
  const { products, customers, sales, navigate } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getAnswer(q: string): Omit<Message, 'id' | 'role'> {
    const lq = q.toLowerCase();

    // Rice stock
    if (lq.includes('rice')) {
      const rice = products.find(p => p.name.toLowerCase() === 'rice');
      if (rice) return { text: `You currently have ${rice.quantity} ${rice.unit} of rice.`, source: 'Based on current inventory', action: { label: 'Open Inventory', page: 'inventory' } };
    }

    // Owes money / outstanding / khata
    if (lq.includes('owe') || lq.includes('outstanding') || lq.includes('khata') || lq.includes('credit') || lq.includes('balance')) {
      const withBalance = customers.filter(c => c.balance > 0);
      if (withBalance.length === 0) return { text: 'No customers have outstanding balances right now.', source: 'Based on Khata records' };
      const total = withBalance.reduce((a, c) => a + c.balance, 0);
      const list = withBalance.slice(0, 4).map(c => `${c.name} (${fmt(c.balance)})`).join(', ');
      return {
        text: `${withBalance.length} customers owe you a total of ${fmt(total)}. ${list}${withBalance.length > 4 ? ` and ${withBalance.length - 4} more` : ''}.`,
        source: 'Based on Khata records',
        action: { label: 'Open Khata', page: 'khata' },
      };
    }

    // Today's sales
    if (lq.includes('today') || lq.includes('sell today') || lq.includes('sold today') || lq.includes('sales today')) {
      const today = new Date();
      const todaySales = sales.filter(s => s.date.getDate() === today.getDate() && s.date.getMonth() === today.getMonth());
      const total = todaySales.reduce((a, s) => a + s.received, 0);
      return {
        text: `You've made ${todaySales.length} sales today, receiving ${fmt(total)}.`,
        source: 'Based on today\'s sales',
        action: { label: 'Open Sales', page: 'sales' },
      };
    }

    // Low stock
    if (lq.includes('low') || lq.includes('stock') || lq.includes('running out')) {
      const low = products.filter(p => p.quantity <= p.minStock);
      if (low.length === 0) return { text: 'All products are above their minimum stock levels.', source: 'Based on inventory' };
      return {
        text: `${low.length} product${low.length > 1 ? 's are' : ' is'} low on stock: ${low.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ')}.`,
        source: 'Based on current inventory',
        action: { label: 'Open Inventory', page: 'inventory' },
      };
    }

    // Specific customer
    const customer = customers.find(c => lq.includes(c.name.toLowerCase()));
    if (customer) {
      return {
        text: customer.balance > 0
          ? `${customer.name} has an outstanding balance of ${fmt(customer.balance)}.`
          : `${customer.name}'s account is clear — no outstanding balance.`,
        source: 'Based on Khata records',
        action: { label: `View ${customer.name}'s Khata`, page: 'khata' },
      };
    }

    // Specific product
    const product = products.find(p => lq.includes(p.name.toLowerCase()));
    if (product) {
      return {
        text: `You have ${product.quantity} ${product.unit} of ${product.name} in stock, priced at ${fmt(product.price)}/${product.unit}.`,
        source: 'Based on current inventory',
        action: { label: 'Open Inventory', page: 'inventory' },
      };
    }

    // Total products
    if (lq.includes('product') || lq.includes('inventory')) {
      return {
        text: `Your inventory has ${products.length} products. Total stock value is roughly ${fmt(products.reduce((a, p) => a + p.quantity * p.price, 0))}.`,
        source: 'Based on inventory',
        action: { label: 'Open Inventory', page: 'inventory' },
      };
    }

    // Transactions
    if (lq.includes('transaction') || lq.includes('sale')) {
      return {
        text: `You have recorded ${sales.length} sales in total, with a combined value of ${fmt(sales.reduce((a, s) => a + s.total, 0))}.`,
        source: 'Based on sales records',
        action: { label: 'Open Sales', page: 'sales' },
      };
    }

    return {
      text: "I couldn't answer that from your shop data.",
      source: "Try asking about sales, inventory, payments or Khata.",
      error: true,
    };
  }

  function handleSend(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: Message = { id: makeId(), role: 'user', text: q };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const answer = getAnswer(q);
      setMessages(m => [...m, { id: makeId(), role: 'assistant', ...answer }]);
      setLoading(false);
    }, 900 + Math.random() * 600);
  }

  return (
    <div className="max-w-[760px] mx-auto p-6 flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold text-[#111827] leading-tight">Ask DukaanAI</h1>
        <p className="text-[#6B7280] mt-1">Ask questions about the information recorded in your shop.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center">
            <div className="w-14 h-14 rounded-[16px] bg-[#EEF2FF] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 3l2.4 7.6L24 13l-7.6 2.4L14 23l-2.4-7.6L4 13l7.6-2.4L14 3z" stroke="#4338CA" strokeWidth="1.6" strokeLinejoin="round" fill="#C7D2FE" fillOpacity="0.4"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#374151]">Ask your first question</p>
              <p className="text-sm text-[#9CA3AF] mt-1">DukaanAI answers using your recorded shop data.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 rounded-full text-sm bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#4338CA] hover:text-[#4338CA] transition-colors cursor-pointer"
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
              <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] mr-2.5 mt-0.5 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5l1.2 3.8L12 7 8.2 8.2 7 12 5.8 8.2 2 7l3.8-1.2L7 1.5z" fill="#4338CA" opacity="0.7"/>
                </svg>
              </div>
            )}
            <div className={`max-w-[480px] ${msg.role === 'user' ? 'order-first' : ''}`}>
              <div className={`rounded-[14px] px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#4338CA] text-white rounded-br-[4px]'
                  : msg.error
                    ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] rounded-bl-[4px]'
                    : 'bg-white border border-[#E5E7EB] text-[#111827] rounded-bl-[4px]'
              }`}>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
              {msg.role === 'assistant' && msg.source && (
                <div className="mt-1.5 flex items-center gap-2 px-1">
                  <p className="text-xs text-[#9CA3AF]">{msg.source}</p>
                  {msg.action && !msg.error && (
                    <button
                      onClick={() => navigate(msg.action!.page as any)}
                      className="text-xs text-[#4338CA] hover:underline font-medium"
                    >
                      {msg.action.label} →
                    </button>
                  )}
                  {msg.error && (
                    <button
                      onClick={() => setMessages([])}
                      className="text-xs text-[#4338CA] hover:underline font-medium"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 animate-slide-up">
            <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.2 3.8L12 7 8.2 8.2 7 12 5.8 8.2 2 7l3.8-1.2L7 1.5z" fill="#4338CA" opacity="0.7"/></svg>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1">
              <span className="text-xs text-[#9CA3AF] mr-1.5">Checking your shop data</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7D2FE] dot-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7D2FE] dot-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7D2FE] dot-3" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips (when chat has started) */}
      {messages.length > 0 && messages.length < 3 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {suggestions.slice(0, 3).map(s => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="px-2.5 py-1 rounded-full text-xs bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#4338CA] hover:text-[#4338CA] transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border border-[#E5E7EB] rounded-[14px] bg-white flex items-end gap-2 p-2 shadow-sm">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask about your shop…"
          rows={1}
          className="flex-1 text-sm text-[#111827] bg-transparent outline-none resize-none px-2 py-1.5 placeholder-[#9CA3AF] leading-relaxed max-h-28"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button className="w-9 h-9 flex items-center justify-center rounded-[10px] text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#4338CA] transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="7" y="2" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M4 8v1a5 5 0 0 0 10 0V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M9 13v3M7 16h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 bg-[#4338CA] text-white rounded-[10px] flex items-center justify-center hover:bg-[#3730A3] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L2 7l5 2 2 5L14 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
