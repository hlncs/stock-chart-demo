# Prompt 30 - Frontend Test Specification

## Overview

Frontend tests cover three areas:
1. **StockChart** — tooltip rendering and dual-YAxis volume isolation
2. **TickerList** — add/delete symbol dialogs
3. **PortfolioPane** — summary table, transaction drill-down, Add Transaction dialog

Recommended stack: **Vitest + React Testing Library** (matches the Vite build toolchain).

Install:
```bash
cd frontend
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add to `vite.config.ts`:
```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.ts',
}
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
```

---

## 1. StockChart — `src/components/StockChart.test.tsx`

### Tooltip label format

| # | Test | Expected |
|---|------|----------|
| 1 | Custom SMA label passed as "150 SMA" renders as "150 SMA" in legend | text "150 SMA" present |
| 2 | Custom SMA label is NOT "SMA 150" | text "SMA 150" absent |
| 3 | Fixed labels "20 SMA" and "50 SMA" render unchanged | both present |

### Volume in tooltip

| # | Test | Expected |
|---|------|----------|
| 4 | Tooltip shows "Volume: 67.88M" for value 67,882,600 | formatted string present |
| 5 | Tooltip shows "Volume: 1.23B" for value 1,234,000,000 | formatted string present |
| 6 | Tooltip shows "Volume: 500.0K" for value 500,000 | formatted string present |
| 7 | Tooltip omits Volume row when volume = 0 | "Volume" text absent |
| 8 | Tooltip omits Volume row when volume is missing | "Volume" text absent |

### Volume / price axis isolation (regression)

| # | Test | Expected |
|---|------|----------|
| 9  | Chart renders with high-volume data without crashing | component mounts |
| 10 | Price line and volume line are assigned to different yAxisId values | yAxisId="price" on price Line, yAxisId="volume" on volume Line |
| 11 | The hidden volume YAxis has hide=true | axis not visible |
| 12 | Volume line has legendType="none" | Volume does not appear in legend |

### General

| # | Test | Expected |
|---|------|----------|
| 13 | Shows "No data available for AAPL" when priceData is empty | empty state text |
| 14 | Renders SMA lines for all enabled entries | correct line count |

---

## 2. TickerList — `src/components/TickerList.test.tsx`

### Rendering

| # | Test | Expected |
|---|------|----------|
| 15 | Renders all symbol names | each symbol in DOM |
| 16 | Selected ticker row is highlighted | aria-selected or selected prop |
| 17 | "Portfolio" link is present | text "Portfolio" |
| 18 | "Add Symbol" button is present | button text |
| 19 | Delete icon visible on hover for each row | icon rendered per row |

### Portfolio toggle

| # | Test | Expected |
|---|------|----------|
| 20 | Clicking "Portfolio" calls onTogglePortfolio | mock called once |
| 21 | showPortfolio=true styles the link as active | color/weight change |

### Selecting a ticker

| # | Test | Expected |
|---|------|----------|
| 22 | Clicking a symbol calls onSelectTicker with that symbol | mock called with "AAPL" |

### Add symbol dialog

| # | Test | Expected |
|---|------|----------|
| 23 | Clicking "Add Symbol" opens the dialog | dialog visible |
| 24 | "Add" button disabled when input is empty | button disabled |
| 25 | Typing a symbol enables the "Add" button | button enabled |
| 26 | Input converts to uppercase automatically | value is uppercase |
| 27 | Successful add shows success message and calls onSymbolsChanged | mock called |
| 28 | Failed add (API error) shows error message in dialog | error text present |
| 29 | Cancel closes dialog without calling onSymbolsChanged | mock not called |

### Delete symbol dialog

| # | Test | Expected |
|---|------|----------|
| 30 | Clicking delete icon opens confirmation dialog | dialog with symbol name |
| 31 | Cancel closes dialog without calling onSymbolsChanged | mock not called |
| 32 | Confirming delete calls onSymbolsChanged | mock called |
| 33 | Delete click does not also trigger onSelectTicker | selectTicker mock not called |
| 34 | Failed delete shows error message in dialog | error text present |

---

## 3. PortfolioPane — `src/components/PortfolioPane.test.tsx`

### Summary table

| # | Test | Expected |
|---|------|----------|
| 35 | Shows loading spinner while fetching | spinner present |
| 36 | Renders one row per holding | correct row count |
| 37 | Shows symbol, shares, avg cost, current price, total cost, market value | all columns populated |
| 38 | Positive profit renders in green with TrendingUp icon | green color, icon |
| 39 | Negative profit renders in red with TrendingDown icon | red color, icon |
| 40 | Totals row shows correct sums | footer values match sum of rows |
| 41 | "Click a row to view transactions" hint is present | hint text |
| 42 | Error state shows error alert | alert text |
| 43 | "Add Transaction" button is present in summary view | button |

### Drill-down navigation

| # | Test | Expected |
|---|------|----------|
| 44 | Clicking a symbol row opens transaction panel for that symbol | panel heading contains symbol |
| 45 | Back button returns to summary table | summary table visible |
| 46 | Position summary card shows outstanding shares, avg cost, current price, market value, P&L | all values |

### Transaction table

| # | Test | Expected |
|---|------|----------|
| 47 | Renders one row per transaction | correct row count |
| 48 | BUY action shows green chip labelled "BUY" | green chip |
| 49 | SELL action shows red chip labelled "SELL" | red chip |
| 50 | Shows "No transactions found" when list is empty | empty state text |
| 51 | Transaction ids are displayed and are integers | no "NaN" in DOM |

### Add Transaction dialog

| # | Test | Expected |
|---|------|----------|
| 52 | "Add Transaction" button opens dialog | dialog visible |
| 53 | BUY/SELL toggle switches correctly | toggle state |
| 54 | "Save" button disabled when required fields are empty | button disabled |
| 55 | Total cost preview updates as shares/price/commission change | preview value |
| 56 | Sell qty > available shows validation error below shares field | helper text |
| 57 | Successful save closes dialog and refreshes transactions | dialog gone, new row |
| 58 | API error shows inline error in dialog | error text |
| 59 | Cancel closes dialog without saving | dialog gone, no new row |

---

## Known Regressions to Guard Against

| Regression | Test # |
|------------|--------|
| Custom SMA label "SMA 150" instead of "150 SMA" | 1, 2 |
| Volume crushing price scale (single shared YAxis) | 9, 10, 11 |
| Transaction id = NaN causing "Unable to load transactions" | 51 |

---

## Running Frontend Tests

```bash
cd frontend
npm run test          # watch mode
npm run test -- --run  # single pass (CI)
```
