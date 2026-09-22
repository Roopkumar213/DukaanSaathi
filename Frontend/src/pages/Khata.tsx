import { useState } from 'react';
import { useApp, fmt, fmtDate } from '../store';
import { Button, Card, SectionHeader, Badge, EmptyState, Input, Modal, ConfirmModal } from '../components/ui';
import { useTranslation } from 'react-i18next';

export default function Khata() {
  const { customers, navigate } = useApp();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const { addCustomer, showToast } = useApp();

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalOutstanding = customers.reduce((a, c) => a + c.balance, 0);
  const withBalance = customers.filter(c => c.balance > 0);

  function handleAddCustomer() {
    if (!newName.trim()) return;
    addCustomer(newName.trim());
    showToast('success', `${newName} added`);
    setNewName('');
    setShowAdd(false);
  }

  return (
    <div className="max-w-[900px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader
        title={t('khata.title')}
        subtitle={t('khata.subtitle')}
        action={<Button onClick={() => setShowAdd(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          {t('khata.addCustomer')}
        </Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="md">
          <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider">{t('khata.outstanding')}</p>
          <p className="text-[32px] font-bold text-[#B45309] leading-tight mt-1">{fmt(totalOutstanding)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider">{t('khata.customersWithBalance')}</p>
          <p className="text-[32px] font-bold text-[#0F172A] leading-tight mt-1">{withBalance.length}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('khata.searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-[8px] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF] transition-colors"
        />
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 18a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
          title={t('khata.noCustomersYet')}
          description={t('khata.noCustomersDesc')}
          action={<Button onClick={() => setShowAdd(true)}>{t('khata.addCustomer')}</Button>}
        />
      ) : (
        <Card padding="none">
          <div className="hidden md:grid grid-cols-[1fr_140px_100px] px-5 py-3 border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider gap-4">
            <span>{t('khata.customer')}</span>
            <span className="text-right">{t('khata.outstandingHeader')}</span>
            <span className="text-right">{t('khata.statusHeader')}</span>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => navigate('customer-detail', { selectedCustomerId: c.id })}
                className="w-full hover:bg-[#F8F9FA] transition-colors text-left cursor-pointer"
              >
                <div className="hidden md:grid grid-cols-[1fr_140px_100px] px-5 py-3.5 items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1E40AF] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {c.name[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{c.name}</p>
                      {c.phone && <p className="text-xs text-[#64748B]">{c.phone}</p>}
                    </div>
                  </div>
                  <p className={`text-sm font-semibold text-right ${c.balance > 0 ? 'text-[#B45309]' : 'text-[#64748B]'}`}>
                    {c.balance > 0 ? fmt(c.balance) : '—'}
                  </p>
                  <div className="flex justify-end">
                    <Badge variant={c.balance > 0 ? 'warning' : 'success'}>
                      {c.balance > 0 ? t('khata.statusOutstanding') : t('khata.statusClear')}
                    </Badge>
                  </div>
                </div>
                {/* Mobile (Section 14) */}
                <div className="md:hidden p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1E40AF] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {c.name[0]?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{c.name}</p>
                        {c.phone && <p className="text-xs text-[#64748B]">{c.phone}</p>}
                      </div>
                    </div>
                    <Badge variant={c.balance > 0 ? 'warning' : 'success'}>
                      {c.balance > 0 ? t('khata.statusOutstanding') : t('khata.statusClear')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] text-xs">
                    <span className="text-[#64748B]">Balance Due</span>
                    <span className={`text-sm font-bold ${c.balance > 0 ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
                      {c.balance > 0 ? fmt(c.balance) : '₹0 (Clear)'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('khata.addCustomer')}>
        <div className="space-y-4">
          <Input label={t('khata.customerName')} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Ramesh" autoFocus />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1" onClick={handleAddCustomer}>{t('khata.addCustomer')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Customer Detail ───────────────────────────────────────────────────────────
export function CustomerDetail() {
  const { customers, selectedCustomerId, navigate, recordPayment, showToast } = useApp();
  const customer = customers.find(c => c.id === selectedCustomerId) ?? customers[0];
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!customer) return null;

  function handleRecord() {
    setSaving(true);
    setTimeout(() => {
      recordPayment(customer.id, parseFloat(payAmount), payMode);
      showToast('success', `₹${payAmount} payment recorded`);
      setShowPayment(false);
      setConfirming(false);
      setPayAmount('');
      setSaving(false);
    }, 600);
  }

  return (
    <div className="max-w-[680px] mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('khata')} className="text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[22px] font-semibold text-[#0F172A]">{customer.name}</h1>
      </div>

      <div className="space-y-4">
        {/* Balance card */}
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Outstanding balance</p>
              <p className={`text-[38px] font-bold leading-none mt-2 ${customer.balance > 0 ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
                {fmt(customer.balance)}
              </p>
              {customer.phone && <p className="text-sm text-[#64748B] mt-2">{customer.phone}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowPayment(true)} disabled={customer.balance === 0}>
                Record payment
              </Button>
            </div>
          </div>
        </Card>

        {/* Transaction history */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Transaction history</h3>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {[...customer.transactions].reverse().map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">{t.note}</p>
                  <p className="text-xs text-[#64748B]">{fmtDate(t.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'debit' ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                  {t.type === 'debit' ? '−' : '+'}{fmt(t.amount)}
                </span>
              </div>
            ))}
            {customer.transactions.length === 0 && (
              <p className="px-5 py-6 text-sm text-[#64748B] text-center">No transactions yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Record payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowPayment(false); setConfirming(false); }}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-[10px] w-full max-w-sm p-5 shadow-md border border-[#E2E8F0] animate-slide-up" onClick={e => e.stopPropagation()}>
            {!confirming ? (
              <>
                <h3 className="font-semibold text-[#0F172A] mb-1">Record payment</h3>
                <p className="text-sm text-[#64748B] mb-4">{customer.name} · Outstanding {fmt(customer.balance)}</p>
                <div className="space-y-4">
                  <Input
                    label="Amount received (₹)"
                    type="number"
                    min="0"
                    max={customer.balance}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#334155]">Payment mode</label>
                    <div className="flex gap-2">
                      {(['cash', 'upi', 'card'] as const).map(m => (
                        <button key={m} onClick={() => setPayMode(m)}
                          className={`flex-1 py-2 rounded-[8px] text-sm font-medium border transition-colors cursor-pointer uppercase
                            ${payMode === m ? 'bg-[#1E40AF] text-white border-[#1E40AF]' : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-[#BFDBFE]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  {parseFloat(payAmount) > 0 && (
                    <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-[8px] px-4 py-2.5 flex justify-between text-sm">
                      <span className="text-[#64748B]">New balance after</span>
                      <span className={`font-semibold ${Math.max(0, customer.balance - parseFloat(payAmount)) > 0 ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
                        {fmt(Math.max(0, customer.balance - parseFloat(payAmount)))}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowPayment(false)}>Cancel</Button>
                    <Button className="flex-1" onClick={() => setConfirming(true)} disabled={!payAmount || parseFloat(payAmount) <= 0}>
                      Record payment
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-[#0F172A] mb-4">Record {fmt(parseFloat(payAmount))} payment?</h3>
                <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-[8px] p-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm"><span className="text-[#64748B]">Customer</span><span className="font-medium text-[#0F172A]">{customer.name}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#64748B]">Amount</span><span className="font-medium text-[#15803D]">{fmt(parseFloat(payAmount))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#64748B]">Mode</span><span className="uppercase text-xs font-semibold text-[#334155]">{payMode}</span></div>
                  <div className="flex justify-between text-sm border-t border-[#E2E8F0] pt-2 mt-2"><span className="text-[#64748B]">New balance</span><span className="font-semibold text-[#0F172A]">{fmt(Math.max(0, customer.balance - parseFloat(payAmount)))}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>Back</Button>
                  <Button className="flex-1" onClick={handleRecord} loading={saving}>Confirm payment</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
