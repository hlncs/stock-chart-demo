import axios from 'axios';
import { PricePoint, MovingAveragePoint } from '../types';

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

export const createCancelSource = () => axios.CancelToken.source();
