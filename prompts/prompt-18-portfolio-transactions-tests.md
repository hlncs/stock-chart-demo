# Prompt 18 - Portfolio Transactions — Backend End-to-End Test Specification

## Context

The portfolio feature stores share holdings as a **transactions ledger**
(`backend/data/transactions.parquet`). Each row is a single BUY or SELL trade.
The summary view (outstanding shares, avg cost, market value, P&L) is derived
at request time by replaying the ledger. The old `portfolio.parquet` flat file
is no longer used for holdings — it is superseded by the transactions ledger.

Test file: `backend/tests/test_portfolio.py`
Dependency: `httpx2>=2.9.1` (required by `starlette.testclient`)

All tests use a **temporary data directory** (pytest fixture) so the real
`transactions.parquet` is never touched during the test run.

---

## Known Bug Fixed — NaN ids

**Root cause:** The original seed data in `transactions.parquet` was written
without an `id` column, leaving `id = NaN` for all rows. When
`add_transaction()` called `int(df["id"].max())` on a NaN value it raised a
`ValueError`, aborting the `POST /portfolio/transactions` response mid-write.
The subsequent `GET /portfolio/transactions/{symbol}` call then hit Pydantic
serialisation trying to return `id = NaN` as an integer field, showing
"Unable to load transactions." in the UI even though the share count had
already been written.

**Fix:** `StockRepository._ensure_int_ids()` is called on every read and write.
It detects a missing or NaN-filled `id` column and replaces it with a clean
sequential integer range before any further processing.

---

## Test Groups

### 1. POST /portfolio/transactions — BUY

| # | Test | Expected |
|---|------|----------|
| 1 | Valid BUY → HTTP 201 with correct fields | 201, body matches input |
| 2 | Two BUYs → ids are sequential integers 1, 2 | ids: 1, 2 |
| 3 | Unknown symbol → 404 | 404 |
| 4 | shares = 0 → validation error | 422 |
| 5 | price_per_share < 0 → validation error | 422 |
| 6 | commission < 0 → validation error | 422 |
| 7 | commission = 0 → accepted | 201 |

### 2. POST /portfolio/transactions — SELL

| # | Test | Expected |
|---|------|----------|
| 8  | Sell fewer than held → 201, outstanding shares reduced | 201 |
| 9  | Sell more than held → 400 with informative message | 400 |
| 10 | Sell with no prior buys → 400 | 400 |
| 11 | Sell exact holding → 201, symbol disappears from summary | 201 |

### 3. GET /portfolio/transactions/{symbol}

| # | Test | Expected |
|---|------|----------|
| 12 | Returns only rows for requested symbol | correct count, all same symbol |
| 13 | Symbol lookup is case-insensitive | nvda == NVDA |
| 14 | Unknown symbol → 200 with empty list | 200, [] |
| 15 | Rows sorted ascending by date | dates in order |
| 16 | All returned ids are integers (NaN regression) | isinstance(id, int) |

### 4. GET /portfolio — summary

| # | Test | Expected |
|---|------|----------|
| 17 | BUYs reflected in shares and total_cost | correct sums |
| 18 | Avg cost is weighted average of buy prices | (10×100 + 10×200)/20 = 150 |
| 19 | Commission included in cost basis | cost = shares×price + commission |
| 20 | market_value uses latest close price from parquet | shares × latest_price |
| 21 | Profit = market_value − total_cost | correct dollar and % values |
| 22 | Totals row sums across all symbols | sum of individual holdings |
| 23 | Empty ledger → empty holdings, all totals = 0 | 200, empty |

### 5. Symbol management — POST /symbols, DELETE /symbols/{symbol}

| # | Test | Expected |
|---|------|----------|
| 24 | POST /symbols with valid ticker → 201, rows_loaded > 0 | 201 |
| 25 | POST /symbols duplicate → 409 Conflict | 409 |
| 26 | POST /symbols unknown ticker → 404 | 404 |
| 27 | DELETE /symbols/{symbol} → 204, parquet removed | 204, file gone |
| 28 | DELETE /symbols/{symbol} unknown → 404 | 404 |
| 29 | GET /symbols excludes "transactions" and "portfolio" filenames | clean list |

### 6. NaN id regression — repository-level

| # | Test | Expected |
|---|------|----------|
| 30 | Parquet seeded without id column → get_transactions returns valid int ids | no NaN |
| 31 | add_transaction after NaN-seeded file → next id = correct integer | id = 3 |

---

## Running the Tests

```bash
# From project root
cd backend
../.VENV/bin/python -m pytest tests/test_portfolio.py -v
```

Expected output: **25 passed** (tests 24–29 require a live yfinance connection;
mock them if running offline).

Full suite:

```bash
../.VENV/bin/python -m pytest tests/ -v
```
