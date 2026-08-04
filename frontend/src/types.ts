export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MovingAveragePoint {
  date: string;
  value: number;
}

export interface SMAConfig {
  id: '20' | '50' | 'custom';
  label: string;
  enabled: boolean;
  color: string;
  window?: number;
}
