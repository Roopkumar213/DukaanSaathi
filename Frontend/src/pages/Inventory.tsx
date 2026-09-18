import { useState } from 'react';
import { useApp, fmt } from '../store';
import { Button, Card, Badge, SectionHeader, EmptyState, Input, Select } from '../components/ui';

type StockFilter = 'all' | 'low' | 'out';

export default function Inventory() {
  const { products, navigate } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [showUpload, setShowUpload] = useState(false);

  if (showUpload) return <UploadStock onBack={() => setShowUpload(false)} />;

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'low' && p.quantity <= p.minStock && p.quantity > 0) || (filter === 'out' && p.quantity === 0);
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-[1200px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader
        title="Inventory"
        subtitle="Keep track of what is available in your shop."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowUpload(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M3 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Upload stock
            </Button>
            <Button onClick={() => navigate('add-product')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Add product
            </Button>
          </div>
        }
      />

      {/* Summary bar */}
      <div className="flex gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-[12px] px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-[#6B7280]">Total products</span>
          <span className="text-lg font-semibold text-[#111827]">{products.length}</span>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-[12px] px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-[#6B7280]">Low stock</span>
          <span className="text-lg font-semibold text-[#D97706]">{products.filter(p => p.quantity <= p.minStock && p.quantity > 0).length}</span>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-[12px] px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-[#6B7280]">Out of stock</span>
          <span className="text-lg font-semibold text-[#DC2626]">{products.filter(p => p.quantity === 0).length}</span>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-80">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-[10px] text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]"
          />
        </div>
        <div className="flex gap-1.5">
          {([['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']] as [StockFilter, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors cursor-pointer
                ${filter === id ? 'bg-[#4338CA] text-white' : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 6l8-4 8 4v8l-8 4-8-4V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="No products yet"
          description="Add your first product to start tracking stock."
          action={<Button onClick={() => navigate('add-product')}>Add product</Button>}
        />
      ) : (
        <Card padding="none">
          <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px_80px] gap-4 px-5 py-3 border-b border-[#F3F4F6] text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">
            <span>Product</span>
            <span className="text-right">In stock</span>
            <span className="text-right">Unit</span>
            <span className="text-right">Price</span>
            <span className="text-right">Min stock</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-[#F7F8FA]">
            {filtered.map(p => {
              const isLow = p.quantity <= p.minStock && p.quantity > 0;
              const isOut = p.quantity === 0;
              const status = isOut ? 'error' : isLow ? 'warning' : 'success';
              const statusLabel = isOut ? 'Out' : isLow ? 'Low' : 'OK';
              return (
                <button
                  key={p.id}
                  onClick={() => navigate('product-detail', { selectedProductId: p.id })}
                  className="w-full hover:bg-[#F7F8FA] transition-colors text-left"
                >
                  <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px_80px] gap-4 px-5 py-3.5 items-center">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{p.name}</p>
                      <p className="text-xs text-[#9CA3AF]">{p.category}</p>
                    </div>
                    <p className={`text-sm font-semibold text-right ${isOut ? 'text-[#DC2626]' : isLow ? 'text-[#D97706]' : 'text-[#111827]'}`}>
                      {p.quantity}
                    </p>
                    <p className="text-sm text-[#6B7280] text-right">{p.unit}</p>
                    <p className="text-sm text-[#374151] text-right">{fmt(p.price)}/{p.unit}</p>
                    <p className="text-sm text-[#9CA3AF] text-right">{p.minStock} {p.unit}</p>
                    <div className="flex justify-end">
                      <Badge variant={status}>{statusLabel}</Badge>
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{p.name}</p>
                      <p className="text-xs text-[#9CA3AF]">{fmt(p.price)}/{p.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isOut ? 'text-[#DC2626]' : isLow ? 'text-[#D97706]' : 'text-[#111827]'}`}>
                        {p.quantity} {p.unit}
                      </span>
                      <Badge variant={status}>{statusLabel}</Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Product Detail ────────────────────────────────────────────────────────────
export function ProductDetail() {
  const { products, selectedProductId, navigate, addStockHistory, showToast } = useApp();
  const product = products.find(p => p.id === selectedProductId) ?? products[0];
  const [addingStock, setAddingStock] = useState(false);
  const [addQty, setAddQty] = useState('');

  if (!product) return null;
  const isLow = product.quantity <= product.minStock && product.quantity > 0;
  const isOut = product.quantity === 0;

  function handleAddStock() {
    const qty = parseFloat(addQty);
    if (!qty || qty <= 0) return;
    addStockHistory(product.id, { type: 'in', quantity: qty, reason: 'Stock replenishment', date: new Date() });
    showToast('success', `Added ${qty} ${product.unit} of ${product.name}`);
    setAddQty('');
    setAddingStock(false);
  }

  return (
    <div className="max-w-[680px] mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('inventory')} className="text-[#6B7280] hover:text-[#374151]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="text-[22px] font-semibold text-[#111827]">{product.name}</h1>
      </div>

      <div className="space-y-4">
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9CA3AF]">Current stock</p>
              <p className={`text-[36px] font-bold leading-none mt-1 ${isOut ? 'text-[#DC2626]' : isLow ? 'text-[#D97706]' : 'text-[#111827]'}`}>
                {product.quantity}
                <span className="text-lg font-medium ml-1.5 text-[#9CA3AF]">{product.unit}</span>
              </p>
              {isLow && !isOut && <p className="text-sm text-[#D97706] mt-1.5">Below minimum stock ({product.minStock} {product.unit})</p>}
              {isOut && <p className="text-sm text-[#DC2626] mt-1.5">Out of stock</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setAddingStock(true)}>Add stock</Button>
              <Button variant="secondary" size="sm">Edit product</Button>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Selling price</span>
              <span className="font-medium text-[#111827]">{fmt(product.price)}/{product.unit}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Category</span>
              <span className="font-medium text-[#111827]">{product.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Minimum stock</span>
              <span className="font-medium text-[#111827]">{product.minStock} {product.unit}</span>
            </div>
          </div>
        </Card>

        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-[#F3F4F6]">
            <h3 className="text-sm font-semibold text-[#374151]">Recent stock activity</h3>
          </div>
          <div className="divide-y divide-[#F7F8FA]">
            {[...product.history].reverse().slice(0, 6).map(event => (
              <div key={event.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-[#111827]">{event.reason}</p>
                  <p className="text-xs text-[#9CA3AF]">{event.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <Badge variant={event.type === 'in' ? 'success' : 'error'}>
                  {event.type === 'in' ? '+' : '−'}{event.quantity} {product.unit}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Add stock modal */}
      {addingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAddingStock(false)}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-[18px] w-full max-w-sm p-5 shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#111827] mb-4">Add stock — {product.name}</h3>
            <div className="space-y-4">
              <Input
                label={`Quantity to add (${product.unit})`}
                type="number"
                min="0"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <div className="bg-[#F7F8FA] rounded-[10px] px-4 py-2.5 flex justify-between text-sm">
                <span className="text-[#6B7280]">New total</span>
                <span className="font-semibold text-[#111827]">{product.quantity + (parseFloat(addQty) || 0)} {product.unit}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setAddingStock(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddStock}>Add stock</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Product ───────────────────────────────────────────────────────────────
export function AddProduct() {
  const { navigate, addProduct, showToast } = useApp();
  const [form, setForm] = useState({ name: '', category: 'Grains', quantity: '', unit: 'kg', price: '', minStock: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.quantity || parseFloat(form.quantity) < 0) e.quantity = 'Enter valid quantity';
    if (!form.price || parseFloat(form.price) <= 0) e.price = 'Enter valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      addProduct({
        name: form.name,
        category: form.category,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        price: parseFloat(form.price),
        minStock: parseFloat(form.minStock || '5'),
      });
      showToast('success', `${form.name} added to inventory`);
      navigate('inventory');
    }, 500);
  }

  return (
    <div className="max-w-[600px] mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('inventory')} className="text-[#6B7280] hover:text-[#374151]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="text-[22px] font-semibold text-[#111827]">Add product</h1>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 space-y-4">
        <Input label="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rice" error={errors.name} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option>Grains</option>
            <option>Pulses</option>
            <option>Oils</option>
            <option>Household</option>
            <option>Beverages</option>
            <option>Dairy</option>
            <option>Other</option>
          </Select>
          <Select label="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
            <option value="kg">kg</option>
            <option value="g">grams</option>
            <option value="L">litres</option>
            <option value="packets">packets</option>
            <option value="pieces">pieces</option>
            <option value="bottles">bottles</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Opening quantity" type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" error={errors.quantity} />
          <Input label="Selling price (₹)" type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" error={errors.price} />
        </div>
        <Input label="Minimum stock (alert threshold)" type="number" min="0" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} placeholder="5" hint="You'll be alerted when stock falls below this." />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => navigate('inventory')}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} loading={saving}>Add product</Button>
        </div>
      </div>
    </div>
  );
}

// ── Upload Stock ──────────────────────────────────────────────────────────────
type UploadState = 'idle' | 'uploading' | 'processing' | 'review';

interface ExtractedRow { product: string; quantity: string; unit: string; needsReview: boolean; }

function UploadStock({ onBack }: { onBack: () => void }) {
  const { showToast, navigate } = useApp();
  const [state, setState] = useState<UploadState>('idle');
  const [rows, setRows] = useState<ExtractedRow[]>([
    { product: 'Rice', quantity: '25', unit: 'kg', needsReview: false },
    { product: 'Sugar', quantity: '18', unit: 'kg', needsReview: false },
    { product: 'Oil', quantity: '8', unit: 'L', needsReview: false },
    { product: 'Dal', quantity: '10', unit: 'kg', needsReview: false },
    { product: 'Surf', quantity: '12', unit: 'packets', needsReview: true },
  ]);

  function handleUpload() {
    setState('uploading');
    setTimeout(() => setState('processing'), 1200);
    setTimeout(() => setState('review'), 2800);
  }

  function handleConfirm() {
    showToast('success', 'Stock updated from uploaded record');
    navigate('inventory');
  }

  return (
    <div className="max-w-[680px] mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#6B7280] hover:text-[#374151]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[#111827]">Upload stock</h1>
          <p className="text-sm text-[#6B7280]">Take a photo of your handwritten stock record.</p>
        </div>
      </div>

      {state === 'idle' && (
        <div className="space-y-4">
          <button
            onClick={handleUpload}
            className="w-full border-2 border-dashed border-[#C7D2FE] rounded-[16px] p-12 flex flex-col items-center gap-4 hover:border-[#4338CA] hover:bg-[#EEF2FF]/50 transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-[14px] bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] group-hover:scale-105 transition-transform">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4v16M6 10l8-8 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 22h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-[#374151]">Take photo or upload image</p>
              <p className="text-sm text-[#9CA3AF] mt-1">Clear photos work best.</p>
            </div>
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={handleUpload}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/><path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Take photo
            </Button>
            <Button className="flex-1" onClick={handleUpload}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v9M3 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Upload image
            </Button>
          </div>
        </div>
      )}

      {(state === 'uploading' || state === 'processing') && (
        <Card padding="lg" className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4338CA] dot-1" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#4338CA] dot-2" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#4338CA] dot-3" />
          </div>
          <div>
            <p className="font-semibold text-[#111827]">Reading your stock…</p>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {state === 'uploading' ? 'Image uploaded' : 'Reading entries…'}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-[#9CA3AF]">
            <span className={`flex items-center gap-1.5 ${(state === 'uploading' || state === 'processing') ? 'text-[#16A34A]' : ''}`}>
              <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] border-[#16A34A] text-[#16A34A]">✓</span>
              Image uploaded
            </span>
            <span className={`flex items-center gap-1.5 ${state === 'processing' ? 'text-[#4338CA]' : ''}`}>
              <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px]">2</span>
              Reading entries
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px]">3</span>
              Preparing review
            </span>
          </div>
        </Card>
      )}

      {state === 'review' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Review extracted stock</h2>
            <p className="text-sm text-[#6B7280] mt-1">Check the entries before adding them to inventory.</p>
          </div>
          <Card padding="none">
            <div className="grid grid-cols-[1fr_80px_80px_100px] gap-3 px-5 py-3 border-b border-[#F3F4F6] text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">
              <span>Product</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Unit</span>
              <span className="text-right">Status</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_80px_100px] gap-3 px-5 py-3 items-center border-b border-[#F7F8FA] last:border-0">
                <input
                  value={row.product}
                  onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, product: e.target.value } : x))}
                  className="text-sm text-[#111827] border-b border-transparent focus:border-[#4338CA] outline-none pb-0.5"
                />
                <input
                  value={row.quantity}
                  type="number"
                  onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                  className="text-sm text-right text-[#111827] border-b border-transparent focus:border-[#4338CA] outline-none pb-0.5"
                />
                <input
                  value={row.unit}
                  onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                  className="text-sm text-right text-[#111827] border-b border-transparent focus:border-[#4338CA] outline-none pb-0.5"
                />
                <div className="flex justify-end">
                  {row.needsReview
                    ? <Badge variant="warning">Needs review</Badge>
                    : <Badge variant="success">Ready</Badge>
                  }
                </div>
              </div>
            ))}
          </Card>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setState('idle')}>Cancel</Button>
            <Button className="flex-1" onClick={handleConfirm}>Confirm stock</Button>
          </div>
        </div>
      )}
    </div>
  );
}
