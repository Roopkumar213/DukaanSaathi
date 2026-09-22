import { useApp, fmt, fmtDate } from '../store';
import { Button, Card, StatusBadge, Badge } from '../components/ui';

export default function SaleDetail() {
  const { sales, selectedSaleId, navigate, customers } = useApp();
  const sale = sales.find(s => s.id === selectedSaleId) ?? sales[0];
  if (!sale) return null;

  const customer = customers.find(c => c.name.toLowerCase() === sale.customer.toLowerCase());

  return (
    <div className="max-w-[680px] mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('sales')} className="text-[#6B7280] hover:text-[#374151] transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold text-[#111827]">Sale {sale.id}</h1>
          <StatusBadge status={sale.status} />
        </div>
      </div>

      <div className="space-y-4">
        {/* Customer */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1E40AF] flex items-center justify-center text-white font-semibold">
                {sale.customer[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">{sale.customer}</p>
                {customer?.phone && <p className="text-sm text-[#64748B]">{customer.phone}</p>}
              </div>
            </div>
            {customer && (
              <Button variant="ghost" size="sm" onClick={() => navigate('customer-detail', { selectedCustomerId: customer.id })}>
                View Khata →
              </Button>
            )}
          </div>
        </Card>

        {/* Items */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#0F172A]">Items</h3>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {sale.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">{item.product}</p>
                  <p className="text-xs text-[#64748B]">{item.quantity} {item.unit} × ₹{item.price}/{item.unit}</p>
                </div>
                <span className="text-sm font-semibold text-[#0F172A]">{fmt(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0F172A]">Total</span>
            <span className="text-base font-bold text-[#0F172A]">{fmt(sale.total)}</span>
          </div>
        </Card>

        {/* Payment */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Payment</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Expected</span>
              <span className="text-[#0F172A] font-medium">{fmt(sale.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Received</span>
              <span className="text-[#15803D] font-medium">{fmt(sale.received)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Mode</span>
              <span className="text-[#334155] uppercase text-xs font-semibold">{sale.paymentMode}</span>
            </div>
            {sale.outstanding > 0 && (
              <>
                <div className="border-t border-[#F1F5F9] pt-2 mt-2 flex justify-between text-sm">
                  <span className="text-[#B45309] font-medium">Outstanding</span>
                  <span className="text-[#B45309] font-semibold">{fmt(sale.outstanding)}</span>
                </div>
                {customer && (
                  <div className="pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]"
                      onClick={() => navigate('customer-detail', { selectedCustomerId: customer.id })}
                    >
                      Add {fmt(sale.outstanding)} to {sale.customer}'s Khata
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Inventory impact */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Inventory impact</h3>
          {sale.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-[#64748B]">{item.product}</span>
              <Badge variant="error">−{item.quantity} {item.unit}</Badge>
            </div>
          ))}
        </Card>

        {/* Meta */}
        <div className="text-center text-xs text-[#64748B] pb-4">
          Recorded {fmtDate(sale.date)} · Sale #{sale.id}
        </div>
      </div>
    </div>
  );
}
