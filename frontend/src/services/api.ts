import axios from 'axios';
import {
  AddSymbolResponse,
  AddTransactionRequest,
  AIAnalysis,
  IndicatorData,
  MACDConfig,
  MovingAveragePoint,
  PortfolioData,
  PricePoint,
  RSIConfig,
  Transaction,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const fetchSymbols = async () => {
  const response = await api.get<{ symbols: string[] }>('/symbols');
  return response.data.symbols;
};

export const fetchPrices = async (symbol: string, period: string) => {
  const response = await api.get<PricePoint[]>(`/prices/${symbol}`, { params: { period } });
  return response.data;
};

export const fetchMovingAverage = async (symbol: string, window: number, period: string) => {
  const response = await api.get<MovingAveragePoint[]>(`/moving-average/${symbol}`, {
    params: { period, window },
  });
  return response.data;
};

export const fetchAIAnalysis = async (
  symbol: string,
  period: string,
  customWindow: number = 150,
): Promise<AIAnalysis> => {
  const response = await api.get<AIAnalysis>(`/ai-analysis/${symbol}`, {
    params: { period, custom_window: customWindow },
  });
  return response.data;
};

export const createCancelSource = () => axios.CancelToken.source();

export const fetchPortfolio = async (): Promise<PortfolioData> => {
  const response = await api.get<PortfolioData>('/portfolio');
  return response.data;
};

export const fetchTransactions = async (symbol: string): Promise<Transaction[]> => {
  const response = await api.get<{ transactions: Transaction[] }>(`/portfolio/transactions/${symbol}`);
  return response.data.transactions;
};

export const addTransaction = async (req: AddTransactionRequest): Promise<Transaction> => {
  const response = await api.post<Transaction>('/portfolio/transactions', req);
  return response.data;
};

export const addSymbol = async (symbol: string, period = 'max'): Promise<AddSymbolResponse> => {
  const response = await api.post<AddSymbolResponse>('/symbols', { symbol, period });
  return response.data;
};

export const deleteSymbol = async (symbol: string): Promise<void> => {
  await api.delete(`/symbols/${symbol}`);
};

export const fetchIndicators = async (
  symbol: string,
  period: string,
  rsi: RSIConfig,
  macd: MACDConfig,
): Promise<IndicatorData> => {
  const response = await api.get<IndicatorData>(`/indicators/${symbol}`, {
    params: {
      period,
      rsi_period: rsi.period,
      macd_fast: macd.fast,
      macd_slow: macd.slow,
      macd_signal: macd.signal,
    },
  });
  return response.data;
};
