"""
Market Routes Gateway for Client Applications.
Abstracts the underlying ML forecasting engine, chart stores, and LLM reasoning.
The client only receives standard OHLCV candles (green/red) and purple forecast candles (#8A2BE2),
with strict caching headers (ETag, Cache-Control, SWR) to minimize backend server load.
"""
from typing import Optional
from fastapi import APIRouter, Response, Header, Query, HTTPException
import httpx
from app.config import get_settings

router = APIRouter(prefix="/market", tags=["Market"])

settings = get_settings()
ENGINE_URL = getattr(settings, "ENGINE_URL", "http://127.0.0.1:8001")


@router.get("/tickers")
async def get_market_tickers(response: Response):
    """Fetches BSE Sensex 30 tickers and quotes from the predictive engine."""
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(f"{ENGINE_URL}/api/v1/market/tickers")
            return res.json()
    except Exception:
        # Fallback if engine is momentarily restarting
        return {"count": 0, "data": []}


@router.get("/charts/{symbol}")
async def get_market_chart(
    symbol: str,
    response: Response,
    interval: str = Query("5m", pattern="^(1m|5m|15m|1D|1W|1M|1Y|5Y)$"),
    timeline: str = Query("1D", pattern="^(1D|1W|1M|1Y|5Y|1m|5m|15m)$"),
    limit: int = Query(80, ge=10, le=300),
    include_forecast: bool = Query(True),
    if_none_match: Optional[str] = Header(None),
):
    """
    Returns candlestick chart series containing:
    - Real actual candles (Green #00C805 / Red #FF3B30)
    - Future session forecasts (Purple #8A2BE2) for 1D timeline
    """
    headers = {}
    if if_none_match:
        headers["if-none-match"] = if_none_match

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                f"{ENGINE_URL}/api/v1/market/charts/{symbol.upper()}",
                params={
                    "interval": interval,
                    "timeline": timeline,
                    "limit": limit,
                    "include_forecast": include_forecast,
                },
                headers=headers,
            )

            if res.status_code == 304:
                response.status_code = 304
                return response

            if res.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found")

            # Forward cache headers
            if "etag" in res.headers:
                response.headers["ETag"] = res.headers["etag"]
            response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=120"
            return res.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail="Market predictive engine temporarily unavailable")


@router.get("/insights/{symbol}")
async def get_market_insight(symbol: str, response: Response):
    """Returns Gemini LLM market reasoning and technical synthesis for the ticker."""
    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(f"{ENGINE_URL}/api/v1/market/insights/{symbol.upper()}")
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found")
            return res.json()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Market reasoning engine temporarily unavailable")


@router.get("/quote/{symbol}")
async def get_market_quote(symbol: str, response: Response):
    """Returns single quote for a ticker."""
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=30"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{ENGINE_URL}/api/v1/market/quote/{symbol.upper()}")
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found")
            return res.json()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Market quote service unavailable")
