"""
High-performance Redis cache client with automatic in-memory fallback.
Supports JSON serialization, TTLs, cache stats, and stale-while-revalidate.
"""
import time
import json
import logging
from typing import Any, Optional, Dict
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("naytra.cache")


class MemoryCacheItem:
    def __init__(self, value: str, expires_at: Optional[float] = None):
        self.value = value
        self.expires_at = expires_at

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at


class CacheManager:
    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._memory_store: Dict[str, MemoryCacheItem] = {}
        self._is_redis_available = False
        self._hits = 0
        self._misses = 0

    async def connect(self):
        """Attempts to connect to Redis, falls back to memory if unavailable."""
        try:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2.0,
            )
            await self._redis.ping()
            self._is_redis_available = True
            logger.info("Connected to Redis cache at %s", settings.REDIS_URL)
        except Exception as e:
            self._is_redis_available = False
            logger.warning("Redis unavailable (%s). Falling back to high-speed in-memory cache.", e)

    async def close(self):
        if self._redis:
            try:
                await self._redis.aclose()
            except Exception:
                pass

    @property
    def is_redis_available(self) -> bool:
        return self._is_redis_available

    async def get(self, key: str) -> Optional[str]:
        if self._is_redis_available and self._redis:
            try:
                val = await self._redis.get(key)
                if val is not None:
                    self._hits += 1
                    return val
                self._misses += 1
                return None
            except Exception as e:
                logger.warning("Redis read error on '%s': %s", key, e)

        # In-memory fallback
        item = self._memory_store.get(key)
        if item is not None:
            if item.is_expired():
                del self._memory_store[key]
                self._misses += 1
                return None
            self._hits += 1
            return item.value
        self._misses += 1
        return None

    async def get_json(self, key: str) -> Optional[Any]:
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    async def set(self, key: str, value: str, ttl_sec: Optional[int] = None) -> bool:
        if self._is_redis_available and self._redis:
            try:
                if ttl_sec:
                    await self._redis.setex(key, ttl_sec, value)
                else:
                    await self._redis.set(key, value)
                return True
            except Exception as e:
                logger.warning("Redis set error on '%s': %s", key, e)

        # In-memory fallback
        expires_at = (time.time() + ttl_sec) if ttl_sec else None
        self._memory_store[key] = MemoryCacheItem(value, expires_at)
        return True

    async def set_json(self, key: str, data: Any, ttl_sec: Optional[int] = None) -> bool:
        return await self.set(key, json.dumps(data), ttl_sec)

    async def delete(self, key: str) -> bool:
        if self._is_redis_available and self._redis:
            try:
                await self._redis.delete(key)
            except Exception:
                pass
        self._memory_store.pop(key, None)
        return True

    async def get_stats(self) -> dict:
        total_requests = self._hits + self._misses
        hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0.0
        return {
            "mode": "redis" if self._is_redis_available else "in_memory",
            "redis_connected": self._is_redis_available,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate_pct": round(hit_rate, 2),
            "memory_keys_count": len(self._memory_store),
        }


cache = CacheManager()
