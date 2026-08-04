from __future__ import annotations

from datetime import date
from typing import List

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
