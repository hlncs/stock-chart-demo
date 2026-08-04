from fastapi import FastAPI, HTTPException, Query

from app.models.schemas import ErrorResponse, MovingAveragePoint, PricePoint, SymbolListResponse
from app.repositories.stock_repository import StockRepository
from app.services.stock_service import StockService

app = FastAPI(title="Stock Chart Demo API")
repository = StockRepository()
service = StockService(repository)


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
async def get_moving_average(symbol: str, period: str | None = Query(default=None), window: int = Query(default=20, ge=2)) -> list[MovingAveragePoint]:
    try:
        rows = service.get_moving_average(symbol, window=window, period=period)
        return [MovingAveragePoint(**row) for row in rows]
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
