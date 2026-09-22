import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { productsApi } from './api/productsApi';
import { salesApi } from './api/salesApi';
import { customersApi } from './api/customersApi';
import { useAuth } from './context/AuthContext';

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
  | 'settings'
  | 'terms-of-service'
  | 'privacy-policy';

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
  loadingData: boolean;
}

interface AppContextType extends AppState {
  navigate: (page: Page, params?: Partial<AppState>) => void;
  addSale: (sale: Omit<Sale, 'id' | 'date'>) => Promise<Sale>;
  addProduct: (product: Omit<Product, 'id' | 'history'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  addStockHistory: (productId: string, event: Omit<StockEvent, 'id'>) => Promise<void>;
  addCustomer: (name: string, phone?: string) => Promise<void>;
  recordPayment: (customerId: string, amount: number, mode: string) => Promise<void>;
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: string) => void;
  setSearchOpen: (open: boolean) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<AppState>({
    page: 'overview',
    selectedSaleId: null,
    selectedProductId: null,
    selectedCustomerId: null,
    products: [],
    customers: [],
    sales: [],
    activity: [],
    toasts: [],
    notifications: 0,
    searchOpen: false,
    loadingData: false,
  });

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

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    setState(s => ({ ...s, loadingData: true }));
    try {
      const [prods, salesList, custs] = await Promise.all([
        productsApi.getProducts().catch(() => []),
        salesApi.getSales().catch(() => []),
        customersApi.getCustomers(false).catch(() => []),
      ]);

      const mappedProducts: Product[] = prods.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        quantity: Number(p.quantity),
        unit: p.unit,
        price: Number(p.price),
        minStock: Number(p.minStock),
        history: [],
      }));

      const mappedSales: Sale[] = salesList.map(s => ({
        id: s.id,
        customer: s.customerName,
        items: s.items.map(i => ({
          product: i.productName,
          quantity: Number(i.quantity),
          unit: i.unit,
          price: Number(i.unitPrice),
          total: Number(i.totalPrice),
        })),
        total: Number(s.totalAmount),
        received: Number(s.receivedAmount),
        outstanding: Number(s.outstandingAmount),
        status: s.status.toLowerCase() as 'paid' | 'partial' | 'credit',
        paymentMode: (s.paymentMode.toLowerCase() === 'upi' ? 'upi' : 'cash') as 'cash' | 'upi' | 'card',
        date: new Date(s.createdAt),
      }));

      const mappedCustomers: Customer[] = custs.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        balance: Number(c.balance),
        transactions: [],
      }));

      const activities: ActivityEntry[] = mappedSales.slice(0, 8).map(s => ({
        id: 'act_' + s.id,
        type: 'sale' as const,
        title: 'Sale recorded',
        description: `${s.customer} purchased ${s.items.map(i => `${i.quantity} ${i.unit} ${i.product}`).join(', ')}`,
        date: s.date,
      }));

      setState(s => ({
        ...s,
        products: mappedProducts,
        sales: mappedSales,
        customers: mappedCustomers,
        activity: activities,
        loadingData: false,
      }));
    } catch (err) {
      console.error('Failed to load shop data from backend:', err);
      setState(s => ({ ...s, loadingData: false }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const navigate = useCallback((page: Page, params?: Partial<AppState>) => {
    setState(s => ({ ...s, page, ...params }));
  }, []);

  const addSale = useCallback(async (sale: Omit<Sale, 'id' | 'date'>) => {
    try {
      const payload = {
        customerName: sale.customer,
        items: sale.items.map(i => ({
          productName: i.product,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.price,
        })),
        receivedAmount: sale.received,
        paymentMode: sale.paymentMode.toUpperCase(),
      };

      const backendSale = await salesApi.createSale(payload);

      const newSale: Sale = {
        id: backendSale.id,
        customer: backendSale.customerName,
        items: backendSale.items.map(i => ({
          product: i.productName,
          quantity: Number(i.quantity),
          unit: i.unit,
          price: Number(i.unitPrice),
          total: Number(i.totalPrice),
        })),
        total: Number(backendSale.totalAmount),
        received: Number(backendSale.receivedAmount),
        outstanding: Number(backendSale.outstandingAmount),
        status: backendSale.status.toLowerCase() as 'paid' | 'partial' | 'credit',
        paymentMode: (backendSale.paymentMode.toLowerCase() === 'upi' ? 'upi' : 'cash') as any,
        date: new Date(backendSale.createdAt),
      };

      await refreshData();
      showToast('success', `Sale recorded for ${newSale.customer} (₹${newSale.total})`);
      return newSale;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to record sale';
      showToast('error', msg);
      throw err;
    }
  }, [refreshData, showToast]);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'history'>) => {
    try {
      await productsApi.createProduct({
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        unit: product.unit,
        price: product.price,
        minStock: product.minStock,
      });
      await refreshData();
      showToast('success', `${product.name} added to inventory`);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to add product');
    }
  }, [refreshData, showToast]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const existing = state.products.find(p => p.id === id);
      if (!existing) return;
      await productsApi.updateProduct(id, {
        name: updates.name || existing.name,
        category: updates.category || existing.category,
        quantity: updates.quantity !== undefined ? updates.quantity : existing.quantity,
        unit: updates.unit || existing.unit,
        price: updates.price !== undefined ? updates.price : existing.price,
        minStock: updates.minStock !== undefined ? updates.minStock : existing.minStock,
      });
      await refreshData();
      showToast('success', 'Product updated');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update product');
    }
  }, [state.products, refreshData, showToast]);

  const addStockHistory = useCallback(async (productId: string, event: Omit<StockEvent, 'id'>) => {
    try {
      await productsApi.adjustStock(productId, {
        quantityDelta: event.quantity,
        type: event.type.toUpperCase() as 'IN' | 'OUT',
        reason: event.reason,
      });
      await refreshData();
      showToast('success', `Stock updated: ${event.type === 'in' ? '+' : '-'}${event.quantity}`);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to adjust stock');
    }
  }, [refreshData, showToast]);

  const addCustomer = useCallback(async (name: string, phone?: string) => {
    try {
      await customersApi.createCustomer({ name, phone });
      await refreshData();
      showToast('success', `Customer ${name} added`);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to add customer');
    }
  }, [refreshData, showToast]);

  const recordPayment = useCallback(async (customerId: string, amount: number, mode: string) => {
    try {
      await customersApi.recordPayment(customerId, {
        amount,
        paymentMode: mode.toUpperCase(),
        note: `Payment received (${mode})`,
      });
      await refreshData();
      showToast('success', `₹${amount} payment recorded`);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to record payment');
    }
  }, [refreshData, showToast]);

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
      refreshData,
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
  return '₹' + (n || 0).toLocaleString('en-IN');
}

export function fmtDate(d: Date) {
  if (!d || isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = diff / 3600000;
  if (hours < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
