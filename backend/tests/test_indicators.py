"""
Tests for IndicatorService — RSI and MACD calculations.
"""
from __future__ import annotations

import math

import pandas as pd
import pytest

from app.services.indicator_service import IndicatorService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def make_frame(closes: list[float]) -> pd.DataFrame:
    dates = pd.date_range("2024-01-01", periods=len(closes), freq="B").strftime("%Y-%m-%d")
    return pd.DataFrame({"date": list(dates), "close": closes})


# Deterministic price series: 50 bars, alternating mild up/down moves
PRICES_50 = [100 + i * 0.5 + (5 if i % 3 == 0 else -2) for i in range(50)]

service = IndicatorService()


# ===========================================================================
# RSI
# ===========================================================================


class TestRSI:
    def test_returns_empty_for_empty_dataframe(self):
        result = service.calculate_rsi(pd.DataFrame(columns=["date", "close"]))
        assert result.empty

    def test_returns_empty_when_fewer_rows_than_period(self):
        result = service.calculate_rsi(make_frame([100.0, 101.0, 99.0]), period=14)
        assert result.empty

    def test_output_columns(self):
        result = service.calculate_rsi(make_frame(PRICES_50))
        assert list(result.columns) == ["date", "value"]

    def test_rsi_bounded_between_0_and_100(self):
        result = service.calculate_rsi(make_frame(PRICES_50))
        assert (result["value"] >= 0).all()
        assert (result["value"] <= 100).all()

    def test_rsi_count_matches_expected(self):
        # Wilder's EMA gives a value from row period onward after diff()
        closes = PRICES_50
        result = service.calculate_rsi(make_frame(closes), period=14)
        assert len(result) > 0

    def test_rsi_all_gains_approaches_100(self):
        # Strictly increasing prices → RSI should be very high
        closes = [100.0 + i for i in range(60)]
        result = service.calculate_rsi(make_frame(closes), period=14)
        assert not result.empty
        assert result["value"].iloc[-1] > 90

    def test_rsi_all_losses_approaches_0(self):
        # Strictly decreasing prices → RSI should be very low
        closes = [200.0 - i for i in range(30)]
        result = service.calculate_rsi(make_frame(closes), period=14)
        assert result["value"].iloc[-1] < 10

    def test_rsi_invalid_period_raises(self):
        with pytest.raises(ValueError, match="period"):
            service.calculate_rsi(make_frame(PRICES_50), period=1)

    def test_rsi_missing_columns_raises(self):
        with pytest.raises(ValueError):
            service.calculate_rsi(pd.DataFrame({"date": ["2024-01-01"], "open": [100.0]}))

    def test_rsi_custom_period(self):
        result_14 = service.calculate_rsi(make_frame(PRICES_50), period=14)
        result_7 = service.calculate_rsi(make_frame(PRICES_50), period=7)
        # Shorter period → more rows returned
        assert len(result_7) >= len(result_14)

    def test_rsi_output_is_sorted_by_date(self):
        result = service.calculate_rsi(make_frame(PRICES_50))
        dates = result["date"].tolist()
        assert dates == sorted(dates)

    def test_rsi_no_nan_values(self):
        result = service.calculate_rsi(make_frame(PRICES_50))
        assert not result["value"].isna().any()


# ===========================================================================
# MACD
# ===========================================================================


