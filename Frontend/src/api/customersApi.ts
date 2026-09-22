import { apiClient } from './client';

export interface CustomerDto {
  id: string;
  name: string;
  phone?: string;
  balance: number;
  creditLimit: number;
  updatedAt?: string;
}

export interface KhataTransactionDto {
  id: string;
  type: 'SALE' | 'DEBIT' | 'CREDIT';
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

export interface CustomerDetailDto extends CustomerDto {
  transactions: KhataTransactionDto[];
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  balance?: number;
  creditLimit?: number;
}

export interface PaymentRecordPayload {
  amount: number;
  paymentMode?: string;
  note?: string;
}

export const customersApi = {
  getCustomers: async (hasDebt = false): Promise<CustomerDto[]> => {
    const res = await apiClient.get<CustomerDto[]>('/customers', { params: { hasDebt } });
    return res.data;
  },
  getCustomerDetail: async (id: string): Promise<CustomerDetailDto> => {
    const res = await apiClient.get<CustomerDetailDto>(`/customers/${id}`);
    return res.data;
  },
  createCustomer: async (data: CreateCustomerPayload): Promise<CustomerDto> => {
    const res = await apiClient.post<CustomerDto>('/customers', data);
    return res.data;
  },
  updateCustomer: async (id: string, data: CreateCustomerPayload): Promise<CustomerDto> => {
    const res = await apiClient.put<CustomerDto>(`/customers/${id}`, data);
    return res.data;
  },
  recordPayment: async (customerId: string, data: PaymentRecordPayload): Promise<CustomerDto> => {
    const res = await apiClient.post<CustomerDto>(`/khata/customers/${customerId}/payment`, data);
    return res.data;
  },
};
