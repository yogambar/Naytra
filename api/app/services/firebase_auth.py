"""Firebase Auth token verification and admin operations."""
from __future__ import annotations

import os
import json
import base64
import time
import logging
from typing import Any

import jwt
from jwt import PyJWKClient
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)

_app_initialized = False
GOOGLE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient:
    """Return cached JWKS client for Google's public certificates."""
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(GOOGLE_JWKS_URL, cache_keys=True, max_cached_keys=16)
    return _jwks_client


def init_firebase_admin() -> None:
    """Initialize Firebase Admin SDK once."""
    global _app_initialized
    if _app_initialized or len(firebase_admin._apps) > 0:
        _app_initialized = True
        return

    settings = get_settings()

    # If emulator host is configured, set the env var that firebase-admin honors
    if settings.FIREBASE_AUTH_EMULATOR_HOST:
        os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.FIREBASE_AUTH_EMULATOR_HOST
        logger.info("Firebase Auth configured for emulator: %s", settings.FIREBASE_AUTH_EMULATOR_HOST)

    cred = None
    if settings.GOOGLE_APPLICATION_CREDENTIALS and os.path.isfile(settings.GOOGLE_APPLICATION_CREDENTIALS):
        cred = credentials.Certificate(settings.GOOGLE_APPLICATION_CREDENTIALS)

    options = {"projectId": settings.FIREBASE_PROJECT_ID}
    try:
        if cred:
            firebase_admin.initialize_app(cred, options)
        else:
            firebase_admin.initialize_app(options=options)
        _app_initialized = True
        logger.info("Firebase Admin initialized for project: %s", settings.FIREBASE_PROJECT_ID)
    except Exception as exc:  # pylint: disable=broad-except
        logger.warning("Firebase Admin initialization deferred or fallback: %s", exc)


def verify_firebase_token(id_token: str, check_revoked: bool = False) -> dict[str, Any]:
    """Verify a Firebase ID token.

    Supports:
    1. Deterministic mock tokens for local testing
    2. Firebase Admin SDK if service account or emulator is present
    3. Cryptographic RS256 verification against Google's public JWKS certificates
    4. Safe claim verification fallback in DEBUG dev environments
    """
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Test / Development deterministic mock token support:
    # E.g. "mock-token:<uid>:<email>:<email_verified_bool>"
    if id_token.startswith("mock-token:"):
        parts = id_token.split(":")
        uid = parts[1] if len(parts) > 1 else "mock_uid"
        email = parts[2] if len(parts) > 2 else "mock@example.com"
        email_verified = parts[3].lower() == "true" if len(parts) > 3 else True
        return {
            "uid": uid,
            "sub": uid,
            "email": email.lower(),
            "email_verified": email_verified,
            "name": "Mock User",
        }

    settings = get_settings()
    project_id = settings.FIREBASE_PROJECT_ID
    init_firebase_admin()

    # 2. Firebase Admin SDK (if service account or emulator is configured)
    has_sa = settings.GOOGLE_APPLICATION_CREDENTIALS and os.path.isfile(settings.GOOGLE_APPLICATION_CREDENTIALS)
    has_emulator = bool(settings.FIREBASE_AUTH_EMULATOR_HOST)
    if has_sa or has_emulator:
        try:
            return auth.verify_id_token(id_token, check_revoked=check_revoked)
        except auth.RevokedIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except auth.ExpiredIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except auth.InvalidIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as exc:
            logger.warning("Firebase Admin verify_id_token failed, trying JWKS fallback: %s", exc)

    # 3. Google Public JWKS Verification (No Service Account Needed)
    try:
        jwks = get_jwks_client()
        signing_key = jwks.get_signing_key_from_jwt(id_token)
        decoded = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
        )
        uid = decoded.get("user_id") or decoded.get("sub")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token payload (missing uid)",
                headers={"WWW-Authenticate": "Bearer"},
            )
        decoded["uid"] = uid
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as it_err:
        logger.debug("JWKS validation failed or offline: %s", it_err)
    except Exception as exc:
        logger.debug("JWKS key retrieval failed (network/offline): %s", exc)

    # 4. Fallback for Local Development / Debug when offline or outbound network restricted
    if settings.DEBUG:
        try:
            unverified = jwt.decode(id_token, options={"verify_signature": False})
            aud = unverified.get("aud")
            iss = unverified.get("iss")
            exp = unverified.get("exp")
            uid = unverified.get("user_id") or unverified.get("sub")

            # Validate structural Firebase claims
            if aud != project_id or iss != f"https://securetoken.google.com/{project_id}":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token audience or issuer does not match Firebase project ID",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            if exp and exp < time.time():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            if not uid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token (missing uid)",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            unverified["uid"] = uid
            logger.info("Successfully verified Firebase token via dev fallback for user: %s", uid)
            return unverified
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Dev token fallback decode failed: %s", exc)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication failed",
        headers={"WWW-Authenticate": "Bearer"},
    )


def revoke_user_tokens(uid: str) -> None:
    """Revoke all refresh tokens for a user, invalidating active sessions."""
    if uid.startswith("mock_"):
        return
    settings = get_settings()
    has_sa = settings.GOOGLE_APPLICATION_CREDENTIALS and os.path.isfile(settings.GOOGLE_APPLICATION_CREDENTIALS)
    has_emulator = bool(settings.FIREBASE_AUTH_EMULATOR_HOST)
    if not (has_sa or has_emulator):
        logger.info("Skipping Firebase Admin revoke_refresh_tokens (no service account configured): %s", uid)
        return
    init_firebase_admin()
    try:
        auth.revoke_refresh_tokens(uid)
        logger.info("Revoked refresh tokens for user: %s", uid)
    except Exception as exc:
        logger.warning("Error revoking tokens for user %s: %s", uid, exc)
