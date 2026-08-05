"""
End-to-end tests for the portfolio transactions API.

Tests cover:
  - GET /portfolio          — summary computed from ledger
  - GET /portfolio/transactions/{symbol} — per-symbol history
  - POST /portfolio/transactions         — adding BUY and SELL entries

All tests use a temporary data directory so the real transactions.parquet
is never touched.
"""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_price_parquet(data_dir: Path, symbol: str, prices: list[float]) -> None:
    """Write a minimal OHLCV parquet so get_prices() succeeds."""
    dates = pd.date_range("2024-01-01", periods=len(prices), freq="D").astype(str)
    df = pd.DataFrame(
        {
            "date": list(dates),
            "open": prices,
            "high": prices,
            "low": prices,
            "close": prices,
            "volume": [1_000_000] * len(prices),
        }
    )
    df.to_parquet(data_dir / f"{symbol.upper()}.parquet", index=False)


@pytest.fixture()
def tmp_data_dir():
    """Isolated temp directory with price parquets for NVDA, AAPL, MSFT."""
    d = Path(tempfile.mkdtemp())
    _make_price_parquet(d, "NVDA", [100.0, 120.0, 150.0, 180.0, 200.0])
    _make_price_parquet(d, "AAPL", [150.0, 155.0, 160.0])
    _make_price_parquet(d, "MSFT", [300.0, 310.0, 320.0])
    yield d
    shutil.rmtree(d)


@pytest.fixture()
def client(tmp_data_dir):
    """TestClient wired to a fresh StockRepository pointing at tmp_data_dir."""
    from app.main import app
    from app.repositories.stock_repository import StockRepository
    from app.services.stock_service import StockService
    import app.main as main_module

    repo = StockRepository(data_dir=tmp_data_dir)
    main_module.repository = repo
    main_module.service = StockService(repo)

    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def post_txn(client, symbol, action, shares, price, commission=9.95, date="2024-06-01"):
    return client.post(
        "/portfolio/transactions",
        json={
            "symbol": symbol,
            "action": action,
            "date": date,
            "shares": shares,
            "price_per_share": price,
            "commission": commission,
        },
    )


# ---------------------------------------------------------------------------
# POST /portfolio/transactions — BUY
# ---------------------------------------------------------------------------


def test_add_buy_transaction_returns_201(client):
    resp = post_txn(client, "NVDA", "BUY", 10, 150.0)
    assert resp.status_code == 201
    body = resp.json()
    assert body["symbol"] == "NVDA"
    assert body["action"] == "BUY"
    assert body["shares"] == 10
    assert body["price_per_share"] == 150.0
    assert body["commission"] == 9.95
    assert isinstance(body["id"], int)


def test_add_buy_transaction_assigns_sequential_ids(client):
    r1 = post_txn(client, "NVDA", "BUY", 5, 100.0)
    r2 = post_txn(client, "AAPL", "BUY", 3, 150.0)
    assert r1.json()["id"] == 1
    assert r2.json()["id"] == 2


def test_buy_unknown_symbol_returns_404(client):
    resp = post_txn(client, "FAKE", "BUY", 10, 99.0)
    assert resp.status_code == 404


def test_buy_zero_shares_returns_422(client):
    resp = post_txn(client, "NVDA", "BUY", 0, 100.0)
    assert resp.status_code == 422


def test_buy_negative_price_returns_422(client):
    resp = post_txn(client, "NVDA", "BUY", 5, -1.0)
    assert resp.status_code == 422


def test_buy_negative_commission_returns_422(client):
    resp = post_txn(client, "NVDA", "BUY", 5, 100.0, commission=-1.0)
    assert resp.status_code == 422


def test_buy_zero_commission_is_accepted(client):
    resp = post_txn(client, "NVDA", "BUY", 5, 100.0, commission=0.0)
    assert resp.status_code == 201
    assert resp.json()["commission"] == 0.0


# ---------------------------------------------------------------------------
# POST /portfolio/transactions — SELL
# ---------------------------------------------------------------------------


