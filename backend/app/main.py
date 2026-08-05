from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import (
    AIAnalysisResponse,
    DocumentInsightResponse,
    ErrorResponse,
    MovingAveragePoint,
    PricePoint,
    SMASignalResponse,
    SymbolListResponse,
)
from app.repositories.stock_repository import StockRepository
from app.services.ai_analysis_service import AIAnalysisService
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


@app.get("/symbols", response_model=SymbolListResponse)
async def list_symbols() -> SymbolListResponse:
    return SymbolListResponse(symbols=service.list_symbols())


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
