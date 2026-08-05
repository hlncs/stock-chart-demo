from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import (
    AIAnalysisResponse,
    AddSymbolRequest,
    AddSymbolResponse,
    AddTransactionRequest,
    DocumentInsightResponse,
    ErrorResponse,
    IndicatorResponse,
    MACDPoint,
    MovingAveragePoint,
    PortfolioHolding,
    PortfolioResponse,
    PricePoint,
    RSIPoint,
    SMASignalResponse,
    SymbolListResponse,
    Transaction,
    TransactionListResponse,
)
from app.repositories.stock_repository import StockRepository
from app.services.ai_analysis_service import AIAnalysisService
from app.services.indicator_service import IndicatorService
from app.services.stock_service import StockService

app = FastAPI(title="Stock Chart Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

repository = StockRepository()
service = StockService(repository)
ai_service = AIAnalysisService()
indicator_service = IndicatorService()


@app.get("/symbols", response_model=SymbolListResponse)
async def list_symbols() -> SymbolListResponse:
    return SymbolListResponse(symbols=service.list_symbols())


@app.post("/symbols", response_model=AddSymbolResponse, status_code=201)
async def add_symbol(req: AddSymbolRequest) -> AddSymbolResponse:
    """Download price history for a new symbol via yfinance and save it."""
    import pandas as pd
    import yfinance as yf

    symbol = req.symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=422, detail="Symbol must not be empty.")

    # Reject if already loaded
    if symbol in [s.upper() for s in service.list_symbols()]:
        raise HTTPException(status_code=409, detail=f"{symbol} is already in the ticker list.")

    try:
        ticker = yf.Ticker(symbol)
        history = ticker.history(period=req.period, interval="1d", auto_adjust=False)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch data from yfinance: {exc}") from exc

    if history.empty:
        raise HTTPException(status_code=404, detail=f"No price data found for symbol {symbol}.")

    history = history.reset_index()
    history = history[["Date", "Open", "High", "Low", "Close", "Volume"]]
    history.columns = pd.Index(["date", "open", "high", "low", "close", "volume"])
    history["date"] = pd.to_datetime(history["date"]).dt.date
    history = history.sort_values("date").drop_duplicates(subset=["date"])

    repository.save_prices(symbol, history)
    return AddSymbolResponse(symbol=symbol, rows_loaded=len(history))


@app.delete("/symbols/{symbol}", status_code=204)
async def delete_symbol(symbol: str) -> None:
    """Remove a symbol's price data from the ticker list."""
    try:
        repository.delete_symbol(symbol)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/prices/{symbol}", response_model=list[PricePoint])
async def get_prices(symbol: str, period: str | None = Query(default=None)) -> list[PricePoint]:
    try:
        rows = service.get_prices(symbol, period)
        return [PricePoint(**row) for row in rows]
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/moving-average/{symbol}", response_model=list[MovingAveragePoint])
async def get_moving_average(
    symbol: str,
    period: str | None = Query(default=None),
    window: int = Query(default=20, ge=2),
) -> list[MovingAveragePoint]:
    try:
        rows = service.get_moving_average(symbol, window=window, period=period)
        return [MovingAveragePoint(**row) for row in rows]
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/indicators/{symbol}", response_model=IndicatorResponse)
async def get_indicators(
    symbol: str,
    period: str | None = Query(default=None),
    rsi_period: int = Query(default=14, ge=2, description="RSI look-back period"),
    macd_fast: int = Query(default=12, ge=2, description="MACD fast EMA period"),
    macd_slow: int = Query(default=26, ge=3, description="MACD slow EMA period"),
    macd_signal: int = Query(default=9, ge=1, description="MACD signal EMA period"),
) -> IndicatorResponse:
    """Return RSI and MACD indicator series for a symbol."""
    try:
        frame = repository.get_prices(symbol)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if period:
        try:
            frame = service.filter_by_period(frame, period)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if macd_fast >= macd_slow:
        raise HTTPException(status_code=400, detail="macd_fast must be less than macd_slow")

    rsi_df = indicator_service.calculate_rsi(frame, period=rsi_period)
    macd_df = indicator_service.calculate_macd(frame, fast=macd_fast, slow=macd_slow, signal=macd_signal)

    return IndicatorResponse(
        rsi=[RSIPoint(date=row["date"], value=row["value"]) for _, row in rsi_df.iterrows()],
        macd=[
            MACDPoint(
                date=row["date"],
                macd=row["macd"],
                signal_line=row["signal_line"],
                histogram=row["histogram"],
            )
            for _, row in macd_df.iterrows()
        ],
    )


