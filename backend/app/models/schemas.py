from __future__ import annotations

from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class PricePoint(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int = 0


class MovingAveragePoint(BaseModel):
    date: date
    value: float


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message")


class SymbolListResponse(BaseModel):
    symbols: List[str]


class AddSymbolRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    period: str = Field(default="max", description="yfinance period: max, 5y, 3y, 2y, 1y")


class AddSymbolResponse(BaseModel):
    symbol: str
    rows_loaded: int


# ---------------------------------------------------------------------------
# AI Analysis
# ---------------------------------------------------------------------------

SignalType = Literal["BUY", "SELL", "HOLD"]


class SMASignalResponse(BaseModel):
    timeframe: str
    signal: SignalType
    fast_sma: Optional[float] = None
    slow_sma: Optional[float] = None
    comment: str


class DocumentInsightResponse(BaseModel):
    filename: str
    snippet: str
    sentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]


class AIAnalysisResponse(BaseModel):
    symbol: str
    overall_signal: SignalType
    overall_comment: str
    short_term: SMASignalResponse
    long_term: SMASignalResponse
    document_insights: List[DocumentInsightResponse] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Portfolio
# ---------------------------------------------------------------------------


class PortfolioHolding(BaseModel):
    symbol: str
    shares: float
    avg_cost: float
    current_price: float
    total_cost: float
    market_value: float
    profit_dollars: float
    profit_percent: float


class PortfolioResponse(BaseModel):
    holdings: List[PortfolioHolding]
    total_cost: float
    total_market_value: float
    total_profit_dollars: float
    total_profit_percent: float


class Transaction(BaseModel):
    id: Optional[int] = None
    symbol: str
    action: Literal["BUY", "SELL"]
    date: date
    shares: float
    price_per_share: float
    commission: float = Field(default=0.0)


class AddTransactionRequest(BaseModel):
    symbol: str
    action: Literal["BUY", "SELL"]
    date: date
    shares: float = Field(..., gt=0)
    price_per_share: float = Field(..., gt=0)
    commission: float = Field(default=0.0, ge=0)


class TransactionListResponse(BaseModel):
    transactions: List[Transaction]


# ---------------------------------------------------------------------------
# Technical Indicators
# ---------------------------------------------------------------------------


class RSIPoint(BaseModel):
    date: date
    value: float


class MACDPoint(BaseModel):
    date: date
    macd: float
    signal_line: float
    histogram: float


class IndicatorResponse(BaseModel):
    rsi: List[RSIPoint]
    macd: List[MACDPoint]
