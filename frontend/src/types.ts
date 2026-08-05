export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export interface PortfolioHolding {
  symbol: string;
  shares: number;
  avg_cost: number;
  current_price: number;
  total_cost: number;
  market_value: number;
  profit_dollars: number;
  profit_percent: number;
}

export interface PortfolioData {
  holdings: PortfolioHolding[];
  total_cost: number;
  total_market_value: number;
  total_profit_dollars: number;
  total_profit_percent: number;
}

export interface Transaction {
  id?: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  date: string;
  shares: number;
  price_per_share: number;
  commission: number;
}

export interface AddTransactionRequest {
  symbol: string;
  action: 'BUY' | 'SELL';
  date: string;
  shares: number;
  price_per_share: number;
  commission: number;
}

export interface AddSymbolResponse {
  symbol: string;
  rows_loaded: number;
}
