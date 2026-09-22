import { useState } from 'react';
import { useApp, fmt, fmtDate, Sale } from '../store';
import { Button, Card, StatusBadge, Badge, SectionHeader, Tabs, EmptyState } from '../components/ui';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        title={t('sales.title')}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowManual(true)}>{t('sales.manualEntry')}</Button>
            <Button onClick={() => navigate('overview')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              {t('sales.newSale')}
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm">
          <p className="text-xs text-[#64748B] font-medium">{t('sales.salesTotal')}</p>
          <p className="text-2xl font-semibold text-[#0F172A] mt-1">{fmt(total)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] font-medium">{t('sales.transactionsCount')}</p>
          <p className="text-2xl font-semibold text-[#0F172A] mt-1">{filtered.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] font-medium">{t('sales.onCredit')}</p>
          <p className="text-2xl font-semibold text-[#B45309] mt-1">{fmt(credit)}</p>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <Tabs
          tabs={[
            { id: 'today', label: t('sales.filterToday') },
            { id: 'week', label: t('sales.filterWeek') },
            { id: 'month', label: t('sales.filterMonth') },
            { id: 'all', label: t('sales.filterAll') },
          ]}
          active={filter}
          onChange={id => setFilter(id as Filter)}
        />
      </div>

      {/* Sales table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 10l6 6 10-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          title={t('sales.noSalesYet')}
          description={t('sales.noSalesDesc')}
          action={<Button onClick={() => navigate('overview')}>{t('sales.recordSale')}</Button>}
        />
      ) : (
        <Card padding="none">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[100px_1fr_1fr_100px_90px_90px] gap-4 px-5 py-3 border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            <span>{t('sales.time')}</span>
            <span>{t('sales.customer')}</span>
            <span>{t('sales.items')}</span>
            <span className="text-right">{t('sales.amount')}</span>
            <span className="text-right">{t('sales.received')}</span>
            <span className="text-right">{t('sales.status')}</span>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map(sale => (
              <button
                key={sale.id}
                onClick={() => navigate('sale-detail', { selectedSaleId: sale.id })}
                className="w-full hover:bg-[#F8F9FA] transition-colors text-left cursor-pointer"
              >
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[100px_1fr_1fr_100px_90px_90px] gap-4 px-5 py-3.5 items-center">
                  <span className="text-sm text-[#64748B]">{fmtDate(sale.date)}</span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#1E40AF] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {sale.customer[0]?.toUpperCase() || 'C'}
                    </div>
                    <span className="text-sm font-medium text-[#0F172A] truncate">{sale.customer}</span>
                  </div>
                  <span className="text-sm text-[#64748B] truncate">
                    {sale.items.map(i => `${i.product} × ${i.quantity}${i.unit}`).join(', ')}
                  </span>
                  <span className="text-sm font-semibold text-[#0F172A] text-right">{fmt(sale.total)}</span>
                  <span className="text-sm text-[#475569] text-right">{fmt(sale.received)}</span>
                  <div className="flex justify-end">
                    <StatusBadge status={sale.status} />
                  </div>
                </div>
                {/* Mobile card (Section 14: Convert complex tables into readable mobile rows/cards) */}
                <div className="md:hidden p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#1E40AF] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {sale.customer[0]?.toUpperCase() || 'C'}
                      </div>
                      <span className="text-sm font-semibold text-[#0F172A] truncate">{sale.customer}</span>
                    </div>
                    <span className="text-sm font-bold text-[#0F172A]">{fmt(sale.total)}</span>
                  </div>
                  <p className="text-xs text-[#64748B] truncate">
                    {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'} ({sale.items.map(i => `${i.quantity}${i.unit} ${i.product}`).join(', ')}) · {fmtDate(sale.date)}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-[#64748B]">{t('sales.received')}: <strong className="text-[#15803D]">{fmt(sale.received)}</strong></span>
                      {sale.outstanding > 0 && (
                        <span className="text-[#64748B]">Due: <strong className="text-[#B45309]">{fmt(sale.outstanding)}</strong></span>
                      )}
                    </div>
                    <StatusBadge status={sale.status} />
                  </div>
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
  const { t } = useTranslation();
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
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[#111827]">{t('sales.manualSaleTitle')}</h1>
          <p className="text-sm text-[#6B7280]">{t('sales.manualSaleSubtitle')}</p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[10px] p-5 space-y-4">
        {/* Customer */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#334155]">Customer</label>
          <select
            value={form.customer}
            onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
            className="w-full border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]"
          >
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="__new__">+ Add new customer</option>
          </select>
          {errors.customer && <p className="text-xs text-[#DC2626]">{errors.customer}</p>}
        </div>

        {/* Product */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#334155]">Product</label>
          <select
            value={form.product}
            onChange={e => {
              const p = products.find(p => p.name === e.target.value);
              setForm(f => ({ ...f, product: e.target.value, price: p ? String(p.price) : f.price }));
            }}
            className="w-full border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]"
          >
            <option value="">Select product…</option>
            {products.map(p => <option key={p.id} value={p.name}>{p.name} ({p.quantity} {p.unit} available)</option>)}
          </select>
          {errors.product && <p className="text-xs text-[#DC2626]">{errors.product}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#334155]">Quantity</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              placeholder="0"
              className="border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]"
            />
            {errors.quantity && <p className="text-xs text-[#DC2626]">{errors.quantity}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#334155]">Price per unit (₹)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0"
              className="border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]"
            />
            {errors.price && <p className="text-xs text-[#DC2626]">{errors.price}</p>}
          </div>
        </div>

        {/* Total display */}
        {total > 0 && (
          <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-[8px] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[#64748B]">Total</span>
            <span className="text-lg font-semibold text-[#0F172A]">{fmt(total)}</span>
          </div>
        )}

        <div className="border-t border-[#F1F5F9] pt-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#334155]">Amount received (₹)</label>
            <input
              type="number"
              min="0"
              max={total || undefined}
              value={form.received}
              onChange={e => setForm(f => ({ ...f, received: e.target.value }))}
              placeholder="0"
              className="border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]"
            />
          </div>

          {outstanding > 0 && total > 0 && (
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-[8px] px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-[#92400E]">Outstanding</span>
              <span className="text-sm font-semibold text-[#B45309]">{fmt(outstanding)}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#334155]">Payment mode</label>
            <div className="flex gap-2">
              {(['cash', 'upi', 'card'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, paymentMode: m }))}
                  className={`flex-1 py-2 rounded-[8px] text-sm font-medium border transition-colors capitalize cursor-pointer
                    ${form.paymentMode === m ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-[#BFDBFE]'}`}
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
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-[10px] w-full max-w-sm p-5 shadow-md border border-[#E2E8F0] animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#0F172A] mb-4">Confirm sale</h3>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Customer</span><span className="font-medium text-[#0F172A]">{form.customer}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Product</span><span className="font-medium text-[#0F172A]">{form.product} × {form.quantity}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Total</span><span className="font-semibold text-[#0F172A]">{fmt(total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Received</span><span className="font-medium text-[#15803D]">{fmt(parseFloat(form.received || '0'))}</span></div>
              {outstanding > 0 && <div className="flex justify-between text-sm"><span className="text-[#64748B]">Outstanding</span><span className="font-medium text-[#B45309]">{fmt(outstanding)}</span></div>}
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