def test_add_sell_transaction_reduces_holdings(client):
    post_txn(client, "NVDA", "BUY", 20, 100.0)
    resp = post_txn(client, "NVDA", "SELL", 5, 200.0)
    assert resp.status_code == 201
    portfolio = client.get("/portfolio").json()
    nvda = next(h for h in portfolio["holdings"] if h["symbol"] == "NVDA")
    assert nvda["shares"] == 15


def test_sell_more_than_held_returns_400(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0)
    resp = post_txn(client, "NVDA", "SELL", 20, 200.0)
    assert resp.status_code == 400
    assert "sell" in resp.json()["detail"].lower() or "held" in resp.json()["detail"].lower()


def test_sell_with_no_holdings_returns_400(client):
    resp = post_txn(client, "NVDA", "SELL", 5, 200.0)
    assert resp.status_code == 400


def test_sell_exact_holdings_removes_symbol_from_summary(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0)
    resp = post_txn(client, "NVDA", "SELL", 10, 200.0)
    assert resp.status_code == 201
    portfolio = client.get("/portfolio").json()
    symbols = [h["symbol"] for h in portfolio["holdings"]]
    assert "NVDA" not in symbols


# ---------------------------------------------------------------------------
# GET /portfolio/transactions/{symbol}
# ---------------------------------------------------------------------------


def test_get_transactions_returns_all_for_symbol(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0, date="2024-01-01")
    post_txn(client, "NVDA", "BUY", 5, 120.0, date="2024-03-01")
    post_txn(client, "AAPL", "BUY", 8, 155.0, date="2024-02-01")

    resp = client.get("/portfolio/transactions/NVDA")
    assert resp.status_code == 200
    txns = resp.json()["transactions"]
    assert len(txns) == 2
    assert all(t["symbol"] == "NVDA" for t in txns)


def test_get_transactions_case_insensitive(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0)
    resp = client.get("/portfolio/transactions/nvda")
    assert resp.status_code == 200
    assert len(resp.json()["transactions"]) == 1


def test_get_transactions_returns_empty_for_unknown_symbol(client):
    resp = client.get("/portfolio/transactions/FAKE")
    assert resp.status_code == 200
    assert resp.json()["transactions"] == []


def test_get_transactions_sorted_by_date(client):
    post_txn(client, "NVDA", "BUY", 5, 100.0, date="2024-06-01")
    post_txn(client, "NVDA", "BUY", 5, 120.0, date="2024-01-01")
    txns = client.get("/portfolio/transactions/NVDA").json()["transactions"]
    dates = [t["date"] for t in txns]
    assert dates == sorted(dates)


def test_transaction_ids_are_integers_not_nan(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0)
    txns = client.get("/portfolio/transactions/NVDA").json()["transactions"]
    for t in txns:
        assert isinstance(t["id"], int)


# ---------------------------------------------------------------------------
# GET /portfolio — summary
# ---------------------------------------------------------------------------


def test_portfolio_summary_reflects_buys(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0, commission=0)
    post_txn(client, "NVDA", "BUY", 5, 200.0, commission=0)

    portfolio = client.get("/portfolio").json()
    nvda = next(h for h in portfolio["holdings"] if h["symbol"] == "NVDA")

    assert nvda["shares"] == 15
    expected_cost = 10 * 100.0 + 5 * 200.0
    assert abs(nvda["total_cost"] - expected_cost) < 0.01


def test_portfolio_avg_cost_weighted_average(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0, commission=0)
    post_txn(client, "NVDA", "BUY", 10, 200.0, commission=0)

    portfolio = client.get("/portfolio").json()
    nvda = next(h for h in portfolio["holdings"] if h["symbol"] == "NVDA")

    assert abs(nvda["avg_cost"] - 150.0) < 0.01


def test_portfolio_commission_included_in_cost_basis(client):
    post_txn(client, "NVDA", "BUY", 10, 100.0, commission=10.0)

    portfolio = client.get("/portfolio").json()
    nvda = next(h for h in portfolio["holdings"] if h["symbol"] == "NVDA")

    assert abs(nvda["total_cost"] - (10 * 100.0 + 10.0)) < 0.01


