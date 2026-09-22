import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  shopName: string;
  shopAddress?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: string;
  email: string;
  fullName: string;
  shopId: string;
  shopName: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  shopId: string;
  shopName: string;
}

export const authApi = {
  login: async (data: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    return res.data;
  },
  register: async (data: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<UserDto> => {
    const res = await apiClient.get<UserDto>('/auth/me');
    return res.data;
  },
};
