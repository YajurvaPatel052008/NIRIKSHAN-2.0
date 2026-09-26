from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.security import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    verify_password,
)
from app.api.routes.documents import router as documents_router
from app.api.routes.review import router as review_router
from app.api.routes.admin import router as admin_router
from app.db.base import SessionLocal
from app.models import User, UserRole

router = APIRouter(tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: UserRole = UserRole.OFFICER


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str | None
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: UserRole


@router.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    current_user: User | None = Depends(get_optional_current_user),
) -> User:
    if payload.role == UserRole.REVIEWER:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reviewer accounts are not supported",
        )
    if payload.role != UserRole.OFFICER and (
        current_user is None or current_user.role != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin can create admin users",
        )

    with SessionLocal() as session:
        existing_user = session.scalar(
            select(User).where(User.email == str(payload.email))
        )
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        user = User(
            email=str(payload.email),
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
            role=payload.role,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        session.expunge(user)
        return user


@router.post("/api/auth/login", response_model=TokenResponse)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> TokenResponse:
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == form_data.username))
        if user is None or not verify_password(
            form_data.password,
            user.hashed_password,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token(
            str(user.id),
            claims={"role": user.role.value},
        )
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            role=user.role,
        )


@router.get("/api/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


router.include_router(documents_router)
router.include_router(review_router)
router.include_router(admin_router)
