"""
seed_portfolio.py — Seed the transactions ledger with sample portfolio data.

Run this once after loading price data to populate a realistic set of
BUY and SELL transactions across AAPL, MSFT, NVDA, AMZN, and V.

Usage:
    cd backend
    ../.VENV/bin/python seed_portfolio.py
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"

TRANSACTIONS = [
    # AAPL — 50 shares net (2 buys)
    {"symbol": "AAPL", "action": "BUY",  "date": "2024-01-15", "shares": 30,  "price_per_share": 185.50,   "commission": 9.95},
    {"symbol": "AAPL", "action": "BUY",  "date": "2024-06-10", "shares": 20,  "price_per_share": 193.75,   "commission": 9.95},
    # MSFT — 30 shares net (2 buys, 1 sell)
    {"symbol": "MSFT", "action": "BUY",  "date": "2024-02-20", "shares": 20,  "price_per_share": 402.00,   "commission": 9.95},
    {"symbol": "MSFT", "action": "BUY",  "date": "2024-09-05", "shares": 15,  "price_per_share": 425.00,   "commission": 9.95},
    {"symbol": "MSFT", "action": "SELL", "date": "2025-01-10", "shares": 5,   "price_per_share": 445.00,   "commission": 9.95},
    # NVDA — 20 shares net (2 buys, 1 sell)
    {"symbol": "NVDA", "action": "BUY",  "date": "2023-11-01", "shares": 15,  "price_per_share": 480.00,   "commission": 9.95},
    {"symbol": "NVDA", "action": "BUY",  "date": "2024-03-15", "shares": 10,  "price_per_share": 875.00,   "commission": 9.95},
    {"symbol": "NVDA", "action": "SELL", "date": "2024-08-20", "shares": 5,   "price_per_share": 1100.00,  "commission": 9.95},
    # AMZN — 25 shares net (1 buy)
    {"symbol": "AMZN", "action": "BUY",  "date": "2024-04-01", "shares": 25,  "price_per_share": 178.00,   "commission": 9.95},
    # V — 40 shares net (2 buys)
    {"symbol": "V",    "action": "BUY",  "date": "2024-01-08", "shares": 25,  "price_per_share": 258.00,   "commission": 9.95},
    {"symbol": "V",    "action": "BUY",  "date": "2024-07-22", "shares": 15,  "price_per_share": 278.00,   "commission": 9.95},
]


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(TRANSACTIONS)
    df.insert(0, "id", range(1, len(df) + 1))
    path = DATA_DIR / "transactions.parquet"
    df.to_parquet(path, index=False)
    print(f"Seeded {len(df)} transactions → {path}")
    print(df[["id", "symbol", "action", "date", "shares"]].to_string(index=False))


if __name__ == "__main__":
    main()
