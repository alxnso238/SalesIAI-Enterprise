from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.schemas.product import Product, ProductCreate
from app.services.product_service import create_product, list_products

router = APIRouter()


@router.get("", response_model=list[Product], dependencies=[Depends(require_roles("admin", "member", "analyst", "viewer"))])
def get_products(db: Session = Depends(get_db)) -> list[Product]:
    return list_products(db)


@router.post("", response_model=Product, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin"))])
def post_product(payload: ProductCreate, db: Session = Depends(get_db)) -> Product:
    return create_product(db, payload)