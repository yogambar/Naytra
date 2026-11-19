"""Rate limiting service using Redis with in-memory fallback."""
from __future__ import annotations

import time
import logging
from collections import defaultdict
from fastapi import HTTPException, status
import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)

# In-memory fallback: key -> list of timestamps
_in_memory_buckets: dict[str, list[float]] = defaultdict(list)
_redis_client: aioredis.Redis | None = None


async def get_redis_client() -> aioredis.Redis | None:
    """Return an async Redis client, or None if connection fails."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    settings = get_settings()
    try:
        client = aioredis.from_url(settings.REDIS_URL, socket_timeout=1.0)
        await client.ping()
        _redis_client = client
        return _redis_client
    except Exception as exc:  # pylint: disable=broad-except
        logger.debug("Redis rate limiter unavailable, using in-memory fallback: %s", exc)
        return None


async def check_rate_limit(
    identifier: str,
    action: str = "auth",
    max_requests: int = 10,
    window_seconds: int = 60,
) -> None:
    """Check if an identifier has exceeded the request quota in the given window.

    Raises HTTPException 429 if the quota is exceeded.
    """
    key = f"ratelimit:{action}:{identifier}"
    now = time.time()

    client = await get_redis_client()
    if client is not None:
        try:
            # Sliding window using Redis sorted sets
            pipe = client.pipeline()
            pipe.zremrangebyscore(key, 0, now - window_seconds)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window_seconds)
            results = await pipe.execute()
            count = results[2]

            if count > max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please slow down and try again later.",
                )
            return
        except HTTPException:
            raise
        except Exception as exc:
            logger.debug("Redis rate limiting error, falling back to memory: %s", exc)

    # In-memory fallback
    timestamps = _in_memory_buckets[key]
    cutoff = now - window_seconds
    _in_memory_buckets[key] = [t for t in timestamps if t > cutoff]
    if len(_in_memory_buckets[key]) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please slow down and try again later.",
        )
    _in_memory_buckets[key].append(now)
