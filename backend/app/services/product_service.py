from sqlalchemy.orm import Session

from app.repositories.api_record_repository import api_record_repository
from app.schemas.product import Product, ProductCreate


def list_products(db: Session) -> list[Product]:
    return [Product.model_validate(row) for row in api_record_repository.list(db, "products")]


def create_product(db: Session, payload: ProductCreate) -> Product:
    product = api_record_repository.create(db, "products", payload.model_dump())
    return Product.model_validate(product)