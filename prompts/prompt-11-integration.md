# Prompt 11 - Integration
```text
Integrate frontend and backend.

Workflow

Application loads
  ↓
Fetch /symbols
  ↓
Display list in TickerList component (left pane)
  ↓
Select first symbol automatically
  ↓
Load price history (includes volume)
  ↓
Render chart

Changing period        → reload prices
Enabling SMA           → fetch moving average for each enabled indicator
                         Multiple SMAs can be enabled simultaneously
Changing SMA color     → immediately updates line color (no backend call)
Changing ticker        → reload price history + enabled moving averages
                         Maintain current period and SMA selections
Adding a symbol        → POST /symbols, refresh ticker list, select new symbol
Removing a symbol      → DELETE /symbols/{symbol}, refresh list,
                         auto-select first remaining ticker if deleted was selected

Show loading spinner during fetches.
Display meaningful error messages.

Hover tooltip shows
  Date
  Price ($xxx.xx)
  Each enabled SMA value ($xxx.xx)
  Volume (formatted, e.g. 67.88M) — always at the bottom of the tooltip

Portfolio view (toggled via "Portfolio" link in ticker list header)
  Replaces chart area
  Hides AI analysis pane
  Clicking any ticker row returns to chart view

Portfolio summary table
  Columns: Symbol, Shares, Avg Cost, Current Price, Total Cost,
           Market Value, Profit ($), Profit (%)
  Click a row → drill into transaction history for that symbol
  "Add Transaction" button → opens dialog for BUY or SELL entry

Transaction drill-down
  Shows position summary card: outstanding shares, avg cost,
  current price, market value, P&L
  Shows full transaction table sorted by date
  Each row: id, BUY/SELL chip, date, shares, price/share, commission, total value
  "Add Transaction" button

Add Transaction dialog
  BUY / SELL toggle
  Symbol selector
  Date picker
  Shares input
  Price per share input
  Commission input
  Total cost / proceeds preview
  Validates sell qty ≤ outstanding shares

TickerList component (separate component, not inline in App)
  Symbol rows with hover delete icon
  Confirmation dialog before delete (warns portfolio transactions are kept)
  "Add Symbol" button → dialog with ticker input and history period dropdown
  After add/delete: refreshes symbol list
```
