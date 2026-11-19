"""Check for breached passwords using Have I Been Pwned range API.

Uses k-Anonymity: only the first 5 characters of the SHA-1 hash are sent to the API.
The remaining 35 characters are compared locally. The plaintext password never leaves the machine.
"""
from __future__ import annotations

import hashlib
import logging
import httpx

logger = logging.getLogger(__name__)

HIBP_API_URL = "https://api.pwnedpasswords.com/range/{prefix}"


async def check_password_breached(password: str) -> tuple[bool, int]:
    """Check if a password has been compromised in known data breaches.

    Returns:
        (is_breached, breach_count)
    """
    if not password:
        return False, 0

    sha1_hash = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]

    url = HIBP_API_URL.format(prefix=prefix)

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url, headers={"User-Agent": "Naytra-Security-Check"})
            if response.status_code != 200:
                logger.warning("HIBP API returned status %s; failing open", response.status_code)
                return False, 0

            # Response is lines of "SUFFIX:COUNT"
            for line in response.text.splitlines():
                parts = line.strip().split(":")
                if len(parts) == 2 and parts[0] == suffix:
                    count = int(parts[1])
                    return True, count

            return False, 0
    except Exception as exc:  # pylint: disable=broad-except
        logger.warning("Failed to query HIBP API (%s); failing open for user registration", exc)
        return False, 0
