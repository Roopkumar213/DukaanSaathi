import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Page =
  | 'overview'
  | 'sales'
  | 'sale-detail'
  | 'inventory'
  | 'product-detail'
  | 'add-product'
  | 'upload-stock'
  | 'khata'
  | 'customer-detail'
  | 'payments'
  | 'ai-assistant'
  | 'activity'
  | 'settings';

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  minStock: number;
  history: StockEvent[];
}

export interface StockEvent {
  id: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  date: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  balance: number;
  transactions: KhataTransaction[];
}

export interface KhataTransaction {
  id: string;
  type: 'credit' | 'debit' | 'sale';
  amount: number;
  note: string;
  date: Date;
}

export interface Sale {
  id: string;
  customer: string;
  items: SaleItem[];
  total: number;
  received: number;
  outstanding: number;
  status: 'paid' | 'partial' | 'credit';
  paymentMode: 'cash' | 'upi' | 'card';
  date: Date;
}

export interface SaleItem {
  product: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface ActivityEntry {
  id: string;
  type: 'sale' | 'inventory' | 'payment' | 'khata';
  title: string;
  description: string;
  date: Date;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const initialProducts: Product[] = [
  {
    id: 'rice',
    name: 'Rice',
    category: 'Grains',
    quantity: 23,
    unit: 'kg',
    price: 60,
    minStock: 5,
    history: [
      { id: '1', type: 'in', quantity: 25, reason: 'Initial stock', date: new Date('2026-09-17T08:00:00') },
      { id: '2', type: 'out', quantity: 2, reason: 'Sale to Ramesh', date: new Date('2026-09-18T10:42:00') },
    ],
  },
  {
    id: 'sugar',
    name: 'Sugar',
    category: 'Grains',
    quantity: 18,
    unit: 'kg',
    price: 48,
    minStock: 5,
    history: [
      { id: '3', type: 'in', quantity: 20, reason: 'Initial stock', date: new Date('2026-09-17T08:00:00') },
      { id: '4', type: 'out', quantity: 1, reason: 'Sale to Lakshmi', date: new Date('2026-09-18T10:35:00') },
      { id: '5', type: 'out', quantity: 1, reason: 'Sale to Priya', date: new Date('2026-09-18T09:10:00') },
    ],
  },
  {
    id: 'surf',
    name: 'Surf',
    category: 'Household',
    quantity: 12,
    unit: 'packets',
    price: 35,
    minStock: 10,
    history: [
      { id: '6', type: 'in', quantity: 15, reason: 'Initial stock', date: new Date('2026-09-17T08:00:00') },
      { id: '7', type: 'out', quantity: 3, reason: 'Sales', date: new Date('2026-09-18T09:30:00') },
    ],
  },
  {
    id: 'dal',
    name: 'Dal',
    category: 'Pulses',
    quantity: 10,
    unit: 'kg',
    price: 110,
    minStock: 5,
    history: [
      { id: '8', type: 'in', quantity: 10, reason: 'Initial stock', date: new Date('2026-09-17T08:00:00') },
    ],
  },
  {
    id: 'oil',
    name: 'Oil',
    category: 'Oils',
    quantity: 4,
    unit: 'L',
    price: 140,
    minStock: 5,
    history: [
      { id: '9', type: 'in', quantity: 8, reason: 'Initial stock', date: new Date('2026-09-17T08:00:00') },
      { id: '10', type: 'out', quantity: 4, reason: 'Sales', date: new Date('2026-09-18T09:00:00') },
    ],
  },
];

const initialCustomers: Customer[] = [
  {
    id: 'ramesh',
    name: 'Ramesh',
    phone: '98765 43210',
    balance: 160,
    transactions: [
      { id: 't1', type: 'sale', amount: 120, note: 'Previous balance', date: new Date('2026-09-15T10:00:00') },
      { id: 't2', type: 'sale', amount: 340, note: 'Rice 2kg + misc', date: new Date('2026-09-18T10:42:00') },
      { id: 't3', type: 'debit', amount: 300, note: 'Payment received', date: new Date('2026-09-18T10:42:00') },
    ],
  },
  {
    id: 'lakshmi',
    name: 'Lakshmi',
    phone: '91234 56789',
    balance: 0,
    transactions: [
      { id: 't4', type: 'sale', amount: 48, note: 'Sugar 1kg', date: new Date('2026-09-18T10:35:00') },
      { id: 't5', type: 'debit', amount: 48, note: 'Payment received', date: new Date('2026-09-18T10:35:00') },
    ],
  },
  {
    id: 'suresh',
    name: 'Suresh',
    phone: '90000 11111',
    balance: 540,
    transactions: [
      { id: 't6', type: 'sale', amount: 280, note: 'Dal 2kg + Oil 1L', date: new Date('2026-09-16T11:00:00') },
      { id: 't7', type: 'sale', amount: 260, note: 'Rice 2kg + Sugar 1kg', date: new Date('2026-09-17T09:30:00') },
    ],
  },
  { id: 'priya', name: 'Priya', phone: '99887 76655', balance: 0, transactions: [] },
  { id: 'ganesh', name: 'Ganesh', phone: '88776 65544', balance: 180, transactions: [
    { id: 't8', type: 'sale', amount: 180, note: 'Surf 5 packets + Sugar 1kg', date: new Date('2026-09-17T14:00:00') },
  ]},
  { id: 'meena', name: 'Meena', phone: '77665 54433', balance: 320, transactions: [
    { id: 't9', type: 'sale', amount: 320, note: 'Dal 2kg + Oil 1L', date: new Date('2026-09-17T16:00:00') },
  ]},
  { id: 'raju', name: 'Raju', phone: '66554 43322', balance: 90, transactions: [
    { id: 't10', type: 'sale', amount: 90, note: 'Sugar 1kg + Rice 1kg', date: new Date('2026-09-18T08:30:00') },
  ]},
  { id: 'kavya', name: 'Kavya', phone: '55443 32211', balance: 210, transactions: [
    { id: 't11', type: 'sale', amount: 210, note: 'Oil 1L + Surf 2 packets', date: new Date('2026-09-17T12:00:00') },
  ]},
  { id: 'mohan', name: 'Mohan', phone: '44332 21100', balance: 0, transactions: [] },
  { id: 'sunita', name: 'Sunita', phone: '33221 10099', balance: 760, transactions: [
    { id: 't12', type: 'sale', amount: 760, note: 'Dal 5kg + Rice 3kg + Oil 2L', date: new Date('2026-09-15T10:00:00') },
  ]},
  { id: 'vijay', name: 'Vijay', phone: '22110 09988', balance: 0, transactions: [] },
  { id: 'anita', name: 'Anita', phone: '11009 98877', balance: 20, transactions: [
    { id: 't13', type: 'sale', amount: 20, note: 'Surf 1 packet', date: new Date('2026-09-18T09:45:00') },
  ]},
];

const initialSales: Sale[] = [
  {
    id: 'S1042',
    customer: 'Ramesh',
    items: [{ product: 'Rice', quantity: 2, unit: 'kg', price: 120, total: 240 }],
    total: 340,
    received: 300,
    outstanding: 40,
    status: 'partial',
    paymentMode: 'cash',
    date: new Date('2026-09-18T10:42:00'),
  },
  {
    id: 'S1041',
    customer: 'Lakshmi',
    items: [{ product: 'Sugar', quantity: 1, unit: 'kg', price: 48, total: 48 }],
    total: 48,
    received: 48,
    outstanding: 0,
    status: 'paid',
    paymentMode: 'upi',
    date: new Date('2026-09-18T10:35:00'),
  },
  {
    id: 'S1040',
    customer: 'Raju',
    items: [
      { product: 'Sugar', quantity: 1, unit: 'kg', price: 48, total: 48 },
      { product: 'Rice', quantity: 1, unit: 'kg', price: 60, total: 60 },
    ],
    total: 108,
    received: 0,
    outstanding: 108,
    status: 'credit',
    paymentMode: 'cash',
    date: new Date('2026-09-18T08:30:00'),
  },
  {
    id: 'S1039',
    customer: 'Anita',
    items: [{ product: 'Surf', quantity: 1, unit: 'packets', price: 35, total: 35 }],
    total: 35,
    received: 15,
    outstanding: 20,
    status: 'partial',
    paymentMode: 'cash',
    date: new Date('2026-09-18T09:45:00'),
  },
  {
    id: 'S1038',
    customer: 'Priya',
    items: [{ product: 'Sugar', quantity: 1, unit: 'kg', price: 48, total: 48 }],
    total: 48,
    received: 48,
    outstanding: 0,
    status: 'paid',
    paymentMode: 'cash',
    date: new Date('2026-09-18T09:10:00'),
  },
  {
    id: 'S1037',
    customer: 'Mohan',
    items: [{ product: 'Surf', quantity: 2, unit: 'packets', price: 35, total: 70 }],
    total: 70,
    received: 70,
    outstanding: 0,
    status: 'paid',
    paymentMode: 'upi',
    date: new Date('2026-09-18T09:00:00'),
  },
];

const initialActivity: ActivityEntry[] = [
  { id: 'a1', type: 'sale', title: 'Sale recorded', description: 'Ramesh purchased 2 kg Rice', date: new Date('2026-09-18T10:42:00') },
  { id: 'a2', type: 'inventory', title: 'Inventory updated', description: 'Rice −2 kg (23 kg remaining)', date: new Date('2026-09-18T10:42:00') },
  { id: 'a3', type: 'payment', title: 'Payment recorded', description: '₹300 received from Ramesh', date: new Date('2026-09-18T10:42:00') },
  { id: 'a4', type: 'khata', title: 'Khata updated', description: 'Ramesh has ₹160 outstanding', date: new Date('2026-09-18T10:42:00') },
  { id: 'a5', type: 'sale', title: 'Sale recorded', description: 'Lakshmi purchased 1 kg Sugar', date: new Date('2026-09-18T10:35:00') },
  { id: 'a6', type: 'payment', title: 'Payment recorded', description: '₹48 received from Lakshmi', date: new Date('2026-09-18T10:35:00') },
  { id: 'a7', type: 'sale', title: 'Sale recorded', description: 'Anita purchased 1 packet Surf', date: new Date('2026-09-18T09:45:00') },
  { id: 'a8', type: 'khata', title: 'Khata updated', description: 'Anita has ₹20 outstanding', date: new Date('2026-09-18T09:45:00') },
  { id: 'a9', type: 'sale', title: 'Sale recorded', description: 'Priya purchased 1 kg Sugar', date: new Date('2026-09-18T09:10:00') },
  { id: 'a10', type: 'sale', title: 'Sale recorded', description: 'Mohan purchased 2 packets Surf', date: new Date('2026-09-18T09:00:00') },
];

interface AppState {
  page: Page;
  selectedSaleId: string | null;
  selectedProductId: string | null;
  selectedCustomerId: string | null;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  activity: ActivityEntry[];
  toasts: Toast[];
  notifications: number;
  searchOpen: boolean;
}

interface AppContextType extends AppState {
  navigate: (page: Page, params?: Partial<AppState>) => void;
  addSale: (sale: Omit<Sale, 'id' | 'date'>) => Sale;
  addProduct: (product: Omit<Product, 'id' | 'history'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addStockHistory: (productId: string, event: Omit<StockEvent, 'id'>) => void;
  addCustomer: (name: string, phone?: string) => void;
  recordPayment: (customerId: string, amount: number, mode: string) => void;
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: string) => void;
  setSearchOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    page: 'overview',
    selectedSaleId: null,
    selectedProductId: null,
    selectedCustomerId: null,
    products: initialProducts,
    customers: initialCustomers,
    sales: initialSales,
    activity: initialActivity,
    toasts: [],
    notifications: 3,
    searchOpen: false,
  });

