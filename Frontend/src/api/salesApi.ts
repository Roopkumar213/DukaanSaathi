import { apiClient } from './client';

export interface SaleItemRequest {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
}

export interface CreateSalePayload {
  customerName: string;
  customerPhone?: string;
  items: SaleItemRequest[];
  receivedAmount: number;
  paymentMode?: string;
  rawInput?: string;
}

export interface SaleItemDto {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleResponse {
  id: string;
  shopId: string;
  customerId?: string;
  customerName: string;
  totalAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  paymentMode: string;
  status: 'PAID' | 'PARTIAL' | 'CREDIT';
  rawInput?: string;
  items: SaleItemDto[];
  createdAt: string;
}

export interface SaleSummary {
  totalSales: number;
  receivedSales: number;
  creditSales: number;
  transactionCount: number;
}

export const salesApi = {
  getSales: async (params?: { date?: string; customer?: string }): Promise<SaleResponse[]> => {
    const res = await apiClient.get<SaleResponse[]>('/sales', { params });
    return res.data;
  },
  getSaleById: async (id: string): Promise<SaleResponse> => {
    const res = await apiClient.get<SaleResponse>(`/sales/${id}`);
    return res.data;
  },
  createSale: async (data: CreateSalePayload): Promise<SaleResponse> => {
    const res = await apiClient.post<SaleResponse>('/sales', data);
    return res.data;
  },
  getSummary: async (): Promise<SaleSummary> => {
    const res = await apiClient.get<SaleSummary>('/sales/summary');
    return res.data;
  },
};
