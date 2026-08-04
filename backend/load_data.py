from __future__ import annotations

import argparse
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List

import pandas as pd
import yfinance as yf

from app.repositories.stock_repository import StockRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("load_data")


class StockLoader:
    def __init__(self, data_dir: str | Path | None = None):
        self.repository = StockRepository(data_dir=data_dir)

    def load(self, symbols: List[str], initial: bool = False) -> None:
        if not symbols:
            raise ValueError("At least one symbol is required")

        with ThreadPoolExecutor(max_workers=min(8, len(symbols))) as executor:
            futures = [executor.submit(self._load_symbol, symbol, initial) for symbol in symbols]
            for future in futures:
                future.result()

    def _load_symbol(self, symbol: str, initial: bool) -> None:
        logger.info("Loading %s", symbol)
        try:
            ticker = yf.Ticker(symbol)
            history = ticker.history(period="max", auto_adjust=False)
            if history.empty:
                logger.warning("No history returned for %s", symbol)
                return

            history = history.reset_index()
            history = history[["Date", "Open", "High", "Low", "Close", "Volume"]]
            history.columns = ["date", "open", "high", "low", "close", "volume"]
            history["date"] = pd.to_datetime(history["date"]).dt.date

            existing = None
            if not initial:
                existing_path = self.repository.data_dir / f"{symbol.upper()}.parquet"
                if existing_path.exists():
                    existing = pd.read_parquet(existing_path)
                    existing["date"] = pd.to_datetime(existing["date"]).dt.date
                    history = history[history["date"].gt(existing["date"].max())]

            if history.empty:
                logger.info("No new data for %s", symbol)
                return

            history = history.sort_values("date")
            if existing is not None:
                combined = pd.concat([existing, history], ignore_index=True)
            else:
                combined = history
            combined = combined.drop_duplicates(subset=["date"]).sort_values("date")
            self.repository.save_prices(symbol, combined)
            logger.info("Saved %s rows for %s", len(combined), symbol)
        except Exception as exc:  # pragma: no cover - CLI robustness
            logger.exception("Failed to load %s: %s", symbol, exc)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load stock data into local parquet files")
    parser.add_argument("--initial", action="store_true", help="Download the full history")
    parser.add_argument("--append", action="store_true", help="Download only new dates")
    parser.add_argument("--symbols", nargs="+", default=["AAPL"], help="Stock symbols to load")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    initial = args.initial or not args.append
    loader = StockLoader()
    loader.load(args.symbols, initial=initial)


if __name__ == "__main__":
    main()
