# Prompt 31 - Technical Indicators (RSI & MACD)

## Overview

Add RSI and MACD indicators rendered as separate Lightweight Charts panels
below the main candlestick chart. Both indicators are configurable in values
and colours via an `IndicatorToolbar` component. Configuration is persisted in
the Zustand store.

---

## Backend

### New service: `app/services/indicator_service.py`

```
IndicatorService
  calculate_rsi(data, period=14) → DataFrame[date, value]
    - Wilder's smoothed EMA (alpha = 1/period)
    - Returns 100 when avg_loss = 0 (pure uptrend)
    - Returns [] when data is empty or fewer rows than period

  calculate_macd(data, fast=12, slow=26, signal=9) → DataFrame[date, macd, signal_line, histogram]
    - Standard EMA-based MACD
    - Validates fast < slow
    - Returns [] when data is insufficient
```

### New endpoint: `GET /indicators/{symbol}`

Query parameters:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| period | str | None | 1M, YTD, 1Y, 3Y, 5Y |
| rsi_period | int | 14 | RSI look-back window |
| macd_fast | int | 12 | Fast EMA period |
| macd_slow | int | 26 | Slow EMA period |
| macd_signal | int | 9 | Signal EMA period |

Response schema `IndicatorResponse`:
```python
class RSIPoint(BaseModel):
    date: date
    value: float

class MACDPoint(BaseModel):
    date: date
    macd: float
    signal_line: float
    histogram: float

class IndicatorResponse(BaseModel):
    rsi: List[RSIPoint]
    macd: List[MACDPoint]
```

### 5Y period support

`StockService.filter_by_period()` now accepts `"5Y"` in addition to
`1M`, `YTD`, `1Y`, `3Y`.

---

## Frontend

### New types (`types.ts`)

```ts
RSIConfig   { period, color, obLevel, osLevel }
MACDConfig  { fast, slow, signal, macdColor, signalColor, histUpColor, histDownColor }
RSIPoint    { date, value }
MACDPoint   { date, macd, signal_line, histogram }
IndicatorData { rsi: RSIPoint[], macd: MACDPoint[] }
```

### Store additions (`useAppStore.ts`)

```ts
rsiConfig: RSIConfig       // default: period=14, color='#ce93d8', ob=70, os=30
macdConfig: MACDConfig     // default: fast=12, slow=26, signal=9, standard colours
setRsiConfig(partial)
setMacdConfig(partial)
```

### New components

**`IndicatorToolbar`**
- Collapsible RSI section: period, OB level, OS level, line colour
- Collapsible MACD section: fast, slow, signal periods + 4 colour pickers
- Validates fast < slow at input level (max/min constraints)
- Rendered between MovingAverageToolbar and the chart

**`RSIChart`**
- Lightweight Charts canvas (height 160px)
- RSI line in configured colour
- Dashed OB reference line (red tint)
- Dashed OS reference line (green tint)
- Updates when data or config changes without remounting

**`MACDChart`**
- Lightweight Charts canvas (height 160px)
- MACD line, signal line, histogram bars
- Histogram bars coloured per-bar (histUpColor / histDownColor)
- Updates when data or config changes without remounting

### Period buttons

`['1M', 'YTD', '1Y', '3Y', '5Y']` — 5Y added.

### App.tsx additions

- Reads `rsiConfig` and `macdConfig` from store
- `useEffect` fetches `/indicators/{symbol}` whenever ticker, period, or
  either config object changes
- Renders `<RSIChart>` and `<MACDChart>` below `<StockChart>` in a Stack

---

## Test file: `backend/tests/test_indicators.py`

32 tests across three groups:

### RSI unit tests (12)
- Empty input → empty output
- Fewer rows than period → empty output
- Output columns: `[date, value]`
- Values bounded 0–100
- Pure uptrend → RSI > 90
- Pure downtrend → RSI < 10
- Invalid period (< 2) → ValueError
- Missing columns → ValueError
- Shorter period → more output rows
- Output sorted by date
- No NaN values

### MACD unit tests (12)
- Empty input → empty output
- Insufficient data → empty output
- Output columns: `[date, macd, signal_line, histogram]`
- histogram ≈ macd − signal_line (within rounding tolerance)
- No NaN values
- Output sorted by date
- fast ≥ slow → ValueError
- signal < 1 → ValueError
- Missing columns → ValueError
- Custom periods → more rows than defaults
- Flat prices → MACD ≈ 0

### API end-to-end tests (8)
- Returns both rsi and macd arrays
- RSI values bounded 0–100
- MACD histogram consistent
- Custom rsi_period returns more rows
- macd_fast ≥ macd_slow → 400
- Unknown symbol → 404
- 5Y period accepted
- Invalid period → 400

### Running

```bash
cd backend
../.VENV/bin/python -m pytest tests/test_indicators.py -v
# Expected: 32 passed

../.VENV/bin/python -m pytest tests/ -v
# Expected: 60 passed total
```
