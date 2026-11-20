"""
Backend Engineer Operations & Observability API Routes.
Exposes endpoints for the Ops Console UI and monitoring agents:
- /ops/health: Detailed system diagnostics
- /ops/trigger-forecast/{symbol}: Manually trigger ML prediction
- /ops/trigger-ingest: Manually trigger market tick ingestion
- /ops/news: Latest Marketaux news feed
"""
from fastapi import APIRouter, HTTPException
from app.ops.health_checker import get_system_metrics
from app.models.candle_predictor import predictor
from app.ingestion.market_worker import market_worker
from app.cache.redis_client import cache
from app.config import SENSEX_DICT

ops_router = APIRouter(prefix="/ops", tags=["Engineer Ops"])


@ops_router.get("/health")
async def ops_health():
    """Returns complete real-time diagnostics for the ops dashboard."""
    return await get_system_metrics()


@ops_router.get("/news")
async def ops_news():
    """Returns cached news articles from Marketaux."""
    return {
        "count": len(market_worker.latest_news),
        "articles": market_worker.latest_news,
    }


@ops_router.post("/trigger-forecast/{symbol}")
async def trigger_symbol_forecast(symbol: str):
    """Manually triggers an ML forecast run for a specific symbol."""
    sym = symbol.upper()
    if sym not in SENSEX_DICT:
        raise HTTPException(status_code=404, detail="Symbol not found")
    forecast_candles = predictor.forecast_rest_of_day(sym, interval="5m")
    return {
        "status": "SUCCESS",
        "symbol": sym,
        "forecast_candles_generated": len(forecast_candles),
    }


@ops_router.post("/trigger-forecast-all")
async def trigger_forecast_all():
    """Forces an immediate ML forecast generation across all 30 tickers."""
    predictor.run_all_forecasts()
    return {"status": "SUCCESS", "message": "Triggered forecasts for all 30 tickers"}


@ops_router.post("/trigger-ingest")
async def trigger_ingest():
    """Forces an immediate market tick ingestion cycle."""
    await market_worker.ingest_cycle()
    return {"status": "SUCCESS", "message": "Ingestion cycle executed"}


@ops_router.post("/trigger-news")
async def trigger_news():
    """Forces an immediate news re-fetch (Marketaux or curated fallback)."""
    articles = await market_worker.fetch_marketaux_news()
    return {"status": "SUCCESS", "count": len(articles), "message": f"Fetched {len(articles)} news articles"}


@ops_router.post("/clear-cache")
async def clear_cache():
    """Clears in-memory and Redis caches."""
    cache._memory_store.clear()
    return {"status": "SUCCESS", "message": "Cache flushed"}
