import { useState } from 'react';
import { useApp, fmt, fmtDate, Sale } from '../store';
import { Button, Card, StatusBadge, Badge, SectionHeader, Tabs, EmptyState } from '../components/ui';

type Filter = 'today' | 'week' | 'month' | 'all';

function filterSales(sales: Sale[], filter: Filter): Sale[] {
  const now = new Date();
  return sales.filter(s => {
    const d = s.date;
    if (filter === 'today') return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
    if (filter === 'week') return now.getTime() - d.getTime() < 7 * 86400000;
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

export default function Sales() {
  const { sales, navigate } = useApp();
  const [filter, setFilter] = useState<Filter>('today');
  const [showManual, setShowManual] = useState(false);

  const filtered = filterSales(sales, filter);
  const total = filtered.reduce((a, s) => a + s.total, 0);
  const received = filtered.reduce((a, s) => a + s.received, 0);
  const credit = filtered.reduce((a, s) => a + s.outstanding, 0);

  if (showManual) return <ManualSale onBack={() => setShowManual(false)} />;

  return (
    <div className="max-w-[1200px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader
        title="Sales"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowManual(true)}>Manual entry</Button>
            <Button onClick={() => navigate('overview')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              New Sale
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="sm">
          <p className="text-xs text-[#9CA3AF] font-medium">Sales total</p>
          <p className="text-2xl font-semibold text-[#111827] mt-1">{fmt(total)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#9CA3AF] font-medium">Transactions</p>
          <p className="text-2xl font-semibold text-[#111827] mt-1">{filtered.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#9CA3AF] font-medium">On credit</p>
          <p className="text-2xl font-semibold text-[#D97706] mt-1">{fmt(credit)}</p>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <Tabs
          tabs={[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'This month' },
            { id: 'all', label: 'All' },
          ]}
          active={filter}
          onChange={id => setFilter(id as Filter)}
        />
      </div>

      {/* Sales table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 10l6 6 10-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="No sales yet"
          description="Record your first sale to see it here."
          action={<Button onClick={() => navigate('overview')}>Record sale</Button>}
        />
      ) : (
        <Card padding="none">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[100px_1fr_1fr_100px_90px_90px] gap-4 px-5 py-3 border-b border-[#F3F4F6] text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">
            <span>Time</span>
            <span>Customer</span>
            <span>Items</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Received</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-[#F7F8FA]">
            {filtered.map(sale => (
              <button
                key={sale.id}
                onClick={() => navigate('sale-detail', { selectedSaleId: sale.id })}
                className="w-full hover:bg-[#F7F8FA] transition-colors text-left"
              >
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[100px_1fr_1fr_100px_90px_90px] gap-4 px-5 py-3.5 items-center">
                  <span className="text-sm text-[#6B7280]">{fmtDate(sale.date)}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] text-xs font-semibold flex-shrink-0">
                      {sale.customer[0]}
                    </div>
                    <span className="text-sm font-medium text-[#111827] truncate">{sale.customer}</span>
                  </div>
                  <span className="text-sm text-[#6B7280] truncate">
                    {sale.items.map(i => `${i.product} × ${i.quantity}${i.unit}`).join(', ')}
                  </span>
                  <span className="text-sm font-semibold text-[#111827] text-right">{fmt(sale.total)}</span>
                  <span className="text-sm text-[#374151] text-right">{fmt(sale.received)}</span>
                  <div className="flex justify-end">
                    <StatusBadge status={sale.status} />
                  </div>
                </div>
                {/* Mobile card */}
                <div className="md:hidden flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] text-sm font-semibold flex-shrink-0">
                    {sale.customer[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#111827]">{sale.customer}</span>
                      <StatusBadge status={sale.status} />
                    </div>
                    <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                      {sale.items.map(i => `${i.product} × ${i.quantity}${i.unit}`).join(', ')} · {fmtDate(sale.date)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#111827]">{fmt(sale.total)}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Manual Sale Form ──────────────────────────────────────────────────────────
function ManualSale({ onBack }: { onBack: () => void }) {
  const { customers, products, addSale, navigate, showToast } = useApp();
  const [form, setForm] = useState({
    customer: '',
    product: '',
    quantity: '',
    price: '',
    received: '',
    paymentMode: 'cash' as 'cash' | 'upi' | 'card',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = parseFloat(form.quantity || '0') * parseFloat(form.price || '0');
  const outstanding = Math.max(0, total - parseFloat(form.received || '0'));

  function validate() {
    const e: Record<string, string> = {};
    if (!form.customer.trim()) e.customer = 'Customer is required';
    if (!form.product.trim()) e.product = 'Product is required';
    if (!form.quantity || parseFloat(form.quantity) <= 0) e.quantity = 'Enter valid quantity';
    if (!form.price || parseFloat(form.price) <= 0) e.price = 'Enter valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      const qty = parseFloat(form.quantity);
      const price = parseFloat(form.price);
      const received = parseFloat(form.received || '0');
      addSale({
        customer: form.customer,
        items: [{ product: form.product, quantity: qty, unit: 'kg', price, total: qty * price }],
        total: qty * price,
        received,
        outstanding: Math.max(0, qty * price - received),
        status: received >= qty * price ? 'paid' : received > 0 ? 'partial' : 'credit',
        paymentMode: form.paymentMode,
      });
      showToast('success', 'Sale recorded');
      navigate('sales');
      setSaving(false);
    }, 600);
  }

  return (
    <div className="max-w-[600px] mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#6B7280] hover:text-[#374151] transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[#111827]">Manual Sale</h1>
          <p className="text-sm text-[#6B7280]">Enter the sale details below.</p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 space-y-4">
        {/* Customer */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#374151]">Customer</label>
          <select
            value={form.customer}
            onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
            className="w-full border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]"
          >
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="__new__">+ Add new customer</option>
          </select>
          {errors.customer && <p className="text-xs text-[#DC2626]">{errors.customer}</p>}
        </div>

        {/* Product */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#374151]">Product</label>
          <select
            value={form.product}
            onChange={e => {
              const p = products.find(p => p.name === e.target.value);
              setForm(f => ({ ...f, product: e.target.value, price: p ? String(p.price) : f.price }));
            }}
            className="w-full border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]"
          >
            <option value="">Select product…</option>
            {products.map(p => <option key={p.id} value={p.name}>{p.name} ({p.quantity} {p.unit} available)</option>)}
          </select>
          {errors.product && <p className="text-xs text-[#DC2626]">{errors.product}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">Quantity</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              placeholder="0"
              className="border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]"
            />
            {errors.quantity && <p className="text-xs text-[#DC2626]">{errors.quantity}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">Price per unit (₹)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0"
              className="border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]"
            />
            {errors.price && <p className="text-xs text-[#DC2626]">{errors.price}</p>}
          </div>
        </div>

        {/* Total display */}
        {total > 0 && (
          <div className="bg-[#F7F8FA] rounded-[10px] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[#6B7280]">Total</span>
            <span className="text-lg font-semibold text-[#111827]">{fmt(total)}</span>
          </div>
        )}

        <div className="border-t border-[#F3F4F6] pt-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">Amount received (₹)</label>
            <input
              type="number"
              min="0"
              max={total || undefined}
              value={form.received}
              onChange={e => setForm(f => ({ ...f, received: e.target.value }))}
              placeholder="0"
              className="border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]"
            />
          </div>

          {outstanding > 0 && total > 0 && (
            <div className="bg-[#FEF3C7] rounded-[10px] px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-[#92400E]">Outstanding</span>
              <span className="text-sm font-semibold text-[#B45309]">{fmt(outstanding)}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">Payment mode</label>
            <div className="flex gap-2">
              {(['cash', 'upi', 'card'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, paymentMode: m }))}
                  className={`flex-1 py-2 rounded-[8px] text-sm font-medium border transition-colors capitalize cursor-pointer
                    ${form.paymentMode === m ? 'bg-[#4338CA] text-white border-[#4338CA]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#C7D2FE]'}`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onBack}>Cancel</Button>
          <Button className="flex-1" onClick={() => { if (validate()) setReviewing(true); }}>Review sale</Button>
        </div>
      </div>

      {/* Review confirm modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReviewing(false)}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-[18px] w-full max-w-sm p-5 shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#111827] mb-4">Confirm sale</h3>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Customer</span><span className="font-medium">{form.customer}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Product</span><span className="font-medium">{form.product} × {form.quantity}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Total</span><span className="font-semibold">{fmt(total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Received</span><span className="font-medium text-[#16A34A]">{fmt(parseFloat(form.received || '0'))}</span></div>
              {outstanding > 0 && <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Outstanding</span><span className="font-medium text-[#D97706]">{fmt(outstanding)}</span></div>}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setReviewing(false)}>Edit</Button>
              <Button className="flex-1" onClick={handleSave} loading={saving}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
