import { useState } from 'react';
import { useApp, fmt, fmtDate } from '../store';
import { Button, Card, SectionHeader, Badge } from '../components/ui';

export default function Payments() {
  const { sales, navigate } = useApp();
  const [showSimulator, setShowSimulator] = useState(false);
  const [simAmount, setSimAmount] = useState('300');
  const [simExpected, setSimExpected] = useState('340');
  const [simMode, setSimMode] = useState<'cash' | 'upi' | 'card'>('upi');
  const [simResult, setSimResult] = useState<null | { outstanding: number; received: number }>(null);
  const { showToast } = useApp();

  const receivedSales = sales.filter(s => s.received > 0);
  const totalReceived = receivedSales.reduce((a, s) => a + s.received, 0);
  const totalOutstanding = sales.reduce((a, s) => a + s.outstanding, 0);

  function handleSimulate() {
    const received = parseFloat(simAmount);
    const expected = parseFloat(simExpected);
    setSimResult({ received, outstanding: Math.max(0, expected - received) });
  }

  return (
    <div className="max-w-[900px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader
        title="Payments"
        action={
          <Button variant="secondary" size="sm" onClick={() => setShowSimulator(!showSimulator)}>
            Demo tool
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="md">
          <p className="text-sm text-[#9CA3AF] font-medium">Total received today</p>
          <p className="text-[32px] font-semibold text-[#16A34A] leading-none mt-2">{fmt(totalReceived)}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-[#9CA3AF] font-medium">Total outstanding</p>
          <p className="text-[32px] font-semibold text-[#D97706] leading-none mt-2">{fmt(totalOutstanding)}</p>
        </Card>
      </div>

      {/* Payment simulator */}
      {showSimulator && (
        <div className="border-2 border-dashed border-[#E5E7EB] rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="warning">Demo tool</Badge>
            <h3 className="text-sm font-semibold text-[#374151]">Payment Simulator</h3>
          </div>
          <p className="text-xs text-[#9CA3AF] mb-4">This is a demo tool for testing payment flows. It does not connect to any real payment provider.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-[#374151] block mb-1.5">Expected amount (₹)</label>
              <input type="number" value={simExpected} onChange={e => setSimExpected(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-[8px] text-sm px-3 py-2 focus:outline-none focus:border-[#4338CA]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#374151] block mb-1.5">Received amount (₹)</label>
              <input type="number" value={simAmount} onChange={e => setSimAmount(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-[8px] text-sm px-3 py-2 focus:outline-none focus:border-[#4338CA]" />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-[#374151]">Payment method</span>
            {(['cash', 'upi', 'card'] as const).map(m => (
              <button key={m} onClick={() => setSimMode(m)}
                className={`px-3 py-1 rounded-[6px] text-xs font-medium border cursor-pointer uppercase transition-colors
                  ${simMode === m ? 'bg-[#4338CA] text-white border-[#4338CA]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#C7D2FE]'}`}>
                {m}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleSimulate}>Process payment</Button>
          {simResult && (
            <div className="mt-4 p-4 bg-[#F7F8FA] rounded-[10px]">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={simResult.outstanding > 0 ? 'warning' : 'success'}>
                  {simResult.outstanding > 0 ? 'Partial payment' : 'Full payment'}
                </Badge>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-[#6B7280]">Received</span><span className="text-[#16A34A] font-medium">{fmt(simResult.received)}</span></div>
                {simResult.outstanding > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Outstanding</span><span className="text-[#D97706] font-medium">{fmt(simResult.outstanding)}</span></div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent payments */}
      <Card padding="none">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F3F4F6]">
          <h3 className="text-sm font-semibold text-[#374151]">Recent payments</h3>
        </div>
        <div className="divide-y divide-[#F7F8FA]">
          {receivedSales.map(sale => (
            <button
              key={sale.id}
              onClick={() => navigate('sale-detail', { selectedSaleId: sale.id })}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#F7F8FA] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#111827]">{sale.customer}</p>
                  <Badge variant={sale.status === 'paid' ? 'success' : 'warning'}>
                    {sale.status === 'paid' ? 'Full' : 'Partial'}
                  </Badge>
                  <span className="text-xs text-[#9CA3AF] uppercase">{sale.paymentMode}</span>
                </div>
                <p className="text-xs text-[#9CA3AF]">{sale.items.map(i => `${i.product} ${i.quantity}${i.unit}`).join(', ')} · {fmtDate(sale.date)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-[#16A34A]">{fmt(sale.received)}</p>
                {sale.outstanding > 0 && <p className="text-xs text-[#D97706]">{fmt(sale.outstanding)} due</p>}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