def test_portfolio_market_value_uses_latest_price(client):
    # NVDA latest price = 200.0 (last entry in fixture)
    post_txn(client, "NVDA", "BUY", 5, 100.0, commission=0)

    portfolio = client.get("/portfolio").json()
    nvda = next(h for h in portfolio["holdings"] if h["symbol"] == "NVDA")

    assert abs(nvda["current_price"] - 200.0) < 0.01
    assert abs(nvda["market_value"] - 5 * 200.0) < 0.01


def test_portfolio_profit_calculation(client):
    post_txn(client, "NVDA", "BUY", 5, 100.0, commission=0)  # cost = 500, price = 200 → profit = 500

    portfolio = client.get("/portfolio").json()
    nvda = next(h for h in portfolio["holdings"] if h["symbol"] == "NVDA")

    assert abs(nvda["profit_dollars"] - 500.0) < 0.01
    assert abs(nvda["profit_percent"] - 100.0) < 0.01


def test_portfolio_totals_sum_across_symbols(client):
    post_txn(client, "NVDA", "BUY", 5, 100.0, commission=0)
    post_txn(client, "AAPL", "BUY", 2, 150.0, commission=0)

    portfolio = client.get("/portfolio").json()

    nvda = next(h for h in portfolio["holdings"] if h["symbol"] == "NVDA")
    aapl = next(h for h in portfolio["holdings"] if h["symbol"] == "AAPL")

    expected_total_cost = nvda["total_cost"] + aapl["total_cost"]
    assert abs(portfolio["total_cost"] - expected_total_cost) < 0.01

    expected_total_mv = nvda["market_value"] + aapl["market_value"]
    assert abs(portfolio["total_market_value"] - expected_total_mv) < 0.01


def test_portfolio_empty_when_no_transactions(client):
    portfolio = client.get("/portfolio").json()
    assert portfolio["holdings"] == []
    assert portfolio["total_cost"] == 0.0
    assert portfolio["total_market_value"] == 0.0


# ---------------------------------------------------------------------------
# NaN id regression — the original bug
# ---------------------------------------------------------------------------


def test_get_transactions_after_seed_data_with_nan_ids(tmp_data_dir):
    """
    Regression: if the parquet was seeded without an id column (id=NaN),
    get_transactions() must still return rows with valid integer ids.
    """
    # Write a parquet that mimics the original seed (no id column)
    df = pd.DataFrame(
        [
            {"symbol": "NVDA", "action": "BUY", "date": "2024-01-01",
             "shares": 15.0, "price_per_share": 480.0, "commission": 9.95},
        ]
    )
    df.to_parquet(tmp_data_dir / "transactions.parquet", index=False)

    from app.repositories.stock_repository import StockRepository
    repo = StockRepository(data_dir=tmp_data_dir)
    result = repo.get_transactions("NVDA")

    assert not result.empty
    assert "id" in result.columns
    assert result["id"].isna().sum() == 0
    assert result["id"].dtype in (int, "int64", "int32")


def test_add_transaction_after_nan_id_seed_assigns_correct_next_id(tmp_data_dir):
    """
    Regression: add_transaction() must not crash or produce NaN ids
    when the existing parquet was seeded without ids.
    """
    df = pd.DataFrame(
        [
            {"symbol": "NVDA", "action": "BUY", "date": "2024-01-01",
             "shares": 15.0, "price_per_share": 480.0, "commission": 9.95},
            {"symbol": "NVDA", "action": "BUY", "date": "2024-03-15",
             "shares": 10.0, "price_per_share": 875.0, "commission": 9.95},
        ]
    )
    df.to_parquet(tmp_data_dir / "transactions.parquet", index=False)

    from app.repositories.stock_repository import StockRepository
    repo = StockRepository(data_dir=tmp_data_dir)
    record = repo.add_transaction(
        {"symbol": "NVDA", "action": "BUY", "date": "2024-06-01",
         "shares": 5.0, "price_per_share": 900.0, "commission": 9.95}
    )

    assert isinstance(record["id"], int)
    assert record["id"] == 3  # should follow the two existing rows

    all_txns = repo.get_transactions("NVDA")
    assert all_txns["id"].isna().sum() == 0
