from __future__ import annotations

import logging
from pathlib import Path
from typing import List

import pandas as pd

logger = logging.getLogger(__name__)


class StockRepository:
    def __init__(self, data_dir: Path | str | None = None):
        self.data_dir = Path(data_dir or Path(__file__).resolve().parents[2] / "data")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, pd.DataFrame] = {}

    def list_symbols(self) -> List[str]:
        # Exclude portfolio-related parquet files
        excluded = {"portfolio", "transactions"}
        files = sorted(self.data_dir.glob("*.parquet"))
        return [path.stem for path in files if path.stem.lower() not in excluded]

    def get_prices(self, symbol: str) -> pd.DataFrame:
        cache_key = symbol.upper()
        if cache_key in self._cache:
            return self._cache[cache_key]

        path = self.data_dir / f"{cache_key}.parquet"
        if not path.exists():
            raise FileNotFoundError(f"No data found for symbol {symbol}")

        frame = pd.read_parquet(path)
        frame = frame.sort_values("date").reset_index(drop=True)
        self._cache[cache_key] = frame
        return frame

    def save_prices(self, symbol: str, frame: pd.DataFrame) -> None:
        path = self.data_dir / f"{symbol.upper()}.parquet"
        safe_frame = frame.copy()
        safe_frame = safe_frame.sort_values("date").reset_index(drop=True)
        safe_frame.to_parquet(path, index=False)
        self._cache[symbol.upper()] = safe_frame

    def delete_symbol(self, symbol: str) -> None:
        """Remove the parquet file for a symbol and evict it from cache."""
        path = self.data_dir / f"{symbol.upper()}.parquet"
        if not path.exists():
            raise FileNotFoundError(f"No data found for symbol {symbol}")
        path.unlink()
        self._cache.pop(symbol.upper(), None)

    # ------------------------------------------------------------------
    # Transactions ledger
    # ------------------------------------------------------------------

    def _txn_path(self) -> Path:
        return self.data_dir / "transactions.parquet"

    def _ensure_int_ids(self, df: pd.DataFrame) -> pd.DataFrame:
        """Guarantee the id column exists and contains clean integers (no NaN)."""
        if "id" not in df.columns or df["id"].isna().any():
            df = df.copy()
            df["id"] = range(1, len(df) + 1)
        df["id"] = df["id"].astype(int)
        return df

    def get_transactions(self, symbol: str | None = None) -> pd.DataFrame:
        path = self._txn_path()
        if not path.exists():
            return pd.DataFrame(
                columns=["id", "symbol", "action", "date", "shares", "price_per_share", "commission"]
            )
        df = pd.read_parquet(path)
        df = self._ensure_int_ids(df)
        if symbol:
            df = df[df["symbol"].str.upper() == symbol.upper()].copy()
        df = df.sort_values("date").reset_index(drop=True)
        return df

    def add_transaction(self, txn: dict) -> dict:
        path = self._txn_path()
        if path.exists():
            df = pd.read_parquet(path)
            df = self._ensure_int_ids(df)
        else:
            df = pd.DataFrame(
                columns=["id", "symbol", "action", "date", "shares", "price_per_share", "commission"]
            )
        next_id = int(df["id"].max()) + 1 if not df.empty else 1

        record = {**txn, "id": next_id}
        new_row = pd.DataFrame([record])
        df = pd.concat([df, new_row], ignore_index=True)
        df["id"] = df["id"].astype(int)
        df.to_parquet(path, index=False)
        return record

    def get_latest_price(self, symbol: str) -> float:
        frame = self.get_prices(symbol)
        return float(frame.iloc[-1]["close"])
