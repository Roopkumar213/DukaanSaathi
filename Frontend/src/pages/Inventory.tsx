import { useState, useRef } from 'react';
import { useApp, fmt } from '../store';
import { Button, Card, Badge, SectionHeader, EmptyState, Input, Select } from '../components/ui';
import {
  processStockImage,
  createSampleStockSlipDataUrl,
  ExtractedStockItem,
  OCRProgress,
} from '../api/ocrService';

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[#64748B] font-medium">Total products</span>
          <span className="text-xl font-semibold text-[#0F172A]">{products.length}</span>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[#64748B] font-medium">Low stock</span>
          <span className="text-xl font-semibold text-[#B45309]">{products.filter(p => p.quantity <= p.minStock && p.quantity > 0).length}</span>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[#64748B] font-medium">Out of stock</span>
          <span className="text-xl font-semibold text-[#DC2626]">{products.filter(p => p.quantity === 0).length}</span>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-[8px] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF] transition-colors"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {([['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']] as [StockFilter, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-[6px] text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap
                ${filter === id ? 'bg-[#1E40AF] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#BFDBFE]'}`}
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
          title="No products found"
          description="Add your first product to start tracking stock."
          action={<Button onClick={() => navigate('add-product')}>Add product</Button>}
        />
      ) : (
        <Card padding="none">
          <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px_80px] gap-4 px-5 py-3 border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            <span>Product</span>
            <span className="text-right">In stock</span>
            <span className="text-right">Unit</span>
            <span className="text-right">Price</span>
            <span className="text-right">Min stock</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map(p => {
              const isLow = p.quantity <= p.minStock && p.quantity > 0;
              const isOut = p.quantity === 0;
              const status = isOut ? 'error' : isLow ? 'warning' : 'success';
              const statusLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
              return (
                <button
                  key={p.id}
                  onClick={() => navigate('product-detail', { selectedProductId: p.id })}
                  className="w-full hover:bg-[#F8F9FA] transition-colors text-left cursor-pointer"
                >
                  <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px_80px] gap-4 px-5 py-3.5 items-center">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{p.name}</p>
                      <p className="text-xs text-[#64748B]">{p.category}</p>
                    </div>
                    <p className={`text-sm font-semibold text-right ${isOut ? 'text-[#DC2626]' : isLow ? 'text-[#B45309]' : 'text-[#0F172A]'}`}>
                      {p.quantity}
                    </p>
                    <p className="text-sm text-[#64748B] text-right">{p.unit}</p>
                    <p className="text-sm text-[#334155] text-right">{fmt(p.price)}/{p.unit}</p>
                    <p className="text-sm text-[#64748B] text-right">{p.minStock} {p.unit}</p>
                    <div className="flex justify-end">
                      <Badge variant={status}>{statusLabel}</Badge>
                    </div>
                  </div>
                  {/* Mobile (Section 14) */}
                  <div className="md:hidden p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{p.name}</p>
                        <p className="text-xs text-[#64748B]">{p.category} · {fmt(p.price)}/{p.unit}</p>
                      </div>
                      <Badge variant={status}>{statusLabel}</Badge>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] text-xs">
                      <span className="text-[#64748B]">Available: <strong className={isOut ? 'text-[#DC2626]' : isLow ? 'text-[#B45309]' : 'text-[#0F172A]'}>{p.quantity} {p.unit}</strong></span>
                      <span className="text-[#64748B]">Min: {p.minStock} {p.unit}</span>
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
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-[10px] w-full max-w-sm p-5 shadow-md border border-[#E2E8F0] animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#0F172A] mb-4">Add stock — {product.name}</h3>
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
              <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-[8px] px-4 py-2.5 flex justify-between text-sm">
                <span className="text-[#64748B]">New total</span>
                <span className="font-semibold text-[#0F172A]">{product.quantity + (parseFloat(addQty) || 0)} {product.unit}</span>
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
        <button onClick={() => navigate('inventory')} className="text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="text-[22px] font-semibold text-[#0F172A]">Add product</h1>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[10px] p-5 space-y-4">
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

// ── Upload Stock & Document OCR Scanner ──────────────────────────────────────
type UploadScannerState = 'idle' | 'scanning' | 'review';

function UploadStock({ onBack }: { onBack: () => void }) {
  const { products, addProduct, addStockHistory, showToast } = useApp();
  const [state, setState] = useState<UploadScannerState>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ name: string; size: string } | null>(null);
  const [progress, setProgress] = useState<OCRProgress>({ progress: 0, status: '' });
  const [rawText, setRawText] = useState<string>('');
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [items, setItems] = useState<ExtractedStockItem[]>([]);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Process selected file or camera image
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setImageMeta({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });
    setState('scanning');
    setProgress({ progress: 5, status: 'Initializing OCR engine...' });

    try {
      const res = await processStockImage(file, p => setProgress(p));
      setRawText(res.text);
      setOcrConfidence(res.confidence);

      if (res.items.length === 0) {
        showToast('info', 'OCR scanned the image, but could not detect item lines. You can add entries manually.');
        setItems([
          {
            id: 'item_manual_1',
            product: '',
            quantity: 1,
            unit: 'kg',
            price: 50,
            confidence: 50,
            needsReview: true,
          },
        ]);
      } else {
        setItems(res.items);
        showToast('success', `OCR detected ${res.items.length} stock line items`);
      }
      setState('review');
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'Failed to scan document with OCR');
      setState('idle');
    }
  }

  // Load sample stock slip for 1-click test
  async function handleSampleSlip() {
    const sampleDataUrl = createSampleStockSlipDataUrl();
    setImagePreview(sampleDataUrl);
    setImageMeta({
      name: 'Mahalaxmi_Wholesale_Inward.png',
      size: '142 KB (Demo Slip)',
    });
    setState('scanning');
    setProgress({ progress: 5, status: 'Initializing OCR engine...' });

    try {
      const res = await processStockImage(sampleDataUrl, p => setProgress(p));
      setRawText(res.text);
      setOcrConfidence(res.confidence);
      setItems(res.items);
      setState('review');
      showToast('success', `Scanned demo slip: ${res.items.length} items extracted`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to run OCR on sample slip');
      setState('idle');
    }
  }

  function handleReset() {
    setImagePreview(null);
    setImageMeta(null);
    setRawText('');
    setShowRawText(false);
    setItems([]);
    setProgress({ progress: 0, status: '' });
    setState('idle');
  }

  function handleAddItem() {
    setItems(prev => [
      ...prev,
      {
        id: 'item_' + Math.random().toString(36).substring(2, 9),
        product: '',
        quantity: 1,
        unit: 'kg',
        price: 50,
        confidence: 100,
        needsReview: false,
      },
    ]);
  }

  function handleUpdateItem(id: string, updates: Partial<ExtractedStockItem>) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }

  function handleDeleteItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id));
  }

  // Commit extracted items to store & backend
  async function handleCommit() {
    const validItems = items.filter(i => i.product.trim().length > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      showToast('error', 'Please ensure at least one valid product name and quantity is filled');
      return;
    }

    setIsCommitting(true);
    let addedCount = 0;
    let updatedCount = 0;

    try {
      for (const item of validItems) {
        const trimmedName = item.product.trim();
        const existing = products.find(
          p => p.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (existing) {
          // Increment existing inventory stock
          await addStockHistory(existing.id, {
            date: new Date(),
            quantity: item.quantity,
            type: 'in',
            reason: 'Stock Inward (Photo OCR)',
          });
          updatedCount++;
        } else {
          // Register new product into catalog
          await addProduct({
            name: trimmedName,
            category: item.category || 'Grains & Staples',
            quantity: item.quantity,
            unit: item.unit,
            price: item.price || 60,
            minStock: 5,
          });
          addedCount++;
        }
      }

      showToast(
        'success',
        `Stock ingested: ${addedCount} new products registered, ${updatedCount} existing stocks updated`
      );
      onBack();
    } catch (err: any) {
      console.error('Error committing stock:', err);
      showToast('error', 'Error occurred while saving items to inventory');
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-[8px] border border-[#E2E8F0] bg-white flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] transition-colors cursor-pointer"
            title="Back to Inventory"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1E40AF]">Smart Stock Inward</span>
              <span className="text-xs text-[#94A3B8]">/</span>
              <span className="text-xs text-[#64748B]">Document OCR</span>
            </div>
            <h1 className="text-[22px] font-semibold text-[#0F172A] mt-0.5">Scan & Ingest Stock Record</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state === 'idle' && (
            <button
              onClick={handleSampleSlip}
              className="px-3.5 py-1.5 text-xs font-medium text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] rounded-[6px] hover:bg-[#DBEAFE] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Try Sample Kirana Slip
            </button>
          )}

          {state === 'idle' && <Badge variant="default">Ready to scan</Badge>}
          {state === 'scanning' && <Badge variant="info">OCR Analyzing ({progress.progress}%)</Badge>}
          {state === 'review' && <Badge variant="success">Reviewing {items.length} Items</Badge>}
        </div>
      </div>

      {/* Main Dual-Pane Scanner Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Document Scanner Hub ─────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Document Image Source
              </h2>
              {imageMeta && (
                <span className="text-xs text-[#64748B] truncate max-w-[160px]" title={imageMeta.name}>
                  {imageMeta.name}
                </span>
              )}
            </div>

            {/* Hidden file & camera inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />

            {/* Upload Dropzone / Live Document View */}
            {!imagePreview ? (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-[10px] p-8 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[#1E40AF] bg-[#EFF6FF]'
                    : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#1E40AF] hover:bg-[#F1F5F9]'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-[8px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E40AF]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Click or drop photo here</p>
                  <p className="text-xs text-[#64748B] mt-1">Supports PNG, JPG, WebP stock slips or invoices</p>
                </div>

                <div className="flex gap-2 w-full pt-2" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 py-2 px-3 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-[6px] hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 text-xs font-medium text-white bg-[#1E40AF] rounded-[6px] hover:bg-[#1D4ED8] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Browse File
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Document Display with Scanning Animation */}
                <div className="relative rounded-[8px] overflow-hidden border border-[#CBD5E1] bg-[#0F172A] flex items-center justify-center max-h-[380px]">
                  <img
                    src={imagePreview}
                    alt="Document preview"
                    className={`w-full max-h-[380px] object-contain ${state === 'scanning' ? 'opacity-85 filter brightness-95' : ''}`}
                  />

                  {/* High-tech laser scanner bar when analyzing */}
                  {state === 'scanning' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-0 right-0 h-[3px] bg-[#3B82F6] shadow-[0_0_12px_#3B82F6] animate-scan-laser z-10" />
                      <div className="absolute inset-0 bg-[#1E40AF]/15" />
                    </div>
                  )}
                </div>

                {/* Progress bar during scanning */}
                {state === 'scanning' && (
                  <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-[#1E40AF]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#1E40AF] animate-ping" />
                        {progress.status || 'Extracting characters...'}
                      </span>
                      <span>{progress.progress}%</span>
                    </div>
                    <div className="w-full bg-[#BFDBFE] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1E40AF] h-full transition-all duration-300 ease-out"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Document Controls */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#64748B]">
                    {ocrConfidence > 0 ? `OCR Confidence: ${ocrConfidence}%` : 'Image ready'}
                  </span>
                  <div className="flex items-center gap-2">
                    {rawText && (
                      <button
                        onClick={() => setShowRawText(!showRawText)}
                        className="text-[#1E40AF] hover:underline font-medium cursor-pointer"
                      >
                        {showRawText ? 'Hide Raw OCR' : 'View Raw OCR'}
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      disabled={state === 'scanning'}
                      className="text-[#B91C1C] hover:underline font-medium cursor-pointer disabled:opacity-40"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>

                {/* Collapsible Raw OCR text drawer */}
                {showRawText && rawText && (
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] space-y-1 text-xs animate-fade-in">
                    <p className="font-semibold text-[#0F172A]">Raw Extracted OCR Text:</p>
                    <pre className="text-[11px] text-[#475569] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto bg-white p-2 border border-[#CBD5E1] rounded">
                      {rawText}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Quick Guidance Box */}
          <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-[8px] text-xs text-[#64748B] space-y-1.5">
            <p className="font-semibold text-[#0F172A] flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Kirana OCR Recognition Tips:
            </p>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>Works with handwritten slips, wholesale memos & challans.</li>
              <li>Recognizes units: <span className="text-[#0F172A] font-medium">kg, gms, L, packets, pcs, bags, boxes</span>.</li>
              <li>Existing shop products update current stock automatically.</li>
            </ul>
          </div>
        </div>

        {/* ── Right Column: Extracted Stock Table & Sync ─────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          {state === 'idle' && (
            <Card padding="lg" className="text-center py-16 space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] mx-auto flex items-center justify-center text-[#1E40AF]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-semibold text-[#0F172A]">No Document Processed Yet</h3>
                <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                  Take a photo of your handwritten stock memo or upload a distributor invoice on the left. The OCR engine will automatically extract items, quantities, and match them with your store inventory.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="secondary" onClick={handleSampleSlip}>
                  Load Demo Kirana Slip
                </Button>
              </div>
            </Card>
          )}

          {state === 'scanning' && (
            <Card padding="lg" className="space-y-4 py-12 text-center">
              <div className="w-10 h-10 border-3 border-[#BFDBFE] border-t-[#1E40AF] rounded-full animate-spin-slow mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-[#0F172A]">Reading Document Records...</h3>
                <p className="text-xs text-[#64748B] mt-1">Extracting line items, quantities, and catalog associations.</p>
              </div>
              <div className="max-w-sm mx-auto space-y-2 pt-2">
                <div className="h-4 bg-[#F1F5F9] rounded animate-pulse" />
                <div className="h-4 bg-[#F1F5F9] rounded animate-pulse w-4/5 mx-auto" />
                <div className="h-4 bg-[#F1F5F9] rounded animate-pulse w-3/5 mx-auto" />
              </div>
            </Card>
          )}

          {state === 'review' && (
            <div className="space-y-4 animate-fade-in">
              {/* Header with counts and Add Item button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[10px] border border-[#E2E8F0]">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    Extracted Line Items ({items.length})
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Review and adjust product details before committing to inventory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] rounded-[6px] hover:bg-[#DBEAFE] transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="7" y1="1" x2="7" y2="13" />
                    <line x1="1" y1="7" x2="13" y2="7" />
                  </svg>
                  Add Line Item
                </button>
              </div>

              {/* Items Table */}
              <Card padding="none" className="overflow-hidden border border-[#E2E8F0]">
                <div className="hidden md:grid md:grid-cols-[1.8fr_90px_100px_100px_140px_40px] gap-2 px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <span>Product Name</span>
                  <span className="text-right">Quantity</span>
                  <span>Unit</span>
                  <span className="text-right">Rate (₹)</span>
                  <span>Catalog Status</span>
                  <span></span>
                </div>

                <div className="divide-y divide-[#F1F5F9] max-h-[480px] overflow-y-auto">
                  {items.map((item, idx) => {
                    const matched = products.find(
                      p => p.name.toLowerCase() === item.product.trim().toLowerCase()
                    );

                    return (
                      <div
                        key={item.id}
                        className={`p-3 md:px-4 md:py-2.5 grid grid-cols-1 md:grid-cols-[1.8fr_90px_100px_100px_140px_40px] gap-2 items-center text-xs ${
                          item.needsReview ? 'bg-[#FFFBEB]/50' : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {/* Product Name */}
                        <div>
                          <input
                            type="text"
                            value={item.product}
                            placeholder="e.g. Basmati Rice"
                            onChange={e => handleUpdateItem(item.id, { product: e.target.value })}
                            className="w-full px-2 py-1 text-xs font-medium text-[#0F172A] border border-[#CBD5E1] rounded-[6px] focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] outline-none"
                          />
                          {item.rawLine && (
                            <span className="text-[10px] text-[#94A3B8] truncate block mt-0.5" title={item.rawLine}>
                              Raw: "{item.rawLine}"
                            </span>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.quantity}
                            onChange={e =>
                              handleUpdateItem(item.id, {
                                quantity: parseFloat(e.target.value) || 0,
                                needsReview: false,
                              })
                            }
                            className="w-full px-2 py-1 text-xs text-right font-medium text-[#0F172A] border border-[#CBD5E1] rounded-[6px] focus:border-[#1E40AF] outline-none"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <select
                            value={item.unit}
                            onChange={e => handleUpdateItem(item.id, { unit: e.target.value })}
                            className="w-full px-2 py-1 text-xs font-medium text-[#0F172A] border border-[#CBD5E1] rounded-[6px] focus:border-[#1E40AF] outline-none bg-white"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="L">L</option>
                            <option value="ml">ml</option>
                            <option value="packets">packets</option>
                            <option value="pcs">pcs</option>
                            <option value="bags">bags</option>
                            <option value="boxes">boxes</option>
                            <option value="bottles">bottles</option>
                            <option value="dozen">dozen</option>
                          </select>
                        </div>

                        {/* Unit Price */}
                        <div>
                          <input
                            type="number"
                            min="0"
                            placeholder="Price"
                            value={item.price || ''}
                            onChange={e =>
                              handleUpdateItem(item.id, {
                                price: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-2 py-1 text-xs text-right font-medium text-[#0F172A] border border-[#CBD5E1] rounded-[6px] focus:border-[#1E40AF] outline-none"
                          />
                        </div>

                        {/* Catalog Match Status */}
                        <div>
                          {matched ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]"
                              title={`Current stock: ${matched.quantity} ${matched.unit}. Ingesting will add ${item.quantity} ${item.unit}.`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]" />
                              Updates Existing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                              New Product
                            </span>
                          )}
                        </div>

                        {/* Delete Row */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Summary Bar & Commit Action */}
              <div className="p-4 bg-white border border-[#E2E8F0] rounded-[10px] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#64748B] text-center sm:text-left">
                  <p className="font-semibold text-[#0F172A]">
                    Total {items.length} items ready to sync
                  </p>
                  <p className="mt-0.5">
                    Existing stock will be incremented; new products will be added to your Dukaan catalog.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="secondary" onClick={handleReset} className="flex-1 sm:flex-none">
                    Clear / Rescan
                  </Button>
                  <Button
                    onClick={handleCommit}
                    loading={isCommitting}
                    className="flex-1 sm:flex-none bg-[#1E40AF] hover:bg-[#1D4ED8]"
                  >
                    Commit to Inventory
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
