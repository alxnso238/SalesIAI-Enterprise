from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.schemas.sale import Sale, SaleCreate
from app.services.sale_service import create_sale, list_sales

router = APIRouter()


@router.get("", response_model=list[Sale], dependencies=[Depends(require_roles("admin", "member"))])
def get_sales(db: Session = Depends(get_db)) -> list[Sale]:
    return list_sales(db)


@router.post("", response_model=Sale, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "member"))])
def post_sale(payload: SaleCreate, db: Session = Depends(get_db)) -> Sale:
    return create_sale(db, payload)