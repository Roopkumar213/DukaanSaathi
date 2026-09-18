import { useState } from 'react';
import { useApp, fmt, fmtDate } from '../store';
import { Button, Card, SectionHeader, Badge, EmptyState, Input, Modal, ConfirmModal } from '../components/ui';

export default function Khata() {
  const { customers, navigate } = useApp();
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
        title="Khata"
        subtitle="Track customer balances and credit."
        action={<Button onClick={() => setShowAdd(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Add customer
        </Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="md">
          <p className="text-sm text-[#9CA3AF] font-medium">Outstanding</p>
          <p className="text-[32px] font-semibold text-[#D97706] leading-none mt-2">{fmt(totalOutstanding)}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-[#9CA3AF] font-medium">Customers with balance</p>
          <p className="text-[32px] font-semibold text-[#111827] leading-none mt-2">{withBalance.length}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-80">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…"
          className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]" />
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 18a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          title="No customers yet"
          description="Add your first customer to track credit."
          action={<Button onClick={() => setShowAdd(true)}>Add customer</Button>}
        />
      ) : (
        <Card padding="none">
          <div className="hidden md:grid grid-cols-[1fr_140px_100px] px-5 py-3 border-b border-[#F3F4F6] text-xs font-medium text-[#9CA3AF] uppercase tracking-wide gap-4">
            <span>Customer</span>
            <span className="text-right">Outstanding</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-[#F7F8FA]">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => navigate('customer-detail', { selectedCustomerId: c.id })}
                className="w-full hover:bg-[#F7F8FA] transition-colors text-left"
              >
                <div className="hidden md:grid grid-cols-[1fr_140px_100px] px-5 py-3.5 items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] text-xs font-semibold">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{c.name}</p>
                      {c.phone && <p className="text-xs text-[#9CA3AF]">{c.phone}</p>}
                    </div>
                  </div>
                  <p className={`text-sm font-semibold text-right ${c.balance > 0 ? 'text-[#D97706]' : 'text-[#6B7280]'}`}>
                    {c.balance > 0 ? fmt(c.balance) : '—'}
                  </p>
                  <div className="flex justify-end">
                    <Badge variant={c.balance > 0 ? 'warning' : 'success'}>
                      {c.balance > 0 ? 'Outstanding' : 'Clear'}
                    </Badge>
                  </div>
                </div>
                {/* Mobile */}
                <div className="md:hidden flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] text-sm font-semibold">
                    {c.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111827]">{c.name}</p>
                    {c.phone && <p className="text-xs text-[#9CA3AF]">{c.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${c.balance > 0 ? 'text-[#D97706]' : 'text-[#9CA3AF]'}`}>
                      {c.balance > 0 ? fmt(c.balance) : '₹0'}
                    </p>
                    {c.balance > 0 && <p className="text-xs text-[#9CA3AF]">outstanding</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add customer">
        <div className="space-y-4">
          <Input label="Customer name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Ramesh" autoFocus />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddCustomer}>Add customer</Button>
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
        <button onClick={() => navigate('khata')} className="text-[#6B7280] hover:text-[#374151]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="text-[22px] font-semibold text-[#111827]">{customer.name}</h1>
      </div>

      <div className="space-y-4">
        {/* Balance card */}
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9CA3AF]">Outstanding balance</p>
              <p className={`text-[44px] font-bold leading-none mt-2 ${customer.balance > 0 ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>
                {fmt(customer.balance)}
              </p>
              {customer.phone && <p className="text-sm text-[#9CA3AF] mt-2">{customer.phone}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowPayment(true)} disabled={customer.balance === 0}>
                Record payment
              </Button>
              <Button variant="secondary" size="sm">Add credit</Button>
            </div>
          </div>
        </Card>

        {/* Transaction history */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-[#F3F4F6]">
            <h3 className="text-sm font-semibold text-[#374151]">Transaction history</h3>
          </div>
          <div className="divide-y divide-[#F7F8FA]">
            {[...customer.transactions].reverse().map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-[#111827]">{t.note}</p>
                  <p className="text-xs text-[#9CA3AF]">{fmtDate(t.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'debit' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {t.type === 'debit' ? '−' : '+'}{fmt(t.amount)}
                </span>
              </div>
            ))}
            {customer.transactions.length === 0 && (
              <p className="px-5 py-6 text-sm text-[#9CA3AF] text-center">No transactions yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Record payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowPayment(false); setConfirming(false); }}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-[18px] w-full max-w-sm p-5 shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            {!confirming ? (
              <>
                <h3 className="font-semibold text-[#111827] mb-1">Record payment</h3>
                <p className="text-sm text-[#6B7280] mb-4">{customer.name} · Outstanding {fmt(customer.balance)}</p>
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
                    <label className="text-sm font-medium text-[#374151]">Payment mode</label>
                    <div className="flex gap-2">
                      {(['cash', 'upi', 'card'] as const).map(m => (
                        <button key={m} onClick={() => setPayMode(m)}
                          className={`flex-1 py-2 rounded-[8px] text-sm font-medium border transition-colors cursor-pointer uppercase
                            ${payMode === m ? 'bg-[#4338CA] text-white border-[#4338CA]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#C7D2FE]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  {parseFloat(payAmount) > 0 && (
                    <div className="bg-[#F7F8FA] rounded-[10px] px-4 py-2.5 flex justify-between text-sm">
                      <span className="text-[#6B7280]">New balance after</span>
                      <span className={`font-semibold ${Math.max(0, customer.balance - parseFloat(payAmount)) > 0 ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>
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
                <h3 className="font-semibold text-[#111827] mb-4">Record {fmt(parseFloat(payAmount))} payment?</h3>
                <div className="bg-[#F7F8FA] rounded-[10px] p-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Customer</span><span className="font-medium">{customer.name}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Amount</span><span className="font-medium text-[#16A34A]">{fmt(parseFloat(payAmount))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#6B7280]">Mode</span><span className="uppercase text-xs font-medium">{payMode}</span></div>
                  <div className="flex justify-between text-sm border-t border-[#E5E7EB] pt-2 mt-2"><span className="text-[#6B7280]">New balance</span><span className="font-semibold">{fmt(Math.max(0, customer.balance - parseFloat(payAmount)))}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>Back</Button>
                  <Button variant="success" className="flex-1" onClick={handleRecord} loading={saving}>Confirm</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
