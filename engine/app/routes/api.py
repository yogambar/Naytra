"""
Abstracted Public Market API Gateway for Naytra Client Apps.
Serves BSE Sensex 30 tickers, OHLCV charts with purple forecast candles,
and LLM market reasoning insights with strict caching headers.
Zero internal implementation details are leaked to the client.
"""
import hashlib
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, Header
from app.config import settings, SENSEX_30, SENSEX_DICT
from app.charts.candle_manager import candle_store
from app.llm.market_reasoner import market_reasoner
from app.ingestion.market_worker import market_worker
from app.cache.redis_client import cache

router = APIRouter(prefix="/api/v1/market", tags=["Market Data"])


@router.get("/tickers")
async def get_tickers(response: Response):
    """
    Returns all 30 BSE Sensex constituents with latest price and daily performance.
    Cached at Redis L2; instructs client L1 cache for 30s.
    """
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"

    cached_quotes = await cache.get_json("quotes:all")
    if cached_quotes:
        return {"count": len(cached_quotes), "data": cached_quotes}

    quotes = []
    for ticker in SENSEX_30:
        sym = ticker.symbol
        last_price = candle_store.get_last_price(sym) or 1000.0
        latest_c = candle_store.get_latest_candle(sym, "5m")
        open_p = latest_c.open if latest_c else last_price
        change = round(last_price - open_p, 2)
        change_pct = round((change / open_p) * 100, 2) if open_p > 0 else 0.0

        quotes.append({
            "symbol": sym,
            "name": ticker.name,
            "sector": ticker.sector,
            "bse_code": ticker.bse_code,
            "price": last_price,
            "open": open_p,
            "high": latest_c.high if latest_c else last_price,
            "low": latest_c.low if latest_c else last_price,
            "change": change,
            "change_pct": change_pct,
            "volume": latest_c.volume if latest_c else 0,
        })

    await cache.set_json("quotes:all", quotes, ttl_sec=settings.REDIS_TTL_QUOTES_SEC)
    return {"count": len(quotes), "data": quotes}


@router.get("/charts/{symbol}")
async def get_chart(
    symbol: str,
    response: Response,
    interval: str = Query("5m", pattern="^(1m|5m|15m|1D)$"),
    limit: int = Query(80, ge=10, le=300),
    include_forecast: bool = Query(True),
    if_none_match: Optional[str] = Header(None),
):
    """
    Returns unified candlestick series:
    - Actual Historical/Real-time Candles (Green #00C805 / Red #FF3B30)
    - Future Rest-of-Day Projected Candles (Purple #8A2BE2 with confidence bands)
    Each purple candle is automatically replaced as actual time arrives.
    """
    sym = symbol.upper()
    if sym not in SENSEX_DICT:
        raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found in BSE Sensex 30")

    candles = candle_store.get_chart(
        symbol=sym,
        interval=interval,
        limit_actual=limit,
        include_forecast=include_forecast,
    )

    candle_dicts = [c.dict() for c in candles]
    payload_str = json.dumps(candle_dicts, sort_keys=True)
    etag = f'W/"{hashlib.md5(payload_str.encode()).hexdigest()}"'

    if if_none_match == etag:
        response.status_code = 304
        return response

    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=120"
    response.headers["ETag"] = etag

    actual_count = sum(1 for c in candles if not c.is_forecast)
    forecast_count = sum(1 for c in candles if c.is_forecast)

    return {
        "symbol": sym,
        "interval": interval,
        "total_candles": len(candles),
        "actual_candles_count": actual_count,
        "forecast_candles_count": forecast_count,
        "color_legend": {
            "bullish_actual": settings.CANDLE_COLOR_BULLISH,
            "bearish_actual": settings.CANDLE_COLOR_BEARISH,
            "forecast": settings.CANDLE_COLOR_FORECAST,
        },
        "candles": candle_dicts,
    }


@router.get("/insights/{symbol}")
async def get_insight(symbol: str, response: Response):
    """
    Returns Gemini LLM market reasoning and technical synthesis for the ticker.
    Synthesizes price momentum, news catalysts, and ML prediction direction.
    """
    sym = symbol.upper()
    if sym not in SENSEX_DICT:
        raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found in BSE Sensex 30")

    response.headers["Cache-Control"] = "public, max-age=180, stale-while-revalidate=300"
    insight = await market_reasoner.generate_insight(sym, news_items=market_worker.latest_news)
    return insight


@router.get("/quote/{symbol}")
async def get_quote(symbol: str, response: Response):
    """Returns single quote for a ticker."""
    sym = symbol.upper()
    if sym not in SENSEX_DICT:
        raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found in BSE Sensex 30")

    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=30"
    cached = await cache.get_json(f"quote:{sym}")
    if cached:
        return cached

    ticker = SENSEX_DICT[sym]
    last_price = candle_store.get_last_price(sym) or 1000.0
    latest_c = candle_store.get_latest_candle(sym, "5m")

    quote = {
        "symbol": sym,
        "name": ticker.name,
        "sector": ticker.sector,
        "bse_code": ticker.bse_code,
        "price": last_price,
        "open": latest_c.open if latest_c else last_price,
        "high": latest_c.high if latest_c else last_price,
        "low": latest_c.low if latest_c else last_price,
        "volume": latest_c.volume if latest_c else 0,
    }
    await cache.set_json(f"quote:{sym}", quote, ttl_sec=15)
    return quote
