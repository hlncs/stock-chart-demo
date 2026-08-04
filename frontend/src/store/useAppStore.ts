import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SMAConfig } from '../types';

interface AppState {
  selectedTicker: string;
  selectedPeriod: string;
  activeSMAs: SMAConfig[];
  customWindow: number;
  priceData: Array<{ date: string; close: number }>;
  movingAverageData: Record<string, Array<{ date: string; value: number }>>;
  selectTicker: (ticker: string) => void;
  selectPeriod: (period: string) => void;
  toggleSMA: (id: '20' | '50' | 'custom', enabled: boolean) => void;
  setColor: (id: '20' | '50' | 'custom', color: string) => void;
  setCustomWindow: (window: number) => void;
  setPriceData: (data: Array<{ date: string; close: number }>) => void;
  setMovingAverageData: (id: string, data: Array<{ date: string; value: number }>) => void;
}

const defaultSMAs: SMAConfig[] = [
  { id: '20', label: '20 SMA', enabled: false, color: '#2196f3' },
  { id: '50', label: '50 SMA', enabled: false, color: '#4caf50' },
  { id: 'custom', label: 'Custom SMA', enabled: false, color: '#ff9800', window: 20 },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedTicker: '',
      selectedPeriod: '1Y',
      activeSMAs: defaultSMAs,
      customWindow: 20,
      priceData: [],
      movingAverageData: {},
      selectTicker: (ticker) => set({ selectedTicker: ticker }),
      selectPeriod: (period) => set({ selectedPeriod: period }),
      toggleSMA: (id, enabled) =>
        set((state) => ({
          activeSMAs: state.activeSMAs.map((sma) => (sma.id === id ? { ...sma, enabled } : sma)),
        })),
      setColor: (id, color) =>
        set((state) => ({
          activeSMAs: state.activeSMAs.map((sma) => (sma.id === id ? { ...sma, color } : sma)),
        })),
      setCustomWindow: (window) => set({ customWindow: window }),
      setPriceData: (data) => set({ priceData: data }),
      setMovingAverageData: (id, data) =>
        set((state) => ({ movingAverageData: { ...state.movingAverageData, [id]: data } })),
    }),
    { name: 'stock-chart-demo-store' },
  ),
);
