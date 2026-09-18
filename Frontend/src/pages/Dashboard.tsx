import { useState } from 'react';
import { useApp, fmt, fmtDate } from '../store';
import { Button, Card, KPICard, Badge, StatusBadge, Modal, EditableField, ConfirmModal } from '../components/ui';

// ── Icons ────────────────────────────────────────────────────────────────────
function SalesIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9l5 5 9-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function KhataIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4"/><path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function AlertIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l7.5 13.5H1.5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9 8v3M9 13.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function PaymentIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2 9h14" stroke="currentColor" strokeWidth="1.3"/><circle cx="13.5" cy="12" r="1" fill="currentColor"/><path d="M5 3h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function MicIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M5 10v2a7 7 0 0 0 14 0v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'review' | 'confirm' | 'success';

interface SaleReview {
  customer: string;
  product: string;
  quantity: string;
  amount: string;
  payment: string;
}

export default function Dashboard() {
  const { sales, products, customers, navigate, addSale, showToast } = useApp();
  const [voiceModal, setVoiceModal] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [review, setReview] = useState<SaleReview>({ customer: 'Ramesh', product: 'Rice', quantity: '2 kg', amount: '340', payment: 'Partial / Credit' });
  const [confirming, setConfirming] = useState(false);
  const [newSaleId, setNewSaleId] = useState<string | null>(null);

  const todaySales = sales.filter(s => {
    const today = new Date();
    return s.date.getDate() === today.getDate();
  });
  const todayTotal = todaySales.reduce((a, s) => a + s.received, 0);
  const outstanding = customers.reduce((a, c) => a + c.balance, 0);
  const outstandingCount = customers.filter(c => c.balance > 0).length;
  const lowStock = products.filter(p => p.quantity <= p.minStock);
  const todayReceived = todaySales.reduce((a, s) => a + s.received, 0);

  function startListening() {
    setVoiceState('listening');
    setTimeout(() => {
      setVoiceState('processing');
      setTimeout(() => setVoiceState('review'), 1800);
    }, 2500);
  }

  function handleConfirmSale() {
    setConfirming(true);
    setTimeout(() => {
      const qty = parseFloat(review.quantity) || 2;
      const amount = parseFloat(review.amount) || 340;
      const received = review.payment.toLowerCase().includes('partial') ? Math.floor(amount * 0.88) : amount;
      const sale = addSale({
        customer: review.customer,
        items: [{ product: review.product, quantity: qty, unit: 'kg', price: amount / qty, total: amount }],
        total: amount,
        received,
        outstanding: amount - received,
        status: review.payment.toLowerCase().includes('partial') ? 'partial' : 'paid',
        paymentMode: 'cash',
      });
      setNewSaleId((sale as any)?.id || null);
      setVoiceState('success');
      setConfirming(false);
      showToast('success', 'Sale recorded successfully');
    }, 800);
  }

  function resetVoice() {
    setVoiceModal(false);
    setVoiceState('idle');
  }

  const recentSales = sales.slice(0, 4);

  return (
    <div className="max-w-[1200px] mx-auto p-6 flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[#111827] leading-tight tracking-tight">Overview</h1>
          <p className="text-[#6B7280] mt-1">A quick look at your shop today.</p>
        </div>
        <Button size="lg" onClick={() => { setVoiceState('idle'); setVoiceModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          New Sale
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Today's sales" value={fmt(todayTotal)} sub={`${todaySales.length} transactions`} icon={<SalesIcon />} accent="default" onClick={() => navigate('sales')} />
        <KPICard label="Outstanding Khata" value={fmt(outstanding)} sub={`${outstandingCount} customers`} icon={<KhataIcon />} accent="warning" onClick={() => navigate('khata')} />
        <KPICard label="Low stock" value={`${lowStock.length} products`} sub="Need restocking" icon={<AlertIcon />} accent={lowStock.length > 0 ? 'error' : 'success'} onClick={() => navigate('inventory')} />
        <KPICard label="Payments" value={fmt(todayReceived)} sub="received today" icon={<PaymentIcon />} accent="success" onClick={() => navigate('payments')} />
      </div>

      {/* Record sale + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Record sale - main action */}
        <Card className="lg:col-span-2 flex flex-col items-center justify-center gap-6 py-10 text-center" padding="lg">
          <div>
            <h3 className="text-[17px] font-semibold text-[#111827]">Record a sale</h3>
            <p className="text-sm text-[#6B7280] mt-1">Speak naturally or enter the sale manually.</p>
          </div>
          <button
            onClick={() => { setVoiceState('idle'); setVoiceModal(true); }}
            className="relative w-20 h-20 rounded-full bg-[#4338CA] text-white flex items-center justify-center shadow-lg hover:bg-[#3730A3] active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <MicIcon size={28} />
          </button>
          <div>
            <p className="text-sm font-medium text-[#374151]">Tap to speak</p>
            <button onClick={() => navigate('sales')} className="text-sm text-[#4338CA] hover:underline mt-1 block">or enter sale manually</button>
          </div>
        </Card>

        {/* Recent sales */}
        <Card className="lg:col-span-3" padding="none">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F3F4F6]">
            <h3 className="text-[15px] font-semibold text-[#111827]">Recent sales</h3>
            <button onClick={() => navigate('sales')} className="text-sm text-[#4338CA] hover:underline">View all</button>
          </div>
          <div className="divide-y divide-[#F7F8FA]">
            {recentSales.map(sale => (
              <button
                key={sale.id}
                onClick={() => navigate('sale-detail', { selectedSaleId: sale.id })}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#F7F8FA] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] text-xs font-semibold flex-shrink-0">
                  {sale.customer[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#111827] truncate">{sale.customer}</p>
                    <StatusBadge status={sale.status} />
                  </div>
                  <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                    {sale.items.map(i => `${i.product} ${i.quantity}${i.unit}`).join(', ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[#111827]">{fmt(sale.total)}</p>
                  <p className="text-xs text-[#9CA3AF]">{fmtDate(sale.date)}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-[#F3F4F6]">
            <button onClick={() => navigate('sales')} className="text-sm text-[#4338CA] hover:underline">See all {sales.length} sales →</button>
          </div>
        </Card>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card padding="none">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <h3 className="text-[15px] font-semibold text-[#111827]">Low stock alert</h3>
            </div>
            <button onClick={() => navigate('inventory')} className="text-sm text-[#4338CA] hover:underline">View inventory</button>
          </div>
          <div className="flex flex-wrap gap-3 p-5">
            {lowStock.map(p => (
              <button
                key={p.id}
                onClick={() => navigate('product-detail', { selectedProductId: p.id })}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] hover:border-[#F87171] transition-colors"
              >
                <span className="text-sm font-medium text-[#B91C1C]">{p.name}</span>
                <Badge variant="error">{p.quantity} {p.unit}</Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── Voice Modal ────────────────────────────────────────────────────── */}
      <Modal open={voiceModal} onClose={resetVoice} width="md">
        <div className="flex flex-col items-center text-center gap-6 py-4">
          {voiceState === 'idle' && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">Record Sale</h2>
                <p className="text-sm text-[#6B7280] mt-1.5">Tell DukaanAI what was sold.</p>
              </div>
              <div className="bg-[#F7F8FA] rounded-[12px] px-5 py-3 text-sm text-[#6B7280] italic border border-[#E5E7EB] w-full text-left">
                "Ramesh ki 2 kilo rice icha, 340 rupees."
              </div>
              <button
                onClick={startListening}
                className="relative w-24 h-24 rounded-full bg-[#4338CA] text-white flex items-center justify-center shadow-lg hover:bg-[#3730A3] active:scale-95 transition-all duration-150 cursor-pointer"
              >
                <MicIcon size={32} />
              </button>
              <p className="text-sm text-[#374151]">Tap to speak</p>
              <button onClick={resetVoice} className="text-sm text-[#6B7280] hover:text-[#374151]">or enter sale manually</button>
            </>
          )}

          {voiceState === 'listening' && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">Record Sale</h2>
                <p className="text-sm text-[#4338CA] mt-1.5 font-medium">Listening…</p>
              </div>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="pulse-ring absolute" />
                <div className="w-24 h-24 rounded-full bg-[#4338CA] flex items-center justify-center text-white shadow-lg relative z-10">
                  <MicIcon size={32} />
                </div>
              </div>
              {/* Waveform */}
              <div className="flex items-center gap-1 h-8">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="wave-bar w-1.5 rounded-full bg-[#C7D2FE]" style={{ height: 4 }} />
                ))}
              </div>
              <button onClick={resetVoice} className="text-sm text-[#6B7280] hover:text-[#374151]">Cancel</button>
            </>
          )}

          {voiceState === 'processing' && (
            <>
              <h2 className="text-xl font-semibold text-[#111827]">Understanding your sale…</h2>
              <div className="w-16 h-16 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4338CA] dot-1" />
                  <span className="w-2 h-2 rounded-full bg-[#4338CA] dot-2" />
                  <span className="w-2 h-2 rounded-full bg-[#4338CA] dot-3" />
                </div>
              </div>
              <p className="text-sm text-[#6B7280]">Checking your shop data…</p>
            </>
          )}

          {voiceState === 'review' && (
            <div className="w-full text-left">
              <div className="text-center mb-5">
                <h2 className="text-xl font-semibold text-[#111827]">Review sale</h2>
                <p className="text-xs text-[#9CA3AF] mt-1 uppercase tracking-wide font-medium">DukaanAI understood</p>
              </div>
              <div className="border border-[#E5E7EB] rounded-[12px] overflow-hidden">
                <EditableField label="Customer" value={review.customer} onChange={v => setReview(r => ({ ...r, customer: v }))} />
                <EditableField label="Product" value={review.product} onChange={v => setReview(r => ({ ...r, product: v }))} />
                <EditableField label="Quantity" value={review.quantity} onChange={v => setReview(r => ({ ...r, quantity: v }))} />
                <EditableField label="Amount" value={`₹${review.amount}`} onChange={v => setReview(r => ({ ...r, amount: v.replace('₹', '') }))} />
                <EditableField label="Payment" value={review.payment} onChange={v => setReview(r => ({ ...r, payment: v }))} />
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="secondary" className="flex-1" onClick={() => setVoiceState('idle')}>Edit</Button>
                <Button className="flex-1" onClick={handleConfirmSale} loading={confirming}>Confirm sale</Button>
              </div>
            </div>
          )}

          {voiceState === 'success' && (
            <>
              <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">Sale recorded</h2>
              </div>
              <div className="w-full bg-[#F7F8FA] rounded-[12px] p-4 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Customer</span>
                  <span className="text-sm font-medium text-[#111827]">{review.customer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">{review.product}</span>
                  <span className="text-sm font-medium text-[#111827]">× {review.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Total</span>
                  <span className="text-sm font-semibold text-[#111827]">₹{review.amount}</span>
                </div>
              </div>
              {/* Impact summary */}
              <div className="w-full border border-[#E5E7EB] rounded-[12px] p-4 space-y-2">
                <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-2">What changed</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Inventory</span>
                  <span className="text-[#374151]">{review.product} reduced</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Payment</span>
                  <span className="text-[#16A34A] font-medium">₹{Math.floor(parseFloat(review.amount) * 0.88)} received</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Khata</span>
                  <span className="text-[#D97706]">₹{Math.ceil(parseFloat(review.amount) * 0.12)} outstanding</span>
                </div>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="secondary" className="flex-1" onClick={resetVoice}>Done</Button>
                <Button className="flex-1" onClick={() => { resetVoice(); if (newSaleId) navigate('sale-detail', { selectedSaleId: newSaleId }); else navigate('sales'); }}>
                  View sale
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
