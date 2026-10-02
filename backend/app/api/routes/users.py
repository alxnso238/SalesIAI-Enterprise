from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user, hash_password
from app.models.audit import AuditLog
from app.models.security import Role, User
from app.schemas.user import UserCreate, UserSummary, UserUpdate

def require_admin(user: User = Depends(get_current_user)) -> User:
	if user.role.name != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol administrador.")
	return user


router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UserSummary])
def list_users(
	db: Session = Depends(get_db),
	_current_user: User = Depends(get_current_user),
) -> list[UserSummary]:
	users = db.scalars(
		select(User).options(joinedload(User.role)).order_by(User.id)
	).all()
	return [
		UserSummary(
			id=user.id,
			name=user.full_name,
			email=user.email,
			role=user.role.name,
			status="active" if user.is_active else "inactive",
		)
		for user in users
	]


@router.post("", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def create_user(
	payload: UserCreate,
	request: Request,
	db: Session = Depends(get_db),
	_admin: User = Depends(require_admin),
) -> UserSummary:
	if db.scalar(select(User.id).where(func.lower(User.email) == payload.email)) is not None:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una cuenta con ese correo.")
	role = db.scalar(select(Role).where(Role.name == payload.role))
	if role is None:
		role = Role(name=payload.role, description=f"Rol {payload.role}")
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
			user_id=_admin.id,
			action="user_create",
			module="users",
			entity_type="user",
			entity_id=user.id,
			status="success",
			ip_address=request.client.host if request.client else None,
			details={"role": role.name},
		))
		db.commit()
	except IntegrityError as error:
		db.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una cuenta con ese correo.") from error
	db.refresh(user)
	return UserSummary(id=user.id, name=user.full_name, email=user.email, role=role.name, status="active")


@router.patch("/{user_id}", response_model=UserSummary)
def update_user(
	user_id: int,
	payload: UserUpdate,
	request: Request,
	db: Session = Depends(get_db),
	admin: User = Depends(require_admin),
) -> UserSummary:
	user = db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))
	if user is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
	if user.id == admin.id and (payload.is_active is False or (payload.role and payload.role != "admin")):
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No puedes desactivar ni degradar tu propia cuenta.")
	if user.role.name == "admin" and (payload.is_active is False or (payload.role and payload.role != "admin")):
		active_admins = db.scalar(select(func.count(User.id)).join(Role).where(Role.name == "admin", User.is_active.is_(True))) or 0
		if active_admins <= 1:
			raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Debe permanecer al menos un administrador activo.")
	if payload.email is not None:
		duplicate = db.scalar(select(User.id).where(func.lower(User.email) == payload.email, User.id != user.id))
		if duplicate is not None:
			raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una cuenta con ese correo.")
		user.email = payload.email
	if payload.full_name is not None:
		user.full_name = payload.full_name
	if payload.role:
		role = db.scalar(select(Role).where(Role.name == payload.role))
		if role is None:
			role = Role(name=payload.role, description=f"Rol {payload.role}")
			db.add(role)
			db.flush()
		user.role_id = role.id
	if payload.is_active is not None:
		user.is_active = payload.is_active
	if payload.password:
		user.password_hash = hash_password(payload.password)
	db.add(AuditLog(
		user_id=admin.id,
		action="user_update",
		module="users",
		entity_type="user",
		entity_id=user.id,
		status="success",
		ip_address=request.client.host if request.client else None,
		details={"name": payload.full_name, "email": payload.email, "role": payload.role, "is_active": payload.is_active, "password_reset": bool(payload.password)},
	))
	try:
		db.commit()
	except IntegrityError as error:
		db.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se pudo actualizar el usuario.") from error
	db.refresh(user)
	return UserSummary(id=user.id, name=user.full_name, email=user.email, role=user.role.name, status="active" if user.is_active else "inactive")