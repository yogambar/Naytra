"""
Health & Observability Aggregator for Naytra Predictive Engine.
Collects and serves real-time diagnostics on:
- ML Model health & inference latency
- Gemini LLM latency, token generation & error rates
- External API keys quota (Twelve Data 800/day, Marketaux 100/day)
- Redis cache hit/miss ratio & memory footprint
- System CPU, RAM, and process uptime
"""
import time
import os
import psutil
from datetime import datetime
from app.config import settings, SENSEX_30
from app.ingestion.market_worker import stats as ingest_stats
from app.models.candle_predictor import model_health
from app.llm.market_reasoner import llm_health
from app.charts.candle_manager import candle_store, IST
from app.cache.redis_client import cache

START_TIME = time.time()


async def get_system_metrics() -> dict:
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    cpu_pct = process.cpu_percent(interval=0.1)

    uptime_sec = int(time.time() - START_TIME)
    uptime_fmt = f"{uptime_sec // 3600}h {(uptime_sec % 3600) // 60}m {uptime_sec % 60}s"

    cache_stats = await cache.get_stats()
    chart_summary = candle_store.export_summary()

    return {
        "status": "OPERATIONAL",
        "timestamp": datetime.now(tz=IST).isoformat(),
        "uptime": uptime_fmt,
        "uptime_seconds": uptime_sec,
        "process": {
            "pid": os.getpid(),
            "cpu_percent": cpu_pct,
            "memory_mb": round(mem_info.rss / (1024 * 1024), 2),
            "memory_percent": round(process.memory_percent(), 2),
        },
        "model_health": model_health.to_dict(),
        "llm_health": llm_health.to_dict(),
        "api_keys": {
            "twelve_data": {
                "key_preview": settings.TWELVE_DATA_API_KEY[:6] + "..." + settings.TWELVE_DATA_API_KEY[-4:],
                "plan": "Basic 8",
                "daily_limit": 800,
                "credits_used_today": ingest_stats.twelve_data_calls_today,
                "credits_remaining": max(0, 800 - ingest_stats.twelve_data_calls_today),
                "error_count": ingest_stats.twelve_data_error_count,
                "status": "HEALTHY" if ingest_stats.twelve_data_error_count < 10 else "DEGRADED",
            },
            "marketaux": {
                "key_preview": settings.MARKETAUX_API_KEY[:6] + "..." + settings.MARKETAUX_API_KEY[-4:],
                "plan": "Free",
                "daily_limit": 100,
                "calls_used_today": ingest_stats.marketaux_calls_today,
                "calls_remaining": max(0, 100 - ingest_stats.marketaux_calls_today),
                "error_count": ingest_stats.marketaux_error_count,
                "status": "HEALTHY" if ingest_stats.marketaux_error_count < 5 else "DEGRADED",
            },
            "gemini": {
                "key_preview": settings.GEMINI_API_KEY[:6] + "..." + settings.GEMINI_API_KEY[-4:],
                "model": "gemini-2.5-flash",
                "status": llm_health.status,
                "success_rate_pct": llm_health.to_dict()["success_rate_pct"],
            },
        },
        "cache": cache_stats,
        "charts": {
            "tracked_tickers": len(SENSEX_30),
            "total_actual_candles": chart_summary["total_actual_candles"],
            "total_forecast_candles": chart_summary["total_forecast_candles"],
        },
    }