@app.get("/ai-analysis/{symbol}", response_model=AIAnalysisResponse)
async def get_ai_analysis(
    symbol: str,
    period: str | None = Query(default=None),
    custom_window: int = Query(default=150, ge=150, description="Long-term SMA window (minimum 150)"),
) -> AIAnalysisResponse:
    """Return AI-driven buy/hold/sell advice based on SMAs and company documents."""
    try:
        frame = service.repository.get_prices(symbol)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if period:
        try:
            frame = service.filter_by_period(frame, period)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = ai_service.analyse(symbol, frame, custom_window=custom_window)

    return AIAnalysisResponse(
        symbol=result.symbol,
        overall_signal=result.overall_signal,
        overall_comment=result.overall_comment,
        short_term=SMASignalResponse(
            timeframe=result.short_term.timeframe,
            signal=result.short_term.signal,
            fast_sma=result.short_term.fast_sma,
            slow_sma=result.short_term.slow_sma,
            comment=result.short_term.comment,
        ),
        long_term=SMASignalResponse(
            timeframe=result.long_term.timeframe,
            signal=result.long_term.signal,
            fast_sma=result.long_term.fast_sma,
            slow_sma=result.long_term.slow_sma,
            comment=result.long_term.comment,
        ),
        document_insights=[
            DocumentInsightResponse(
                filename=doc.filename,
                snippet=doc.snippet,
                sentiment=doc.sentiment,
            )
            for doc in result.document_insights
        ],
    )


# ---------------------------------------------------------------------------
# Portfolio endpoints
# ---------------------------------------------------------------------------

def _compute_holdings(repository: StockRepository) -> list[PortfolioHolding]:
    """Derive current holdings from the transactions ledger."""
    df = repository.get_transactions()
    if df.empty:
        return []

    holdings = []
    symbols = df["symbol"].str.upper().unique()
    for symbol in sorted(symbols):
        rows = df[df["symbol"].str.upper() == symbol]
        net_shares = 0.0
        total_cost_basis = 0.0

        for _, row in rows.sort_values("date").iterrows():
            s = float(row["shares"])
            p = float(row["price_per_share"])
            c = float(row["commission"])
            if str(row["action"]).upper() == "BUY":
                total_cost_basis += s * p + c
                net_shares += s
            else:  # SELL — reduce cost basis proportionally
                if net_shares > 0:
                    avg = total_cost_basis / net_shares
                    total_cost_basis -= avg * s
                net_shares -= s

        net_shares = max(net_shares, 0.0)
        if net_shares == 0:
            continue  # fully sold, skip from summary

        avg_cost = (total_cost_basis / net_shares) if net_shares > 0 else 0.0

        try:
            current_price = repository.get_latest_price(symbol)
        except FileNotFoundError:
            current_price = 0.0

        market_value = net_shares * current_price
        profit_dollars = market_value - total_cost_basis
        profit_percent = (profit_dollars / total_cost_basis * 100) if total_cost_basis != 0 else 0.0

        holdings.append(
            PortfolioHolding(
                symbol=symbol,
                shares=net_shares,
                avg_cost=avg_cost,
                current_price=current_price,
                total_cost=total_cost_basis,
                market_value=market_value,
                profit_dollars=profit_dollars,
                profit_percent=profit_percent,
            )
        )
    return holdings


@app.get("/portfolio", response_model=PortfolioResponse)
async def get_portfolio() -> PortfolioResponse:
    """Return portfolio summary derived from the transactions ledger."""
    holdings = _compute_holdings(repository)

    total_cost = sum(h.total_cost for h in holdings)
    total_market_value = sum(h.market_value for h in holdings)
    total_profit_dollars = total_market_value - total_cost
    total_profit_percent = (total_profit_dollars / total_cost * 100) if total_cost != 0 else 0.0

    return PortfolioResponse(
        holdings=holdings,
        total_cost=total_cost,
        total_market_value=total_market_value,
        total_profit_dollars=total_profit_dollars,
        total_profit_percent=total_profit_percent,
    )


@app.get("/portfolio/transactions/{symbol}", response_model=TransactionListResponse)
async def get_transactions(symbol: str) -> TransactionListResponse:
    """Return all transactions for a given symbol."""
    df = repository.get_transactions(symbol=symbol)
    transactions = [
        Transaction(
            id=int(row["id"]) if "id" in row and row["id"] is not None else None,
            symbol=str(row["symbol"]).upper(),
            action=str(row["action"]).upper(),  # type: ignore[arg-type]
            date=row["date"],
            shares=float(row["shares"]),
            price_per_share=float(row["price_per_share"]),
            commission=float(row["commission"]),
        )
        for _, row in df.iterrows()
    ]
    return TransactionListResponse(transactions=transactions)


@app.post("/portfolio/transactions", response_model=Transaction, status_code=201)
async def add_transaction(req: AddTransactionRequest) -> Transaction:
    """Add a BUY or SELL transaction to the ledger."""
    symbol = req.symbol.upper()
    # Validate symbol exists (price data must exist)
    try:
        repository.get_prices(symbol)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown symbol: {symbol}") from exc

    # Validate sell doesn't exceed holdings
    if req.action == "SELL":
        holdings = _compute_holdings(repository)
        holding = next((h for h in holdings if h.symbol == symbol), None)
        current_shares = holding.shares if holding else 0.0
        if req.shares > current_shares:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell {req.shares} shares; only {current_shares} held.",
            )

    record = repository.add_transaction(
        {
            "symbol": symbol,
            "action": req.action,
            "date": str(req.date),
            "shares": req.shares,
            "price_per_share": req.price_per_share,
            "commission": req.commission,
        }
    )
    return Transaction(
        id=int(record["id"]),
        symbol=str(record["symbol"]),
        action=str(record["action"]),  # type: ignore[arg-type]
        date=record["date"],
        shares=float(record["shares"]),
        price_per_share=float(record["price_per_share"]),
        commission=float(record["commission"]),
    )
