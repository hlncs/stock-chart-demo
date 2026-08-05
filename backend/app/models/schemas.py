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


class MovingAveragePoint(BaseModel):
    date: date
    value: float


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message")


class SymbolListResponse(BaseModel):
    symbols: List[str]


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
