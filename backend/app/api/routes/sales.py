from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import DomainError
from app.core.security import require_roles
from app.models.security import User
from app.schemas.sale import Sale, SaleCreate
from app.services.sale_service import create_sale, list_sales

router = APIRouter()


@router.get("", response_model=list[Sale], dependencies=[Depends(require_roles("admin", "member"))])
def get_sales(db: Session = Depends(get_db)) -> list[Sale]:
    return list_sales(db)


@router.post("", response_model=Sale, status_code=status.HTTP_201_CREATED)
def post_sale(
    payload: SaleCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "member")),
) -> Sale:
    ip_address = request.client.host if request.client else None
    try:
        return create_sale(db, payload, user_id=user.id, ip_address=ip_address, seller_email=user.email)
    except DomainError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error