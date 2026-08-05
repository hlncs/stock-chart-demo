from __future__ import annotations

from datetime import date
from typing import List

import pandas as pd

from app.repositories.stock_repository import StockRepository
from app.services.moving_average_service import MovingAverageService


class StockService:
    def __init__(self, repository: StockRepository | None = None):
        self.repository = repository or StockRepository()
        self.moving_average_service = MovingAverageService()

    def list_symbols(self) -> List[str]:
        return self.repository.list_symbols()

    def get_prices(self, symbol: str, period: str | None = None) -> List[dict]:
        frame = self.repository.get_prices(symbol)
        if period:
            frame = self.filter_by_period(frame, period)
        return frame.to_dict(orient="records")

    def get_moving_average(self, symbol: str, window: int, period: str | None = None) -> List[dict]:
        frame = self.repository.get_prices(symbol)
        if period:
            frame = self.filter_by_period(frame, period)
        moving_average = self.moving_average_service.calculate(frame, window=window)
        return moving_average.to_dict(orient="records")

    def filter_by_period(self, frame: pd.DataFrame, period: str) -> pd.DataFrame:
        if frame.empty:
            return frame

        latest_date = pd.to_datetime(frame["date"]).max()
        if period == "1M":
            cutoff = latest_date - pd.DateOffset(months=1)
        elif period == "YTD":
            cutoff = pd.Timestamp(f"{latest_date.year}-01-01")
        elif period == "1Y":
            cutoff = latest_date - pd.DateOffset(years=1)
        elif period == "3Y":
            cutoff = latest_date - pd.DateOffset(years=3)
        elif period == "5Y":
            cutoff = latest_date - pd.DateOffset(years=5)
        else:
            raise ValueError("Unsupported period")

        filtered = frame[pd.to_datetime(frame["date"]) >= cutoff]
        return filtered.reset_index(drop=True)
