from sqlalchemy.orm import Session

from app.repositories.api_record_repository import api_record_repository
from app.schemas.inventory import Inventory, InventoryCreate


def list_inventory(db: Session) -> list[Inventory]:
    return [Inventory.model_validate(row) for row in api_record_repository.list(db, "inventory")]


def create_inventory_item(db: Session, payload: InventoryCreate) -> Inventory:
    item = api_record_repository.create(db, "inventory", payload.model_dump())
    return Inventory.model_validate(item)