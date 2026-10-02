from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.models.audit import AuditLog
from app.models.security import Role, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter()


@router.get("/me")
def current_user(user: User = Depends(get_current_user)) -> dict[str, str]:
    return {"email": user.email, "name": user.full_name, "role": user.role.name}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    if len(settings.jwt_secret_key) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT_SECRET_KEY no está configurada correctamente.",
        )
    user = db.scalar(
        select(User)
        .options(joinedload(User.role))
        .where(User.email == payload.email, User.is_active.is_(True))
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        db.add(AuditLog(
            user_id=user.id if user else None,
            action="login_failed",
            module="auth",
            entity_type="user",
            entity_id=user.id if user else None,
            status="failed",
            ip_address=request.client.host if request.client else None,
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )
    db.add(AuditLog(
        user_id=user.id,
        action="login",
        module="auth",
        entity_type="user",
        entity_id=user.id,
        status="success",
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        user={"email": user.email, "name": user.full_name, "role": user.role.name},
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    if len(settings.jwt_secret_key) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT_SECRET_KEY no está configurada correctamente.",
        )

    existing_user = db.scalar(
        select(User.id).where(func.lower(User.email) == payload.email)
    )
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una cuenta con ese correo.")

    role = db.scalar(select(Role).where(Role.name == "viewer"))
    if role is None:
        role = Role(name="viewer", description="Usuario de solo lectura")
        db.add(role)
        db.flush()

    user = User(
        role_id=role.id,
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.flush()
        db.add(AuditLog(
            user_id=user.id,
            action="user_register",
            module="auth",
            entity_type="user",
            entity_id=user.id,
            status="success",
            ip_address=request.client.host if request.client else None,
            details={"role": role.name},
        ))
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo.",
        ) from error
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        user={"email": user.email, "name": user.full_name, "role": role.name},
    )
