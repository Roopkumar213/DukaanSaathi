import React, { useState, useEffect } from 'react';
import { useApp, fmt, fmtDate } from '../store';
import { paymentsApi, PaymentDto } from '../api/paymentsApi';
import { customersApi, CustomerDto } from '../api/customersApi';
import { Button, Card, SectionHeader, Badge, Modal } from '../components/ui';

export default function Payments() {
  const { showToast, refreshData } = useApp();
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Record Payment modal state
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchPayments() {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentsApi.getPayments();
      setPayments(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }

  async function openRecordModal() {
    setShowModal(true);
    try {
      const custList = await customersApi.getCustomers(false);
      setCustomers(custList);
      if (custList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custList[0].id);
      }
    } catch (err) {
      showToast('error', 'Failed to load customers for payment.');
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) {
      showToast('error', 'Please select a customer.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('error', 'Please enter a valid payment amount greater than ₹0.');
      return;
    }

    try {
      setSubmitting(true);
      await customersApi.recordPayment(selectedCustomerId, {
        amount: numAmount,
        paymentMode: mode,
        note: note.trim() || undefined,
      });
      showToast('success', `Recorded payment of ${fmt(numAmount)} successfully!`);
      setShowModal(false);
      setAmount('');
      setNote('');
      await fetchPayments();
      await refreshData();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="max-w-[1000px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader
        title="Payments"
        action={
          <Button variant="primary" size="sm" onClick={openRecordModal}>
            + Record Payment
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="md">
          <p className="text-xs uppercase font-medium text-[#64748B] tracking-wider">Total Received</p>
          <p className="text-3xl font-bold text-[#15803D] mt-1">{fmt(totalCollected)}</p>
          <p className="text-xs text-[#94A3B8] mt-1">{payments.length} transaction{payments.length === 1 ? '' : 's'} recorded</p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase font-medium text-[#64748B] tracking-wider">Recorded Modes</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {['CASH', 'UPI', 'CARD'].map(m => {
              const count = payments.filter(p => p.paymentMode?.toUpperCase() === m).length;
              return (
                <span key={m} className="px-2.5 py-1 text-xs font-semibold rounded-[6px] bg-[#F8F9FA] text-[#334155] border border-[#E2E8F0]">
                  {m}: {count}
                </span>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0F172A]">Transaction History</h3>
          <span className="text-xs text-[#64748B]">{payments.length} total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading payment records...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-[#DC2626] bg-[#FEE2E2]/50">{error}</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-11 h-11 rounded-[8px] bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-[#0F172A] mb-1">No payments recorded yet</h4>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto mb-4">
              Payments from completed sales and Khata repayments will appear here as transactions occur.
            </p>
            <Button size="sm" variant="secondary" onClick={openRecordModal}>
              Record First Payment
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-[#0F172A]">
                <thead className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Date &amp; Time</th>
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-5">Mode</th>
                    <th className="py-3 px-5">Remarks</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3.5 px-5 text-xs text-[#64748B] whitespace-nowrap">
                        {p.createdAt ? fmtDate(new Date(p.createdAt)) : '—'}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-[#0F172A]">
                        {p.customerName || 'Direct / Walk-in'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-block px-2 py-0.5 rounded-[4px] text-xs font-semibold uppercase bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                          {p.paymentMode || 'CASH'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[#64748B]">
                        {p.note || (p.saleId ? `Sale #${p.saleId.substring(0, 8)}` : 'Khata repayment')}
                      </td>
                      <td className="py-3.5 px-5 text-right font-semibold text-[#15803D]">
                        +{fmt(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (Section 14) */}
            <div className="md:hidden divide-y divide-[#F1F5F9]">
              {payments.map((p) => (
                <div key={p.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0F172A]">{p.customerName || 'Direct / Walk-in'}</span>
                    <span className="text-sm font-bold text-[#15803D]">+{fmt(p.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>{p.createdAt ? fmtDate(new Date(p.createdAt)) : '—'}</span>
                    <span className="inline-block px-2 py-0.5 rounded-[4px] font-semibold uppercase bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                      {p.paymentMode || 'CASH'}
                    </span>
                  </div>
                  {(p.note || p.saleId) && (
                    <p className="text-xs text-[#94A3B8]">
                      {p.note || `Sale #${p.saleId?.substring(0, 8)}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Record Payment Modal */}
      <Modal open={showModal} title="Record Customer Payment" onClose={() => setShowModal(false)}>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Select Customer <span className="text-[#DC2626]">*</span>
              </label>
              {customers.length === 0 ? (
                <div className="text-xs text-[#64748B] bg-[#F8F9FA] p-2.5 rounded-[8px] border border-[#E2E8F0]">
                  No customers found. Add a customer first in Customers / Khata.
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-sm border border-[#E2E8F0] rounded-[8px] px-3 py-2 bg-white text-[#0F172A] focus:outline-none focus:border-[#1E40AF]"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} — Outstanding: {fmt(c.balance)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-[8px] flex items-center justify-between text-xs text-[#92400E]">
                <span>Current Outstanding Due:</span>
                <span className="font-bold text-sm text-[#B45309]">{fmt(selectedCustomer.balance)}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Amount Received (₹) <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full text-sm border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#1E40AF]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {['CASH', 'UPI', 'CARD'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2 px-3 text-xs font-semibold rounded-[8px] border transition-colors cursor-pointer ${
                      mode === m
                        ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                        : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-[#BFDBFE]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Note / Reference (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. GPay ref #1234 or partial repayment"
                className="w-full text-sm border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || customers.length === 0}
              >
                {submitting ? 'Recording...' : 'Save Payment'}
              </Button>
            </div>
          </form>
        </Modal>
    </div>
  );
}
