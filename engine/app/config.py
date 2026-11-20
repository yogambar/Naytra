"""
Configuration and settings for the Naytra Predictive Backend Engine.
"""
from typing import Dict, List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class SensexTicker:
    def __init__(self, symbol: str, name: str, sector: str, bse_code: str, yf_symbol: str, tw_symbol: str):
        self.symbol = symbol
        self.name = name
        self.sector = sector
        self.bse_code = bse_code
        self.yf_symbol = yf_symbol
        self.tw_symbol = tw_symbol

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "name": self.name,
            "sector": self.sector,
            "bse_code": self.bse_code,
            "yf_symbol": self.yf_symbol,
            "tw_symbol": self.tw_symbol,
        }


# BSE Sensex 30 complete constituent registry
SENSEX_30: List[SensexTicker] = [
    SensexTicker("RELIANCE", "Reliance Industries Ltd.", "Energy", "500325", "RELIANCE.BO", "RELIANCE:BSE"),
    SensexTicker("TCS", "Tata Consultancy Services Ltd.", "Technology", "532540", "TCS.BO", "TCS:BSE"),
    SensexTicker("HDFCBANK", "HDFC Bank Ltd.", "Banking", "500180", "HDFCBANK.BO", "HDFCBANK:BSE"),
    SensexTicker("INFY", "Infosys Ltd.", "Technology", "500209", "INFY.BO", "INFY:BSE"),
    SensexTicker("ICICIBANK", "ICICI Bank Ltd.", "Banking", "532174", "ICICIBANK.BO", "ICICIBANK:BSE"),
    SensexTicker("BHARTIARTL", "Bharti Airtel Ltd.", "Telecom", "532454", "BHARTIARTL.BO", "BHARTIARTL:BSE"),
    SensexTicker("SBIN", "State Bank of India", "Banking", "500112", "SBIN.BO", "SBIN:BSE"),
    SensexTicker("ITC", "ITC Ltd.", "Consumer Goods", "500875", "ITC.BO", "ITC:BSE"),
    SensexTicker("LT", "Larsen & Toubro Ltd.", "Infrastructure", "500510", "LT.BO", "LT:BSE"),
    SensexTicker("HINDUNILVR", "Hindustan Unilever Ltd.", "Consumer Goods", "500696", "HINDUNILVR.BO", "HINDUNILVR:BSE"),
    SensexTicker("KOTAKBANK", "Kotak Mahindra Bank Ltd.", "Banking", "500247", "KOTAKBANK.BO", "KOTAKBANK:BSE"),
    SensexTicker("AXISBANK", "Axis Bank Ltd.", "Banking", "532215", "AXISBANK.BO", "AXISBANK:BSE"),
    SensexTicker("BAJFINANCE", "Bajaj Finance Ltd.", "Financials", "500034", "BAJFINANCE.BO", "BAJFINANCE:BSE"),
    SensexTicker("MARUTI", "Maruti Suzuki India Ltd.", "Automobile", "532500", "MARUTI.BO", "MARUTI:BSE"),
    SensexTicker("ASIANPAINT", "Asian Paints Ltd.", "Consumer Goods", "500120", "ASIANPAINT.BO", "ASIANPAINT:BSE"),
    SensexTicker("TATAMOTORS", "Tata Motors Ltd.", "Automobile", "500570", "TATAMOTORS.BO", "TATAMOTORS:BSE"),
    SensexTicker("SUNPHARMA", "Sun Pharmaceutical Industries Ltd.", "Healthcare", "524715", "SUNPHARMA.BO", "SUNPHARMA:BSE"),
    SensexTicker("TITAN", "Titan Company Ltd.", "Consumer Goods", "500114", "TITAN.BO", "TITAN:BSE"),
    SensexTicker("ULTRACEMCO", "UltraTech Cement Ltd.", "Materials", "532538", "ULTRACEMCO.BO", "ULTRACEMCO:BSE"),
    SensexTicker("NESTLEIND", "Nestle India Ltd.", "Consumer Goods", "500790", "NESTLEIND.BO", "NESTLEIND:BSE"),
    SensexTicker("WIPRO", "Wipro Ltd.", "Technology", "507685", "WIPRO.BO", "WIPRO:BSE"),
    SensexTicker("NTPC", "NTPC Ltd.", "Utilities", "532555", "NTPC.BO", "NTPC:BSE"),
    SensexTicker("POWERGRID", "Power Grid Corporation of India Ltd.", "Utilities", "532898", "POWERGRID.BO", "POWERGRID:BSE"),
    SensexTicker("ONGC", "Oil & Natural Gas Corporation Ltd.", "Energy", "500312", "ONGC.BO", "ONGC:BSE"),
    SensexTicker("JSWSTEEL", "JSW Steel Ltd.", "Metals", "500228", "JSWSTEEL.BO", "JSWSTEEL:BSE"),
    SensexTicker("TATASTEEL", "Tata Steel Ltd.", "Metals", "500470", "TATASTEEL.BO", "TATASTEEL:BSE"),
    SensexTicker("ADANIENT", "Adani Enterprises Ltd.", "Conglomerate", "512599", "ADANIENT.BO", "ADANIENT:BSE"),
    SensexTicker("ADANIPORTS", "Adani Ports & SEZ Ltd.", "Infrastructure", "532921", "ADANIPORTS.BO", "ADANIPORTS:BSE"),
    SensexTicker("BAJAJ-AUTO", "Bajaj Auto Ltd.", "Automobile", "532977", "BAJAJ-AUTO.BO", "BAJAJ-AUTO:BSE"),
    SensexTicker("HCLTECH", "HCL Technologies Ltd.", "Technology", "532281", "HCLTECH.BO", "HCLTECH:BSE"),
]

