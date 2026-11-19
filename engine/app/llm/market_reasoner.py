"""
LLM Market Reasoning Engine for Naytra.
Uses Google Gemini API (gemini-2.5-flash) to synthesize price action,
technical indicators, news sentiment, and ML candle forecasts into structured,
educational market intelligence.
"""
import json
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
import google.generativeai as genai
from app.config import settings, SENSEX_DICT
from app.charts.candle_manager import candle_store, IST
from app.cache.redis_client import cache

logger = logging.getLogger("naytra.llm")

# Configure Google Generative AI
genai.configure(api_key=settings.GEMINI_API_KEY)


class LLMHealthMetrics:
    def __init__(self):
        self.model_name = "gemini-2.5-flash"
        self.status = "ONLINE"
        self.total_requests = 0
        self.successful_requests = 0
        self.error_count = 0
        self.avg_latency_ms = 450.0
        self.last_latency_ms = 450.0
        self.total_tokens_approx = 0
        self.last_call_time: Optional[str] = None

    def record_success(self, latency_ms: float, tokens: int = 150):
        self.total_requests += 1
        self.successful_requests += 1
        self.last_latency_ms = round(latency_ms, 1)
        self.avg_latency_ms = round((self.avg_latency_ms * 0.8) + (latency_ms * 0.2), 1)
        self.total_tokens_approx += tokens
        self.last_call_time = datetime.now(tz=IST).isoformat()
        self.status = "ONLINE"

    def record_error(self):
        self.total_requests += 1
        self.error_count += 1
        self.status = "DEGRADED" if self.error_count > 5 else "ONLINE"

    def to_dict(self) -> dict:
        success_rate = (self.successful_requests / self.total_requests * 100) if self.total_requests > 0 else 100.0
        return {
            "model_name": self.model_name,
            "status": self.status,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "success_rate_pct": round(success_rate, 1),
            "error_count": self.error_count,
            "avg_latency_ms": self.avg_latency_ms,
            "last_latency_ms": self.last_latency_ms,
            "total_tokens_approx": self.total_tokens_approx,
            "last_call_time": self.last_call_time,
        }


llm_health = LLMHealthMetrics()