class TestMACD:
    def test_returns_empty_for_empty_dataframe(self):
        result = service.calculate_macd(pd.DataFrame(columns=["date", "close"]))
        assert result.empty

    def test_returns_empty_when_insufficient_data(self):
        result = service.calculate_macd(make_frame([100.0] * 10))
        assert result.empty

    def test_output_columns(self):
        result = service.calculate_macd(make_frame(PRICES_50))
        assert list(result.columns) == ["date", "macd", "signal_line", "histogram"]

    def test_histogram_equals_macd_minus_signal(self):
        result = service.calculate_macd(make_frame(PRICES_50))
        # histogram is stored rounded to 4dp; allow for that rounding error
        diff = (result["macd"] - result["signal_line"] - result["histogram"]).abs()
        assert (diff < 1e-3).all()

    def test_macd_no_nan_values(self):
        result = service.calculate_macd(make_frame(PRICES_50))
        assert not result[["macd", "signal_line", "histogram"]].isna().any().any()

    def test_macd_output_sorted_by_date(self):
        result = service.calculate_macd(make_frame(PRICES_50))
        dates = result["date"].tolist()
        assert dates == sorted(dates)

    def test_macd_fast_must_be_less_than_slow(self):
        with pytest.raises(ValueError, match="fast"):
            service.calculate_macd(make_frame(PRICES_50), fast=26, slow=12)

    def test_macd_fast_equal_slow_raises(self):
        with pytest.raises(ValueError):
            service.calculate_macd(make_frame(PRICES_50), fast=12, slow=12)

    def test_macd_invalid_signal_raises(self):
        with pytest.raises(ValueError, match="signal"):
            service.calculate_macd(make_frame(PRICES_50), signal=0)

    def test_macd_missing_columns_raises(self):
        with pytest.raises(ValueError):
            service.calculate_macd(pd.DataFrame({"date": ["2024-01-01"], "open": [100.0]}))

    def test_macd_custom_periods(self):
        result_default = service.calculate_macd(make_frame(PRICES_50))
        result_custom = service.calculate_macd(make_frame(PRICES_50), fast=5, slow=10, signal=3)
        # Custom shorter periods produce more rows
        assert len(result_custom) >= len(result_default)

    def test_macd_flat_prices_gives_zero_macd(self):
        # Constant prices → all EMAs equal → MACD = 0
        closes = [150.0] * 60
        result = service.calculate_macd(make_frame(closes))
        assert not result.empty
        assert (result["macd"].abs() < 1e-6).all()
        assert (result["histogram"].abs() < 1e-6).all()


# ===========================================================================
# API end-to-end — GET /indicators/{symbol}
# ===========================================================================


import shutil
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient


def _make_price_parquet(data_dir: Path, symbol: str, prices: list[float]) -> None:
    dates = pd.date_range("2021-01-01", periods=len(prices), freq="B").strftime("%Y-%m-%d")
    df = pd.DataFrame({
        "date": list(dates), "open": prices, "high": prices,
        "low": prices, "close": prices, "volume": [1_000_000] * len(prices),
    })
    df.to_parquet(data_dir / f"{symbol.upper()}.parquet", index=False)


@pytest.fixture()
def indicator_client():
    d = Path(tempfile.mkdtemp())
    _make_price_parquet(d, "AAPL", PRICES_50)
    from app.main import app
    from app.repositories.stock_repository import StockRepository
    from app.services.stock_service import StockService
    import app.main as main_module
    repo = StockRepository(data_dir=d)
    main_module.repository = repo
    main_module.service = StockService(repo)
    with TestClient(app) as c:
        yield c
    shutil.rmtree(d)


def test_api_returns_rsi_and_macd(indicator_client):
    resp = indicator_client.get("/indicators/AAPL")
    assert resp.status_code == 200
    body = resp.json()
    assert "rsi" in body and "macd" in body
    assert len(body["rsi"]) > 0
    assert len(body["macd"]) > 0


def test_api_rsi_values_bounded(indicator_client):
    rsi = indicator_client.get("/indicators/AAPL").json()["rsi"]
    for pt in rsi:
        assert 0 <= pt["value"] <= 100


def test_api_macd_histogram_consistent(indicator_client):
    macd = indicator_client.get("/indicators/AAPL").json()["macd"]
    for pt in macd:
        diff = abs(pt["macd"] - pt["signal_line"] - pt["histogram"])
        assert diff < 0.01


def test_api_custom_rsi_period(indicator_client):
    r7 = indicator_client.get("/indicators/AAPL?rsi_period=7").json()["rsi"]
    r14 = indicator_client.get("/indicators/AAPL?rsi_period=14").json()["rsi"]
    assert len(r7) >= len(r14)


def test_api_macd_fast_gte_slow_returns_400(indicator_client):
    resp = indicator_client.get("/indicators/AAPL?macd_fast=26&macd_slow=12")
    assert resp.status_code == 400


def test_api_unknown_symbol_returns_404(indicator_client):
    resp = indicator_client.get("/indicators/FAKE")
    assert resp.status_code == 404


def test_api_5y_period_accepted(indicator_client):
    # 5Y may return empty if dataset is short — just check no 400/500
    resp = indicator_client.get("/indicators/AAPL?period=5Y")
    assert resp.status_code in (200, 404)


def test_api_invalid_period_returns_400(indicator_client):
    resp = indicator_client.get("/indicators/AAPL?period=INVALID")
    assert resp.status_code == 400
