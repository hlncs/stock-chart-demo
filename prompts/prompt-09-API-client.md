# Prompt 09 - API Client
```text
Create a frontend API service using Axios.

Base URL: /api   (proxied by Vite to the FastAPI backend)

Endpoints

  GET  /symbols
  POST /symbols                       — add a new symbol (downloads via yfinance)
  DELETE /symbols/{symbol}            — remove a symbol

  GET  /prices/{symbol}?period=
  GET  /moving-average/{symbol}?period=&window=

  GET  /ai-analysis/{symbol}?period=&custom_window=

  GET  /portfolio
  GET  /portfolio/transactions/{symbol}
  POST /portfolio/transactions

TypeScript interfaces for all request/response shapes (see types.ts):
  PricePoint          — date, open, high, low, close, volume
  MovingAveragePoint  — date, value
  AIAnalysis          — symbol, overall_signal, overall_comment, short_term, long_term, document_insights
  PortfolioData       — holdings[], total_cost, total_market_value, total_profit_dollars, total_profit_percent
  PortfolioHolding    — symbol, shares, avg_cost, current_price, total_cost, market_value, profit_dollars, profit_percent
  Transaction         — id?, symbol, action, date, shares, price_per_share, commission
  AddTransactionRequest
  AddSymbolResponse   — symbol, rows_loaded

Implement
  Centralized Axios instance with base URL and timeout
  Request cancellation tokens
  Loading states
  Error states
```
