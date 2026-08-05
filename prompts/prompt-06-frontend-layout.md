# Prompt 06 - Frontend Layout
```text
Build the frontend using

React
TypeScript
Material UI
Recharts

Layout

--------------------------------------------------

Ticker List  |  Chart Area / Portfolio  |  AI Analysis Pane

--------------------------------------------------

Left pane — Ticker List (≈16% width)

  Header row contains
    "Ticker List" heading
    "Portfolio" link/button (toggles the portfolio view)

  Scrollable list of ticker symbols
    Each row has a delete icon on hover (confirms before removing)
    Selecting a symbol loads its chart

  "Add Symbol" button at the bottom
    Opens a dialog: ticker input + history period dropdown
    Downloads price data from yfinance
    Refreshes the list on success

Centre pane — Chart Area (flex, fills remaining space)
  When a ticker is selected: shows chart (see below)
  When Portfolio is active: shows PortfolioPane full-width

Right pane — AI Analysis Pane (auto width, hidden when portfolio is active)
  Border-left separator on md+ screens

State management
  Zustand store (persisted to localStorage)

Use reusable components.
Responsive layout (stacks vertically on small screens).
```
