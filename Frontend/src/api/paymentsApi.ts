import { apiClient } from './client';

export interface PaymentDto {
  id: string;
  customerId?: string;
  customerName?: string;
  saleId?: string;
  amount: number;
  paymentMode: string;
  note?: string;
  createdAt: string;
}

export const paymentsApi = {
  getPayments: async (): Promise<PaymentDto[]> => {
    const res = await apiClient.get<PaymentDto[]>('/payments');
    return res.data;
  },
};
