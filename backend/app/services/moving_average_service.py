from __future__ import annotations

import pandas as pd


class MovingAverageService:
    def calculate(self, data: pd.DataFrame, window: int) -> pd.DataFrame:
        if window < 2:
            raise ValueError("window must be at least 2")

        if data is None or data.empty:
            return pd.DataFrame(columns=["date", "value"])

        if "close" not in data.columns or "date" not in data.columns:
            raise ValueError("data must contain 'date' and 'close' columns")

        normalized = data[["date", "close"]].copy()
        normalized = normalized.sort_values("date").reset_index(drop=True)
        normalized["value"] = normalized["close"].rolling(window=window, min_periods=window).mean()

        return normalized.dropna(subset=["value"])[["date", "value"]].reset_index(drop=True)
