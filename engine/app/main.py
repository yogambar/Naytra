"""
Main FastAPI Application Entrypoint for Naytra Predictive Engine Server.
Orchestrates:
1. Market Ingestion Worker (Twelve Data BSE + yfinance + Marketaux)
2. ML Candle Forecasting Engine (PyTorch LSTM, Purple #8A2BE2 candles)
3. Gemini 2.5 Flash Market Reasoner
4. Redis L2 Cache & In-Memory Fallback
5. Dedicated Ops Console Web UI for Backend Engineers
"""
import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.cache.redis_client import cache
from app.charts.candle_manager import candle_store
from app.ingestion.market_worker import market_worker
from app.models.candle_predictor import predictor
from app.routes.api import router as api_router
from app.routes.ops import ops_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("naytra.engine")

scheduler = AsyncIOScheduler()


async def scheduled_market_ingestion():
    try:
        await market_worker.ingest_cycle()
    except Exception as e:
        logger.error("Error in scheduled market ingestion: %s", e)


def scheduled_forecast_update():
    try:
        predictor.run_all_forecasts()
    except Exception as e:
        logger.error("Error in scheduled ML forecasting: %s", e)


async def scheduled_news_update():
    try:
        await market_worker.fetch_marketaux_news()
    except Exception as e:
        logger.error("Error in scheduled news ingestion: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    logger.info("==================================================")
    logger.info("   NAYTRA PREDICTIVE BACKEND ENGINE STARTING      ")
    logger.info("==================================================")

    # 1. Connect Cache
    await cache.connect()

    # 2. Restore historical candles from disk if present
    candle_store.load_from_disk()

    # 3. Initial Ingestion cycle
    logger.info("Running initial market ingestion cycle...")
    await market_worker.ingest_cycle()

    # 4. Initial ML Candle Forecasts
    logger.info("Generating initial ML purple forecast candles...")
    predictor.run_all_forecasts()

    # 5. Fetch initial news (await to ensure ready before first request)
    await market_worker.fetch_marketaux_news()

    # 6. Configure APScheduler
    scheduler.add_job(
        scheduled_market_ingestion,
        "interval",
        seconds=settings.MARKET_INGESTION_INTERVAL_SEC,
        id="market_ingestion",
        replace_existing=True,
    )
    scheduler.add_job(
        scheduled_forecast_update,
        "interval",
        seconds=settings.FORECAST_INTERVAL_SEC,
        id="ml_forecaster",
        replace_existing=True,
    )
    scheduler.add_job(
        scheduled_news_update,
        "interval",
        seconds=settings.NEWS_INGESTION_INTERVAL_SEC,
        id="news_ingestion",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Background schedulers active (Ingest: %ds, Forecast: %ds, News: %ds)",
                settings.MARKET_INGESTION_INTERVAL_SEC,
                settings.FORECAST_INTERVAL_SEC,
                settings.NEWS_INGESTION_INTERVAL_SEC)

    yield

    # --- SHUTDOWN ---
    logger.info("Shutting down Naytra Predictive Engine...")
    scheduler.shutdown(wait=False)
    candle_store.save_to_disk()
    await cache.close()
    logger.info("Naytra Predictive Engine stopped cleanly.")


app = FastAPI(
    title="Naytra Predictive Backend Engine",
    description="Standalone real-time market ingestion, ML candle forecasting & LLM reasoning engine for BSE Sensex 30.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(api_router)
app.include_router(ops_router)

# Mount Ops Console static files
ops_console_dir = os.path.join(os.path.dirname(__file__), "..", "ops-console")
os.makedirs(ops_console_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=ops_console_dir), name="static")


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    """Redirect root to Ops Console."""
    return RedirectResponse(url="/console")


@app.api_route("/console", methods=["GET", "HEAD"])
async def ops_console_page():
    """Serves the Backend Engineer Ops Console web dashboard."""
    index_path = os.path.join(ops_console_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "Naytra Predictive Backend Engine Online",
        "docs": "/docs",
        "ops_health": "/ops/health",
        "api_tickers": "/api/v1/market/tickers",
    }
