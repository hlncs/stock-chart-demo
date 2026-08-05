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

// ---------------------------------------------------------------------------
// AI Analysis
// ---------------------------------------------------------------------------

export type SignalType = 'BUY' | 'SELL' | 'HOLD';
export type SentimentType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface SMASignal {
  timeframe: string;
  signal: SignalType;
  fast_sma: number | null;
  slow_sma: number | null;
  comment: string;
}

export interface DocumentInsight {
  filename: string;
  snippet: string;
  sentiment: SentimentType;
}

export interface AIAnalysis {
  symbol: string;
  overall_signal: SignalType;
  overall_comment: string;
  short_term: SMASignal;
  long_term: SMASignal;
  document_insights: DocumentInsight[];
}