  const navigate = useCallback((page: Page, params?: Partial<AppState>) => {
    setState(s => ({ ...s, page, ...params }));
  }, []);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = makeId();
    setState(s => ({ ...s, toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) }));
  }, []);

  const addSale = useCallback((sale: Omit<Sale, 'id' | 'date'>) => {
    const newSale: Sale = { ...sale, id: `S${1000 + Math.floor(Math.random() * 999)}`, date: new Date() };
    setState(s => {
      const newProducts = s.products.map(p => {
        const item = sale.items.find(i => i.product.toLowerCase() === p.name.toLowerCase());
        if (!item) return p;
        return {
          ...p,
          quantity: Math.max(0, p.quantity - item.quantity),
          history: [...p.history, { id: makeId(), type: 'out' as const, quantity: item.quantity, reason: `Sale to ${sale.customer}`, date: new Date() }],
        };
      });
      const newCustomers = s.customers.map(c => {
        if (c.name.toLowerCase() !== sale.customer.toLowerCase()) return c;
        return {
          ...c,
          balance: c.balance + sale.outstanding,
          transactions: [...c.transactions, { id: makeId(), type: 'sale' as const, amount: sale.total, note: sale.items.map(i => `${i.product} ${i.quantity}${i.unit}`).join(', '), date: new Date() }],
        };
      });
      const newActivity: ActivityEntry[] = [
        { id: makeId(), type: 'sale', title: 'Sale recorded', description: `${sale.customer} purchased ${sale.items.map(i => `${i.quantity} ${i.unit} ${i.product}`).join(', ')}`, date: new Date() },
        ...sale.items.map(i => ({ id: makeId(), type: 'inventory' as const, title: 'Inventory updated', description: `${i.product} −${i.quantity} ${i.unit}`, date: new Date() })),
        ...(sale.received > 0 ? [{ id: makeId(), type: 'payment' as const, title: 'Payment recorded', description: `₹${sale.received} received from ${sale.customer}`, date: new Date() }] : []),
        ...(sale.outstanding > 0 ? [{ id: makeId(), type: 'khata' as const, title: 'Khata updated', description: `${sale.customer} has ₹${sale.outstanding + (s.customers.find(c => c.name.toLowerCase() === sale.customer.toLowerCase())?.balance || 0)} outstanding`, date: new Date() }] : []),
      ];
      return {
        ...s,
        sales: [newSale, ...s.sales],
        products: newProducts,
        customers: newCustomers,
        activity: [...newActivity, ...s.activity],
        selectedSaleId: newSale.id,
      };
    });
    return newSale as Sale;
  }, []);

  const addProduct = useCallback((product: Omit<Product, 'id' | 'history'>) => {
    const newProduct: Product = {
      ...product,
      id: makeId(),
      history: [{ id: makeId(), type: 'in', quantity: product.quantity, reason: 'Initial stock', date: new Date() }],
    };
    setState(s => ({
      ...s,
      products: [...s.products, newProduct],
      activity: [{ id: makeId(), type: 'inventory', title: 'Product added', description: `${product.name} — ${product.quantity} ${product.unit}`, date: new Date() }, ...s.activity],
    }));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setState(s => ({ ...s, products: s.products.map(p => p.id === id ? { ...p, ...updates } : p) }));
  }, []);

  const addStockHistory = useCallback((productId: string, event: Omit<StockEvent, 'id'>) => {
    setState(s => ({
      ...s,
      products: s.products.map(p => {
        if (p.id !== productId) return p;
        const newQty = event.type === 'in' ? p.quantity + event.quantity : Math.max(0, p.quantity - event.quantity);
        return { ...p, quantity: newQty, history: [...p.history, { ...event, id: makeId() }] };
      }),
      activity: [{ id: makeId(), type: 'inventory', title: 'Stock updated', description: `${s.products.find(p => p.id === productId)?.name} +${event.quantity}`, date: new Date() }, ...s.activity],
    }));
  }, []);

  const addCustomer = useCallback((name: string, phone?: string) => {
    setState(s => ({
      ...s,
      customers: [...s.customers, { id: makeId(), name, phone, balance: 0, transactions: [] }],
    }));
  }, []);

  const recordPayment = useCallback((customerId: string, amount: number, mode: string) => {
    setState(s => {
      const customer = s.customers.find(c => c.id === customerId);
      if (!customer) return s;
      const newCustomers = s.customers.map(c => {
        if (c.id !== customerId) return c;
        return {
          ...c,
          balance: Math.max(0, c.balance - amount),
          transactions: [...c.transactions, { id: makeId(), type: 'debit' as const, amount, note: `Payment received (${mode})`, date: new Date() }],
        };
      });
      return {
        ...s,
        customers: newCustomers,
        activity: [
          { id: makeId(), type: 'payment', title: 'Payment recorded', description: `₹${amount} received from ${customer.name}`, date: new Date() },
          { id: makeId(), type: 'khata', title: 'Khata updated', description: `${customer.name} — new balance ₹${Math.max(0, customer.balance - amount)}`, date: new Date() },
          ...s.activity,
        ],
      };
    });
  }, []);

  const setSearchOpen = useCallback((open: boolean) => {
    setState(s => ({ ...s, searchOpen: open }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      navigate,
      addSale,
      addProduct,
      updateProduct,
      addStockHistory,
      addCustomer,
      recordPayment,
      showToast,
      dismissToast,
      setSearchOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export function fmtDate(d: Date) {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = diff / 3600000;
  if (hours < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
