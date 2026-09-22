import { useState, useEffect, useRef } from 'react';
import { useApp } from '../store';

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen, products, customers, sales, navigate } = useApp();
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) { setQuery(''); setTimeout(() => ref.current?.focus(), 50); }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  if (!searchOpen) return null;

  const q = query.toLowerCase();
  const matchedProducts = q ? products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchedCustomers = q ? customers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchedSales = q ? sales.filter(s => s.customer.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)).slice(0, 3) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={() => setSearchOpen(false)}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative bg-white rounded-[10px] w-full max-w-[540px] shadow-md border border-[#E2E8F0] animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E8F0]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#94A3B8] flex-shrink-0">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={ref}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, customers or sales…"
            className="flex-1 text-sm text-[#0F172A] bg-transparent outline-none placeholder-[#94A3B8]"
          />
          <button onClick={() => setSearchOpen(false)} className="text-xs text-[#94A3B8] border border-[#E2E8F0] rounded-[5px] px-1.5 py-0.5 hover:border-[#CBD5E1] transition-colors">Esc</button>
        </div>

        {!q && (
          <div className="p-4">
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wide mb-3">Ask DukaanAI</p>
            <div className="flex flex-wrap gap-2">
              {['How much rice is left?', 'Who owes me money?', 'Today\'s sales total?'].map(s => (
                <button key={s} onClick={() => { setSearchOpen(false); navigate('ai-assistant'); }}
                  className="px-3 py-1.5 rounded-[6px] text-sm text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {q && (
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
            {matchedProducts.length > 0 && (
              <div className="p-3">
                <p className="text-xs text-[#64748B] font-medium px-2 mb-2">Products</p>
                {matchedProducts.map(p => (
                  <button key={p.id} onClick={() => { setSearchOpen(false); navigate('product-detail', { selectedProductId: p.id }); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] hover:bg-[#F8F9FA] transition-colors text-left cursor-pointer">
                    <span className="text-sm font-medium text-[#0F172A]">{p.name}</span>
                    <span className="text-xs text-[#64748B]">{p.quantity} {p.unit}</span>
                  </button>
                ))}
              </div>
            )}
            {matchedCustomers.length > 0 && (
              <div className="p-3">
                <p className="text-xs text-[#64748B] font-medium px-2 mb-2">Customers</p>
                {matchedCustomers.map(c => (
                  <button key={c.id} onClick={() => { setSearchOpen(false); navigate('customer-detail', { selectedCustomerId: c.id }); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] hover:bg-[#F8F9FA] transition-colors text-left cursor-pointer">
                    <span className="text-sm font-medium text-[#0F172A]">{c.name}</span>
                    {c.balance > 0 && <span className="text-xs font-semibold text-[#B45309]">₹{c.balance} outstanding</span>}
                  </button>
                ))}
              </div>
            )}
            {matchedSales.length > 0 && (
              <div className="p-3">
                <p className="text-xs text-[#64748B] font-medium px-2 mb-2">Sales</p>
                {matchedSales.map(s => (
                  <button key={s.id} onClick={() => { setSearchOpen(false); navigate('sale-detail', { selectedSaleId: s.id }); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] hover:bg-[#F8F9FA] transition-colors text-left cursor-pointer">
                    <span className="text-sm font-medium text-[#0F172A]">{s.id} — {s.customer}</span>
                    <span className="text-xs font-semibold text-[#0F172A]">₹{s.total}</span>
                  </button>
                ))}
              </div>
            )}
            {matchedProducts.length === 0 && matchedCustomers.length === 0 && matchedSales.length === 0 && (
              <div className="p-8 text-center text-sm text-[#94A3B8]">No results for "{query}"</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
