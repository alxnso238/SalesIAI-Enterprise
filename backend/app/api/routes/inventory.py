from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.schemas.inventory import Inventory, InventoryCreate
from app.services.inventory_service import create_inventory_item, list_inventory

router = APIRouter()


@router.get("", response_model=list[Inventory], dependencies=[Depends(require_roles("admin", "member"))])
def get_inventory(db: Session = Depends(get_db)) -> list[Inventory]:
    return list_inventory(db)


@router.post("", response_model=Inventory, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "member"))])
def post_inventory_item(
    payload: InventoryCreate, db: Session = Depends(get_db)
) -> Inventory:
    return create_inventory_item(db, payload)