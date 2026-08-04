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
        files = sorted(self.data_dir.glob("*.parquet"))
        return [path.stem for path in files]

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
