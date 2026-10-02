from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import DomainError
from app.core.security import get_current_user, require_roles
from app.models.security import User
from app.repositories.api_record_repository import api_record_repository
from app.schemas.operation import OperationRequest, OperationResponse
from app.services.operation_service import execute_operation

router = APIRouter()


@router.get("", response_model=list[OperationResponse], dependencies=[Depends(require_roles("admin", "member", "analyst"))])
def list_operations(db: Session = Depends(get_db)) -> list[dict]:
    return api_record_repository.list(db, "operations")


@router.post("", response_model=OperationResponse, dependencies=[Depends(require_roles("admin", "member", "analyst"))])
def run_operation(
    payload: OperationRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        ip_address = request.client.host if request.client else None
        return execute_operation(payload, db, user, ip_address)
    except (DomainError, TypeError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