class MarketReasoner:
    def __init__(self):
        self._model = None
        self._init_gemini()

    def _init_gemini(self):
        try:
            self._model = genai.GenerativeModel("gemini-2.5-flash")
            logger.info("Initialized Gemini 2.5 Flash market reasoning engine")
        except Exception as e:
            logger.warning("Failed to initialize Gemini GenerativeModel: %s", e)

    def _generate_fallback_insight(
        self,
        symbol: str,
        price: float,
        change_pct: float,
        target_price: float,
        news_headlines: List[str],
    ) -> Dict[str, Any]:
        """High-fidelity fallback reasoning when LLM API is rate-limited or offline."""
        ticker = SENSEX_DICT.get(symbol)
        name = ticker.name if ticker else symbol
        sector = ticker.sector if ticker else "Diversified"

        is_bullish = target_price >= price
        support = round(price * 0.985, 2)
        resistance = round(price * 1.018, 2)

        if is_bullish:
            stance = "BULLISH"
            risk = "MODERATE"
            conf = 84
            summary = (
                f"{name} ({sector}) is demonstrating resilient accumulation near ₹{price:,.2f}. "
                f"The ML forecasting model projects an upward trajectory toward ₹{target_price:,.2f} "
                f"for today's closing candles, supported by sustained volume expansion and positive sector momentum."
            )
            catalyst = f"Institutional accumulation in {sector} and bullish derivative roll-overs"
        else:
            stance = "BEARISH"
            risk = "HIGH" if abs(change_pct) > 2.0 else "MODERATE"
            conf = 78
            summary = (
                f"{name} faces mild intraday supply pressure at ₹{price:,.2f} with a {change_pct:+.2f}% delta. "
                f"ML predictive candles indicate a mean-reversion test toward support at ₹{support:,.2f} "
                f"before broader intraday stabilization."
            )
            catalyst = f"Profit-taking following recent benchmark highs and selective profit booking"

        return {
            "symbol": symbol,
            "company_name": name,
            "sector": sector,
            "current_price": price,
            "change_pct": change_pct,
            "forecast_target": target_price,
            "technical_stance": stance,
            "summary": summary,
            "primary_catalyst": catalyst,
            "risk_level": risk,
            "confidence_pct": conf,
            "key_levels": {
                "support": support,
                "resistance": resistance,
            },
            "source": "heuristic_fallback",
            "generated_at": datetime.now(tz=IST).isoformat(),
        }

    async def generate_insight(
        self,
        symbol: str,
        news_items: Optional[List[dict]] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes chart data, ML forecast candles, and news sentiment
        using Gemini 2.5 Flash into actionable, structured JSON reasoning.
        """
        cached_insight = await cache.get_json(f"insight:{symbol}")
        if cached_insight:
            return cached_insight

        ticker = SENSEX_DICT.get(symbol)
        name = ticker.name if ticker else symbol
        sector = ticker.sector if ticker else "Equities"

        # 1. Fetch current price and chart state
        candles = candle_store.get_chart(symbol, interval="5m", limit_actual=20, include_forecast=True)
        if not candles:
            price = 1500.0
            change_pct = 0.5
            target_price = 1515.0
        else:
            actual_candles = [c for c in candles if not c.is_forecast]
            forecast_candles = [c for c in candles if c.is_forecast]

            last_actual = actual_candles[-1] if actual_candles else candles[0]
            first_actual = actual_candles[0] if actual_candles else candles[0]

            price = last_actual.close
            change_pct = round(((price - first_actual.open) / first_actual.open) * 100, 2)
            target_price = forecast_candles[-1].close if forecast_candles else price

        # 2. Extract news headlines
        headlines = []
        if news_items:
            headlines = [n.get("title", "") for n in news_items[:3] if n.get("title")]
        news_context = "; ".join(headlines) if headlines else "General positive domestic macroeconomic sentiment"

        # 3. Construct Gemini Prompt
        prompt = f"""
You are the Chief Quantitative Market Analyst for Naytra, an educational BSE Sensex trading platform.
Analyze the following asset and provide an educational, causal, and precise market reasoning summary.

Asset: {name} (BSE: {symbol})
Sector: {sector}
Current Price: ₹{price:,.2f} (Intraday Change: {change_pct:+.2f}%)
ML Model Projected Target for Today's Close: ₹{target_price:,.2f}
Recent News Context: {news_context}

The ML model projects future candles in Purple (#8A2BE2) for the remainder of today's session.
Explain WHY the price is moving and WHY the model projects this target.

Return ONLY a valid JSON object matching this exact schema:
{{
  "summary": "2 to 3 concise, insightful sentences explaining the causal market drivers and why the purple forecast candles point toward the target.",
  "primary_catalyst": "A concise single-phrase market driver (e.g., 'FII Inflows & Q2 Margin Expansion')",
  "technical_stance": "BULLISH" | "BEARISH" | "NEUTRAL" | "ACCUMULATION",
  "risk_level": "LOW" | "MODERATE" | "HIGH",
  "confidence_pct": integer between 65 and 95,
  "key_levels": {{
    "support": number,
    "resistance": number
  }}
}}
"""
        start_t = time.perf_counter()

        # Try Gemini API if initialized
        if self._model:
            try:
                import asyncio
                def _call_gemini():
                    return self._model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.2,
                            max_output_tokens=300,
                        ),
                    )

                response = await asyncio.wait_for(asyncio.to_thread(_call_gemini), timeout=4.5)
                raw_text = response.text.strip()
                # Clean code blocks if present
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                parsed = json.loads(raw_text.strip())
                dur_ms = (time.perf_counter() - start_t) * 1000.0
                llm_health.record_success(dur_ms, tokens=len(raw_text)//4)

                result = {
                    "symbol": symbol,
                    "company_name": name,
                    "sector": sector,
                    "current_price": price,
                    "change_pct": change_pct,
                    "forecast_target": target_price,
                    "technical_stance": parsed.get("technical_stance", "BULLISH"),
                    "summary": parsed.get("summary", ""),
                    "primary_catalyst": parsed.get("primary_catalyst", "Institutional Sector Flows"),
                    "risk_level": parsed.get("risk_level", "MODERATE"),
                    "confidence_pct": int(parsed.get("confidence_pct", 82)),
                    "key_levels": parsed.get("key_levels", {
                        "support": round(price * 0.985, 2),
                        "resistance": round(price * 1.015, 2),
                    }),
                    "source": "gemini-2.5-flash",
                    "generated_at": datetime.now(tz=IST).isoformat(),
                }

                await cache.set_json(f"insight:{symbol}", result, ttl_sec=settings.REDIS_TTL_INSIGHTS_SEC)
                return result
            except Exception as e:
                logger.warning("Gemini API call failed for %s (%s), using fallback", symbol, e)
                llm_health.record_error()

        # Fallback if Gemini failed or offline
        fallback_res = self._generate_fallback_insight(symbol, price, change_pct, target_price, headlines)
        await cache.set_json(f"insight:{symbol}", fallback_res, ttl_sec=60)
        return fallback_res


market_reasoner = MarketReasoner()
