from sqlalchemy.orm import Session

from app.repositories.api_record_repository import api_record_repository
from app.schemas.sale import Sale, SaleCreate


def list_sales(db: Session) -> list[Sale]:
    return [Sale.model_validate(row) for row in api_record_repository.list(db, "sales")]


def create_sale(db: Session, payload: SaleCreate) -> Sale:
    sale = api_record_repository.create(db, "sales", payload.model_dump())
    return Sale.model_validate(sale)