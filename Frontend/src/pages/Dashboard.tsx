import React, { useState } from 'react';
import { useApp, fmt, fmtDate } from '../store';
import { Button, Card, KPICard, Badge, StatusBadge, Modal, EditableField, Spinner, Avatar } from '../components/ui';
import { aiApi, NaturalSaleParseResponse } from '../api/aiApi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function getGreeting(t: (key: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t('common.goodMorning');
  if (h < 17) return t('common.goodAfternoon');
  return t('common.goodEvening');
}

export default function Dashboard() {
  const { sales, products, customers, navigate, addSale, showToast } = useApp();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [voiceModal, setVoiceModal] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'processing' | 'review' | 'success'>('idle');
  const [voiceInput, setVoiceInput] = useState('');
  const [parsedData, setParsedData] = useState<NaturalSaleParseResponse | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');
  const [totalAmount, setTotalAmount] = useState('0');
  const [receivedAmount, setReceivedAmount] = useState('0');
  const [confirming, setConfirming] = useState(false);
  const [newSaleId, setNewSaleId] = useState<string | null>(null);

  const today = new Date();
  const todaySales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  });

  const todayTotalSales = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
  const todayTransactionsCount = todaySales.length;
  const totalOutstandingKhata = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const lowStockProducts = products.filter(p => p.quantity <= p.minStock);

  async function handleAiParse() {
    if (!voiceInput.trim()) {
      showToast('error', t('aiSale.description'));
      return;
    }
    setVoiceState('processing');
    try {
      const parsed = await aiApi.parseSale(voiceInput.trim());
      setParsedData(parsed);
      const firstItem = parsed.items?.[0] || { name: 'Item', quantity: 1, unit: 'pcs', estimatedPrice: 0 };
      setCustomerName(parsed.customerName || 'Walk-in Customer');
      setProductName(firstItem.name || 'Item');
      setQuantity(String(firstItem.quantity || 1));
      setUnit(firstItem.unit || 'kg');
      setTotalAmount(String(parsed.totalAmount || 0));
      setReceivedAmount(String(parsed.amountPaid ?? parsed.totalAmount ?? 0));
      setVoiceState('review');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to understand sale text.');
      setVoiceState('idle');
    }
  }

  async function handleConfirmSale() {
    setConfirming(true);
    try {
      const qtyNum = parseFloat(quantity) || 1;
      const totalNum = parseFloat(totalAmount) || 0;
      const recNum = parseFloat(receivedAmount) || 0;
      const outstandingNum = Math.max(0, totalNum - recNum);
      const unitPrice = qtyNum > 0 ? totalNum / qtyNum : totalNum;

      const sale = await addSale({
        customer: customerName.trim() || 'Walk-in Customer',
        items: [{
          product: productName.trim() || 'Item',
          quantity: qtyNum,
          unit: unit || 'kg',
          price: unitPrice,
          total: totalNum,
        }],
        total: totalNum,
        received: recNum,
        outstanding: outstandingNum,
        status: outstandingNum > 0 ? (recNum > 0 ? 'partial' : 'credit') : 'paid',
        paymentMode: parsedData?.paymentMode?.toLowerCase() === 'upi' ? 'upi' : 'cash',
      });

      setNewSaleId(sale?.id || null);
      setVoiceState('success');
    } catch (err) {
      // toast shown by addSale
    } finally {
      setConfirming(false);
    }
  }

  function resetVoice() {
    setVoiceModal(false);
    setVoiceState('idle');
    setVoiceInput('');
    setParsedData(null);
  }

  const recentSales = sales.slice(0, 5);

  return (
    <div className="max-w-[1200px] mx-auto p-6 flex flex-col gap-6">
      {/* Header: time-of-day greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight">
            {getGreeting(t)}{user?.shopName ? `, ${user.shopName}` : ''}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button size="md" variant="secondary" onClick={() => navigate('inventory')}>
            {t('dashboard.addStock')}
          </Button>
          <Button size="md" variant="primary" onClick={() => { setVoiceState('idle'); setVoiceModal(true); }}>
            {t('dashboard.quickSale')}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={t('dashboard.todaySales')}
          value={fmt(todayTotalSales)}
          sub={`${todayTransactionsCount} ${todayTransactionsCount === 1 ? t('dashboard.transaction') : t('dashboard.transactions')}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          accent="default"
          onClick={() => navigate('sales')}
        />

        <KPICard
          label={t('dashboard.todayTransactions')}
          value={String(todayTransactionsCount)}
          sub={t('dashboard.recordedToday')}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          accent="default"
          onClick={() => navigate('sales')}
        />

        <KPICard
          label={t('dashboard.outstandingKhata')}
          value={fmt(totalOutstandingKhata)}
          sub={`${customers.filter(c => c.balance > 0).length} ${t('dashboard.debtors')}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          accent="warning"
          onClick={() => navigate('khata')}
        />

        <KPICard
          label={t('dashboard.lowStockItems')}
          value={`${lowStockProducts.length}`}
          sub={lowStockProducts.length > 0 ? t('dashboard.requiresReorder') : t('dashboard.adequatelyStocked')}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          accent={lowStockProducts.length > 0 ? 'error' : 'success'}
          onClick={() => navigate('inventory')}
        />
      </div>

      {/* Quick Actions Strip */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs uppercase font-semibold text-[#64748B] tracking-wider">{t('dashboard.quickActions')}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('sales')}>
            {t('dashboard.recordSale')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate('inventory')}>
            {t('dashboard.addProduct')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate('payments')}>
            {t('dashboard.recordPayment')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate('ai-assistant')}>
            {t('dashboard.askAI')}
          </Button>
        </div>
      </div>

      {/* Main Grid: Recent Sales & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales (2 cols) */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0F172A]">{t('dashboard.recentSales')}</h3>
              <button
                onClick={() => navigate('sales')}
                className="text-xs font-semibold text-[#1E40AF] hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                {t('dashboard.viewAllSales')}
              </button>
            </div>

            {recentSales.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-[#0F172A] mb-1">{t('dashboard.noSalesYet')}</p>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto mb-4">
                  {t('dashboard.noSalesDesc')}
                </p>
                <Button size="sm" variant="primary" onClick={() => navigate('sales')}>
                  {t('dashboard.addFirstSale')}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => navigate('sale-detail', { selectedSaleId: sale.id })}
                    className="p-4 hover:bg-[#F8F9FA] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0F172A]">{sale.customer}</span>
                        <StatusBadge status={sale.status} />
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        {sale.items.map(i => `${i.quantity} ${i.unit} ${i.product}`).join(', ')}
                      </p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">{fmtDate(sale.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-[#0F172A]">{fmt(sale.total)}</p>
                      {sale.outstanding > 0 ? (
                        <p className="text-xs font-medium text-[#B45309]">{t('dashboard.dueLabel')} {fmt(sale.outstanding)}</p>
                      ) : (
                        <p className="text-xs text-[#15803D]">{t('dashboard.paidInFull')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Low Stock Alert */}
        <div className="lg:col-span-1">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0F172A]">{t('dashboard.inventoryAlerts')}</h3>
              <button
                onClick={() => navigate('inventory')}
                className="text-xs font-semibold text-[#1E40AF] hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                {t('dashboard.manageStock')}
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto mb-2.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-[#0F172A]">{t('dashboard.stockHealthy')}</p>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {products.length === 0 ? t('dashboard.noProductsAdded') : t('dashboard.noLowStock')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate('product-detail', { selectedProductId: p.id })}
                    className="p-3.5 hover:bg-[#F8F9FA] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{p.name}</p>
                      <p className="text-xs text-[#94A3B8]">{t('dashboard.minRequired')}: {p.minStock} {p.unit}</p>
                    </div>
                    <Badge variant="error">{p.quantity} {p.unit} {t('dashboard.left')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Recent Khata Activity */}
      {customers.filter(c => c.balance > 0).length > 0 && (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0F172A]">{t('dashboard.recentKhata')}</h3>
            <button
              onClick={() => navigate('khata')}
              className="text-xs font-semibold text-[#1E40AF] hover:text-[#1D4ED8] transition-colors cursor-pointer"
            >
              {t('dashboard.viewAllKhata')}
            </button>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {customers
              .filter(c => c.balance > 0)
              .sort((a, b) => b.balance - a.balance)
              .slice(0, 5)
              .map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate('customer-detail', { selectedCustomerId: c.id })}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#F8F9FA] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size="sm" />
                    <span className="text-sm font-medium text-[#0F172A]">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#B45309]">{fmt(c.balance)}</p>
                    <p className="text-xs text-[#94A3B8]">{t('khata.statusOutstanding')}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </Card>
      )}

      {/* AI Quick Voice Sale Modal */}
      <Modal open={voiceModal} title={t('aiSale.modalTitle')} onClose={resetVoice} width="md">
          {voiceState === 'idle' && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748B]">
                {t('aiSale.description')}
              </p>
              <textarea
                rows={3}
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                placeholder={t('aiSale.placeholder')}
                className="w-full text-sm border border-[#E2E8F0] rounded-[8px] p-3 text-[#0F172A] focus:outline-none focus:border-[#1E40AF] resize-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={resetVoice}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleAiParse}>
                  {t('aiSale.parseSale')}
                </Button>
              </div>
            </div>
          )}

          {voiceState === 'processing' && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Spinner size={28} />
              <p className="text-xs text-[#64748B] font-medium">{t('aiSale.extracting')}</p>
            </div>
          )}

          {voiceState === 'review' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] text-xs text-[#1E40AF]">
                {t('aiSale.reviewNote')}
              </div>

              <div className="space-y-3 border border-[#E2E8F0] rounded-[8px] p-3 bg-white">
                <EditableField label={t('aiSale.customer')} value={customerName} onChange={setCustomerName} />
                <EditableField label={t('aiSale.product')} value={productName} onChange={setProductName} />
                <div className="grid grid-cols-2 gap-2">
                  <EditableField label={t('aiSale.quantity')} value={quantity} onChange={setQuantity} />
                  <EditableField label={t('aiSale.unit')} value={unit} onChange={setUnit} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <EditableField label={t('aiSale.totalRupee')} value={totalAmount} onChange={setTotalAmount} />
                  <EditableField label={t('aiSale.paidRupee')} value={receivedAmount} onChange={setReceivedAmount} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#F1F5F9]">
                <span>{t('aiSale.calculatedDue')} <strong>{fmt(Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(receivedAmount) || 0)))}</strong></span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setVoiceState('idle')}>
                    {t('common.back')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleConfirmSale} loading={confirming}>
                    {t('aiSale.confirmAndRecord')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {voiceState === 'success' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0F172A]">{t('aiSale.saleCommitted')}</h4>
                <p className="text-xs text-[#64748B] mt-1">{t('aiSale.saleCommittedDesc')}</p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={resetVoice}>
                  {t('common.close')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetVoice();
                    if (newSaleId) navigate('sale-detail', { selectedSaleId: newSaleId });
                    else navigate('sales');
                  }}
                >
                  {t('aiSale.viewReceipt')}
                </Button>
              </div>
            </div>
          )}
        </Modal>
    </div>
  );
}
