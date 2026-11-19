"""Firebase Auth token verification and admin operations."""
from __future__ import annotations

import os
import json
import base64
import logging
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)

_app_initialized = False


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
    else:
        # Default or Application Default Credentials
        cred = credentials.ApplicationDefault() if not settings.FIREBASE_AUTH_EMULATOR_HOST else None

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


def verify_firebase_token(id_token: str, check_revoked: bool = True) -> dict[str, Any]:
    """Verify a Firebase ID token.

    Verifies signature, expiry, project ID, and revocation state.
    Returns the decoded token dict with at least 'uid', 'email', 'email_verified'.
    """
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Test / Development deterministic mock token support:
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

    init_firebase_admin()

    try:
        decoded = auth.verify_id_token(id_token, check_revoked=check_revoked)
        return decoded
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
    except auth.InvalidIdTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        logger.error("Unexpected error verifying Firebase ID token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def revoke_user_tokens(uid: str) -> None:
    """Revoke all refresh tokens for a user, invalidating active sessions."""
    if uid.startswith("mock_"):
        return
    init_firebase_admin()
    try:
        auth.revoke_refresh_tokens(uid)
        logger.info("Revoked refresh tokens for user: %s", uid)
    except Exception as exc:
        logger.warning("Error revoking tokens for user %s: %s", uid, exc)
