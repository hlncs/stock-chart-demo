import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MACDConfig, RSIConfig, SMAConfig } from '../types';

interface AppState {
  selectedTicker: string;
  selectedPeriod: string;
  activeSMAs: SMAConfig[];
  customWindow: number;
  priceData: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>;
  movingAverageData: Record<string, Array<{ date: string; value: number }>>;
  rsiConfig: RSIConfig;
  macdConfig: MACDConfig;
  selectTicker: (ticker: string) => void;
  selectPeriod: (period: string) => void;
  toggleSMA: (id: '20' | '50' | 'custom', enabled: boolean) => void;
  setColor: (id: '20' | '50' | 'custom', color: string) => void;
  setCustomWindow: (window: number) => void;
  setPriceData: (data: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>) => void;
  setMovingAverageData: (id: string, data: Array<{ date: string; value: number }>) => void;
  setRsiConfig: (cfg: Partial<RSIConfig>) => void;
  setMacdConfig: (cfg: Partial<MACDConfig>) => void;
}

const defaultSMAs: SMAConfig[] = [
  { id: '20', label: '20 SMA', enabled: false, color: '#2196f3' },
  { id: '50', label: '50 SMA', enabled: false, color: '#4caf50' },
  { id: 'custom', label: 'Custom SMA', enabled: false, color: '#ff9800', window: 20 },
];

const defaultRSI: RSIConfig = {
  period: 14,
  color: '#ce93d8',
  obLevel: 70,
  osLevel: 30,
};

const defaultMACD: MACDConfig = {
  fast: 12,
  slow: 26,
  signal: 9,
  macdColor: '#4fc3f7',
  signalColor: '#ff8a65',
  histUpColor: '#26a69a',
  histDownColor: '#ef5350',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedTicker: '',
      selectedPeriod: '1Y',
      activeSMAs: defaultSMAs,
      customWindow: 20,
      priceData: [],
      movingAverageData: {},
      rsiConfig: defaultRSI,
      macdConfig: defaultMACD,
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
      setRsiConfig: (cfg) =>
        set((state) => ({ rsiConfig: { ...state.rsiConfig, ...cfg } })),
      setMacdConfig: (cfg) =>
        set((state) => ({ macdConfig: { ...state.macdConfig, ...cfg } })),
    }),
    { name: 'stock-chart-demo-store' },
  ),
);
