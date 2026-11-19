"""Authentication and profile completion routes."""
from __future__ import annotations

import logging
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AppUser
from app.schemas import (
    CheckPasswordData,
    CheckPasswordRequest,
    CompleteProfileRequest,
    SuccessResponse,
    UserProfileData,
)
from app.services.firebase_auth import revoke_user_tokens, verify_firebase_token
from app.services.pwned_passwords import check_password_breached
from app.services.rate_limiter import check_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_token_from_header(authorization: Annotated[str | None, Header()] = None) -> str:
    """Extract Bearer token from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return parts[1]


async def get_current_user(
    token: Annotated[str, Depends(get_token_from_header)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppUser:
    """Verify Firebase ID token and return or synchronize local AppUser record."""
    decoded = verify_firebase_token(token)
    uid = decoded["uid"]
    email = decoded.get("email", "").lower()
    email_verified = decoded.get("email_verified", False)

    # Lookup user in DB
    result = await db.execute(select(AppUser).where(AppUser.id == uid))
    user = result.scalar_one_or_none()

    if user is None:
        # Check if email is already taken under a different UID
        if email:
            existing_email_result = await db.execute(select(AppUser).where(AppUser.email == email))
            existing_email_user = existing_email_result.scalar_one_or_none()
            if existing_email_user is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email address already exists.",
                )

        # Create new local user record
        user = AppUser(
            id=uid,
            email=email or f"{uid}@placeholder.naytra.local",
            name=decoded.get("name"),
            profile_complete=False,
            email_verified=email_verified,
            terms_accepted=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Created local AppUser record for uid: %s", uid)
    else:
        # Update email_verified status if it changed in Firebase
        if email_verified and not user.email_verified:
            user.email_verified = True
            await db.commit()
            await db.refresh(user)

    return user


def user_to_profile_data(user: AppUser) -> UserProfileData:
    """Format AppUser into response schema."""
    return UserProfileData(
        id=user.id,
        email=user.email,
        name=user.name,
        dob=user.dob.isoformat() if user.dob else None,
        phone=user.phone,
        city=user.city,
        profile_complete=user.profile_complete,
        email_verified=user.email_verified,
        terms_accepted=user.terms_accepted,
        bonus_claimed=getattr(user, "bonus_claimed", False),
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.get("/me", response_model=SuccessResponse)
async def get_me(user: Annotated[AppUser, Depends(get_current_user)]) -> SuccessResponse:
    """Return the profile and verification state of the currently signed-in user."""
    return SuccessResponse(data=user_to_profile_data(user))


@router.post("/claim-bonus", response_model=SuccessResponse)
async def claim_bonus(
    user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SuccessResponse:
    """Mark signup bonus as claimed so the new-user starting page is dismissed."""
    user.bonus_claimed = True
    await db.commit()
    await db.refresh(user)
    logger.info("Marked signup bonus as claimed for user %s", user.id)
    return SuccessResponse(data=user_to_profile_data(user))


@router.post("/complete-profile", response_model=SuccessResponse)
async def complete_profile(
    payload: CompleteProfileRequest,
    user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SuccessResponse:
    """Complete profile registration: age check (18+), details, and terms acceptance."""
    if not payload.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the terms and acknowledge the paper-trading disclaimer.",
        )

    name = payload.name.strip()
    if len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name must be at least 2 characters.",
        )

    # 18+ Date of Birth verification
    today = date.today()
    birth = payload.dob
    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    if age < 18:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be at least 18 years old to trade on Naytra.",
        )

    user.name = name
    user.dob = birth
    user.phone = payload.phone.strip() if payload.phone else None
    user.city = payload.city.strip() if payload.city else None
    user.terms_accepted = True
    user.profile_complete = True

    await db.commit()
    await db.refresh(user)
    logger.info("Profile completed for user %s (age %d)", user.id, age)

    return SuccessResponse(data=user_to_profile_data(user))


@router.post("/check-password", response_model=SuccessResponse)
async def check_password(
    request: Request,
    payload: CheckPasswordRequest,
) -> SuccessResponse:
    """Check if password is breached via HIBP range API with rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    await check_rate_limit(client_ip, action="check_password", max_requests=20, window_seconds=60)

    is_breached, count = await check_password_breached(payload.password)
    message = (
        f"This password was found in {count:,} data breaches. Please choose a different, secure password."
        if is_breached
        else "Password has not been found in known public breaches."
    )
    return SuccessResponse(
        data=CheckPasswordData(
            breached=is_breached,
            count=count,
            message=message,
        )
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(user: Annotated[AppUser, Depends(get_current_user)]) -> SuccessResponse:
    """Revoke user session tokens."""
    revoke_user_tokens(user.id)
    return SuccessResponse(data={"message": "Successfully logged out and revoked active tokens"})