SENSEX_DICT: Dict[str, SensexTicker] = {t.symbol: t for t in SENSEX_30}


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8001
    HOST: str = "0.0.0.0"

    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379/1"
    REDIS_TTL_QUOTES_SEC: int = 30
    REDIS_TTL_CHARTS_SEC: int = 60
    REDIS_TTL_FORECAST_SEC: int = 180
    REDIS_TTL_INSIGHTS_SEC: int = 300

    # API Keys (loaded strictly from environment or git-ignored .env)
    TWELVE_DATA_API_KEY: str = Field(default="")
    MARKETAUX_API_KEY: str = Field(default="")
    GEMINI_API_KEY: str = Field(default="")
    HUGGING_FACE_TOKEN: str = Field(default="")

    FIREBASE_PROJECT_ID: str = "naytra-53238"

    # Ingestion Intervals
    MARKET_INGESTION_INTERVAL_SEC: int = 60
    NEWS_INGESTION_INTERVAL_SEC: int = 300
    FORECAST_INTERVAL_SEC: int = 120

    # Candle Styling
    CANDLE_COLOR_BULLISH: str = "#00C805"
    CANDLE_COLOR_BEARISH: str = "#FF3B30"
    CANDLE_COLOR_FORECAST: str = "#8A2BE2"

    # Market Hours (IST: Monday-Friday, 09:15 AM to 03:30 PM)
    MARKET_OPEN_HOUR: int = 9
    MARKET_OPEN_MINUTE: int = 15
    MARKET_CLOSE_HOUR: int = 15
    MARKET_CLOSE_MINUTE: int = 30

    @staticmethod
    def get_market_status() -> dict:
        """
        Determines whether the Indian stock market (BSE/NSE) is currently open.
        Trading Hours: Monday to Friday, 09:15 AM to 03:30 PM IST (UTC+5:30).
        """
        from datetime import datetime, timezone, timedelta
        ist = timezone(timedelta(hours=5, minutes=30))
        now = datetime.now(tz=ist)

        is_weekday = now.weekday() < 5  # Mon=0, Fri=4, Sat=5, Sun=6
        current_time_min = now.hour * 60 + now.minute
        open_time_min = 9 * 60 + 15
        close_time_min = 15 * 60 + 30

        is_open = is_weekday and (open_time_min <= current_time_min < close_time_min)

        if is_open:
            mins_left = close_time_min - current_time_min
            status_text = f"MARKET OPEN (Closes in {mins_left // 60}h {mins_left % 60}m)"
        else:
            if not is_weekday:
                status_text = "MARKET CLOSED (Weekend • Opens Mon 09:15 IST)"
            elif current_time_min < open_time_min:
                mins_to_open = open_time_min - current_time_min
                status_text = f"MARKET CLOSED (Pre-market • Opens in {mins_to_open // 60}h {mins_to_open % 60}m)"
            else:
                status_text = "MARKET CLOSED (Session Ended • Opens Mon-Fri 09:15 IST)"

        return {
            "is_open": is_open,
            "status_text": status_text,
            "current_time_ist": now.strftime("%Y-%m-%d %H:%M:%S IST"),
            "weekday": now.strftime("%A"),
        }

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


settings = Settings()
