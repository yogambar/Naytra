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
    interval: str = Query("5m", pattern="^(1m|5m|15m|1D|1W|1M|1Y|5Y)$"),
    timeline: str = Query("1D", pattern="^(1D|1W|1M|1Y|5Y|1m|5m|15m)$"),
    limit: int = Query(80, ge=10, le=300),
    include_forecast: bool = Query(True),
    if_none_match: Optional[str] = Header(None),
):
    """
    Returns candlestick series:
    - 1D timeline: Intraday historical candles (Green #00C805 / Red #FF3B30) + today's Purple #8A2BE2 forecasts.
    - 1W, 1M, 1Y, 5Y timelines: Historical actual period candles only (forecasts strictly disabled).
    - Dynamic replacement: Purple forecast candle at timestamp T is replaced when real tick arrives.
    """
    sym = symbol.upper()
    if sym not in SENSEX_DICT:
        raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found in BSE Sensex 30")

    # If timeline is set to multi-period, ensure it takes precedence
    effective_timeline = timeline if timeline in ["1D", "1W", "1M", "1Y", "5Y"] else (
        "1D" if interval in ["1m", "5m", "15m", "1D"] else interval
    )

    candles = candle_store.get_chart(
        symbol=sym,
        interval=interval,
        limit_actual=limit,
        include_forecast=include_forecast,
        timeline=effective_timeline,
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
    market_info = settings.get_market_status()

    return {
        "symbol": sym,
        "interval": interval,
        "timeline": effective_timeline,
        "market": market_info,
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
    stock_news = market_worker.get_news_for_symbol(sym)
    insight = await market_reasoner.generate_insight(sym, news_items=stock_news)
    return insight


@router.get("/news/{symbol}")
async def get_stock_news(symbol: str, response: Response):
    """Returns curated and live news articles specifically for the requested stock."""
    sym = symbol.upper()
    if sym not in SENSEX_DICT:
        raise HTTPException(status_code=404, detail=f"Ticker '{symbol}' not found in BSE Sensex 30")

    response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=300"
    articles = market_worker.get_news_for_symbol(sym)
    return {
        "symbol": sym,
        "count": len(articles),
        "articles": articles,
    }


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


@router.get("/pulse")
async def get_market_pulse(
    response: Response,
    symbols: Optional[str] = Query(
        None,
        description="Comma-separated priority symbols for personalized news & forecasts",
    ),
):
    """
    Fast aggregated dashboard payload combining live Sensex 30 quotes,
    in-memory ML forecast targets, real intraday candle sparklines,
    sector advance/decline stats, and personalized stock news feed.
    """
    response.headers["Cache-Control"] = "public, max-age=20, stale-while-revalidate=40"

    requested_symbols: List[str] = []
    if symbols:
        seen = set()
        for raw in symbols.split(","):
            sym = raw.strip().upper()
            if sym in SENSEX_DICT and sym not in seen:
                seen.add(sym)
                requested_symbols.append(sym)

    market_info = settings.get_market_status()
    predictions = []
    sector_buckets: dict = {}

    total_change_pct = 0.0
    advancers = 0
    decliners = 0
    sparkline_acc: List[float] = []
    sparkline_counts: List[int] = []

    for ticker in SENSEX_30:
        sym = ticker.symbol
        candles = candle_store.get_chart(
            symbol=sym, interval="5m", limit_actual=14, include_forecast=True
        )
        actuals = [c for c in candles if not c.is_forecast]
        forecasts = [c for c in candles if c.is_forecast]

        last_price = candle_store.get_last_price(sym) or (
            actuals[-1].close if actuals else 1500.0
        )
        first_actual = actuals[0] if actuals else None
        open_p = first_actual.open if first_actual else last_price
        high_p = max((c.high for c in actuals), default=last_price)
        low_p = min((c.low for c in actuals), default=last_price)
        volume = sum(c.volume for c in actuals[-3:]) if actuals else 0

        change = round(last_price - open_p, 2)
        change_pct = round((change / open_p) * 100, 2) if open_p > 0 else 0.0

        forecast_target = round(forecasts[-1].close, 2) if forecasts else round(last_price, 2)
        forecast_delta_pct = (
            round(((forecast_target - last_price) / last_price) * 100, 2)
            if last_price > 0
            else 0.0
        )
        confs = [c.confidence for c in forecasts if c.confidence is not None]
        confidence_pct = round((sum(confs) / len(confs)) * 100) if confs else 80

        if forecast_delta_pct >= 0.15:
            stance = "BULLISH"
        elif forecast_delta_pct <= -0.15:
            stance = "BEARISH"
        else:
            stance = "NEUTRAL"

        spark = [round(c.close, 2) for c in actuals[-10:]]
        if not spark:
            spark = [open_p, last_price]

        # Track normalized curve for synthetic Sensex index sparkline
        base = spark[0] if spark and spark[0] > 0 else 1.0
        for idx, pt in enumerate(spark):
            rel = pt / base
            if idx >= len(sparkline_acc):
                sparkline_acc.append(rel)
                sparkline_counts.append(1)
            else:
                sparkline_acc[idx] += rel
                sparkline_counts[idx] += 1

        total_change_pct += change_pct
        if change_pct > 0:
            advancers += 1
        elif change_pct < 0:
            decliners += 1

        predictions.append({
            "symbol": sym,
            "name": ticker.name,
            "sector": ticker.sector,
            "bse_code": ticker.bse_code,
            "price": round(last_price, 2),
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "change": change,
            "change_pct": change_pct,
            "volume": volume,
            "forecast_target": forecast_target,
            "forecast_delta_pct": forecast_delta_pct,
            "confidence_pct": confidence_pct,
            "stance": stance,
            "support": round(low_p * 0.992, 2),
            "resistance": round(high_p * 1.008, 2),
            "sparkline": spark,
        })

        sec = sector_buckets.setdefault(
            ticker.sector,
            {"sector": ticker.sector, "items": []},
        )
        sec["items"].append((sym, change_pct, volume))

    # Build sector summaries
    sectors = []
    for sec_name, bucket in sector_buckets.items():
        items = bucket["items"]
        count = len(items)
        gainers_c = sum(1 for _, pct, _ in items if pct > 0)
        losers_c = sum(1 for _, pct, _ in items if pct < 0)
        avg_pct = round(sum(pct for _, pct, _ in items) / count, 2) if count else 0.0
        total_vol = sum(vol for _, _, vol in items)
        top_sym = max(items, key=lambda it: abs(it[1]))[0] if items else ""
        sectors.append({
            "sector": sec_name,
            "count": count,
            "gainers": gainers_c,
            "losers": losers_c,
            "neutral": count - gainers_c - losers_c,
            "avg_change_pct": avg_pct,
            "total_volume": total_vol,
            "top_symbol": top_sym,
        })
    sectors.sort(key=lambda s: abs(s["avg_change_pct"]), reverse=True)

    # Compute live BSE Sensex index summary from constituent moves
    avg_sensex_pct = round(total_change_pct / len(SENSEX_30), 2) if SENSEX_30 else 0.0
    sensex_base = 84000.0
    sensex_price = round(sensex_base * (1.0 + avg_sensex_pct / 100.0), 2)
    sensex_change = round(sensex_price - sensex_base, 2)
    index_spark = [
        round(sensex_base * (acc / cnt), 2)
        for acc, cnt in zip(sparkline_acc, sparkline_counts)
    ] or [sensex_base, sensex_price]

    # Build prioritized personalized news feed (requested symbols first, then top movers)
    pred_lookup = {p["symbol"]: p for p in predictions}
    top_movers = sorted(
        [p["symbol"] for p in predictions],
        key=lambda s: abs(pred_lookup[s]["change_pct"]),
        reverse=True,
    )
    news_seed = list(dict.fromkeys(requested_symbols + top_movers[:6]))[:10]

    news_feed = []
    seen_titles = set()
    for sym in news_seed:
        sym_meta = pred_lookup.get(sym, {})
        for article in market_worker.get_news_for_symbol(sym):
            title = (article.get("title") or "").strip()
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)
            enriched = dict(article)
            enriched["symbol"] = sym
            enriched["sector"] = sym_meta.get("sector", "Sensex")
            enriched["price"] = sym_meta.get("price")
            enriched["change_pct"] = sym_meta.get("change_pct")
            enriched["is_personalized"] = sym in requested_symbols
            news_feed.append(enriched)
            if len(news_feed) >= 18:
                break
        if len(news_feed) >= 18:
            break

    return {
        "market": market_info,
        "sensex_index": {
            "symbol": "SENSEX",
            "price": sensex_price,
            "change": sensex_change,
            "change_pct": avg_sensex_pct,
            "advancers": advancers,
            "decliners": decliners,
            "sparkline": index_spark,
        },
        "predictions": predictions,
        "sectors": sectors,
        "news": news_feed,
    }
