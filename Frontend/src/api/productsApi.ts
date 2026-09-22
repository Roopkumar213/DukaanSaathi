import { apiClient } from './client';

export interface ProductDto {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  minStock: number;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  updatedAt?: string;
}

export interface CreateProductPayload {
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  price: number;
  minStock?: number;
}

export interface AdjustStockPayload {
  quantityDelta: number;
  type: 'IN' | 'OUT';
  reason?: string;
}

export const productsApi = {
  getProducts: async (): Promise<ProductDto[]> => {
    const res = await apiClient.get<ProductDto[]>('/products');
    return res.data;
  },
  getLowStock: async (): Promise<ProductDto[]> => {
    const res = await apiClient.get<ProductDto[]>('/products/low-stock');
    return res.data;
  },
  createProduct: async (data: CreateProductPayload): Promise<ProductDto> => {
    const res = await apiClient.post<ProductDto>('/products', data);
    return res.data;
  },
  updateProduct: async (id: string, data: CreateProductPayload): Promise<ProductDto> => {
    const res = await apiClient.put<ProductDto>(`/products/${id}`, data);
    return res.data;
  },
  adjustStock: async (id: string, data: AdjustStockPayload): Promise<ProductDto> => {
    const res = await apiClient.post<ProductDto>(`/products/${id}/adjust-stock`, data);
    return res.data;
  },
};
