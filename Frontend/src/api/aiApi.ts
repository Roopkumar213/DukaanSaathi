import { apiClient } from './client';

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
}

export interface NaturalSaleParseResponse {
  customerName: string;
  items: ParsedItem[];
  totalAmount: number;
  amountPaid: number;
  amountCredit: number;
  paymentMode: string;
  confidenceScore: number;
  rawText: string;
}

export interface AiQueryResponse {
  queryType: string;
  reply: string;
  data: any;
  actionLabel?: string;
  actionPage?: string;
}

export const aiApi = {
  parseSale: async (text: string): Promise<NaturalSaleParseResponse> => {
    const res = await apiClient.post<NaturalSaleParseResponse>('/ai/parse-sale', { text });
    return res.data;
  },
  query: async (question: string, language?: string): Promise<AiQueryResponse> => {
    const res = await apiClient.post<AiQueryResponse>('/ai/query', { question, language });
    return res.data;
  },
  ask: async (prompt: string): Promise<{ reply: string }> => {
    const res = await apiClient.post<{ reply: string }>('/ai/ask', { prompt });
    return res.data;
  },
};
