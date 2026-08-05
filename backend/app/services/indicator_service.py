"""
indicator_service.py — RSI and MACD calculations on a price DataFrame.
"""
from __future__ import annotations

import pandas as pd


class IndicatorService:
    # ------------------------------------------------------------------
    # RSI
    # ------------------------------------------------------------------

    def calculate_rsi(self, data: pd.DataFrame, period: int = 14) -> pd.DataFrame:
        """
        Relative Strength Index using Wilder's smoothed moving average.

        Returns a DataFrame with columns ['date', 'value'].
        Requires at least period + 1 rows.
        """
        if period < 2:
            raise ValueError("RSI period must be at least 2")
        if data is None or data.empty:
            return pd.DataFrame(columns=["date", "value"])
        if "close" not in data.columns or "date" not in data.columns:
            raise ValueError("data must contain 'date' and 'close' columns")

        df = data[["date", "close"]].sort_values("date").reset_index(drop=True).copy()
        delta = df["close"].diff()

        gain = delta.clip(lower=0)
        loss = (-delta).clip(lower=0)

        # Wilder's smoothed average (equivalent to EMA with alpha=1/period)
        avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()

        rs = avg_gain / avg_loss.replace(0, float("nan"))
        rsi = 100 - (100 / (1 + rs))
        # When avg_loss is exactly 0 (pure uptrend), RS is infinite → RSI = 100
        rsi = rsi.where(avg_loss != 0, other=100.0)

        df["value"] = rsi.round(4)
        result = df.dropna(subset=["value"])[["date", "value"]].reset_index(drop=True)
        return result

    # ------------------------------------------------------------------
    # MACD
    # ------------------------------------------------------------------

    def calculate_macd(
        self,
        data: pd.DataFrame,
        fast: int = 12,
        slow: int = 26,
        signal: int = 9,
    ) -> pd.DataFrame:
        """
        Moving Average Convergence Divergence.

        Returns a DataFrame with columns:
            date, macd, signal_line, histogram
        """
        if fast >= slow:
            raise ValueError("fast EMA period must be less than slow EMA period")
        if signal < 1:
            raise ValueError("signal period must be at least 1")
        if data is None or data.empty:
            return pd.DataFrame(columns=["date", "macd", "signal_line", "histogram"])
        if "close" not in data.columns or "date" not in data.columns:
            raise ValueError("data must contain 'date' and 'close' columns")

        df = data[["date", "close"]].sort_values("date").reset_index(drop=True).copy()

        ema_fast = df["close"].ewm(span=fast, min_periods=fast, adjust=False).mean()
        ema_slow = df["close"].ewm(span=slow, min_periods=slow, adjust=False).mean()

        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, min_periods=signal, adjust=False).mean()
        histogram = macd_line - signal_line

        df["macd"] = macd_line.round(4)
        df["signal_line"] = signal_line.round(4)
        df["histogram"] = histogram.round(4)

        result = df.dropna(subset=["macd", "signal_line"])[
            ["date", "macd", "signal_line", "histogram"]
        ].reset_index(drop=True)
        return result
