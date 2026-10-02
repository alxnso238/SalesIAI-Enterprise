from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.security import User
from app.repositories.api_record_repository import api_record_repository
from app.schemas.branch import BranchCreate
from app.schemas.company import CompanyCreate
from app.schemas.configuration import ConfigurationCreate
from app.schemas.product import CategoryCreate
from app.schemas.inventory import InventoryCreate
from app.schemas.matrix import MatrixCreate
from app.schemas.product import ProductCreate
from app.schemas.sale import SaleCreate
from app.schemas.vector import VectorCreate
from app.schemas.target import TargetCreate

MEMBER_COLLECTIONS = {"sales", "inventory", "vectors", "matrices", "operations"}
ANALYST_COLLECTIONS = {"vectors", "matrices", "operations"}
READ_ONLY_MASTER_COLLECTIONS = {"companies", "branches", "products", "categories"}


def authorize_resource(request: Request, user: User = Depends(get_current_user)) -> User:
    collection = request.path_params["collection"]
    role = user.role.name
    if role == "admin":
        return user
    if request.method == "GET" and collection in READ_ONLY_MASTER_COLLECTIONS:
        return user
    if request.method in {"GET", "POST"}:
        if role == "member" and collection in MEMBER_COLLECTIONS:
            return user
        if role == "analyst" and collection in ANALYST_COLLECTIONS:
            return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu rol no tiene permiso para este recurso.")


router = APIRouter(dependencies=[Depends(authorize_resource)])
COLLECTIONS = {
    "companies", "branches", "products", "sales", "inventory",
    "vectors", "matrices", "operations", "configurations", "targets", "categories",
}
PAYLOAD_MODELS = {
    "companies": CompanyCreate,
    "branches": BranchCreate,
    "products": ProductCreate,
    "sales": SaleCreate,
    "inventory": InventoryCreate,
    "vectors": VectorCreate,
    "matrices": MatrixCreate,
    "configurations": ConfigurationCreate,
    "targets": TargetCreate,
    "categories": CategoryCreate,
}


def validate_collection(collection: str) -> None:
    if collection not in COLLECTIONS:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")


def validate_payload(collection: str, payload: dict[str, Any]) -> dict[str, Any]:
    schema = PAYLOAD_MODELS.get(collection)
    if schema is None:
        raise HTTPException(status_code=405, detail="Este recurso solo admite lectura.")
    try:
        return schema.model_validate(payload).model_dump(mode="json")
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors()) from error


@router.get("/{collection}")
def list_records(collection: str, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    validate_collection(collection)
    return api_record_repository.list(db, collection)


@router.post("/{collection}", status_code=status.HTTP_201_CREATED)
def create_record(
    collection: str,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    request: Request = None,
) -> dict[str, Any]:
    validate_collection(collection)
    payload.pop("id", None)
    validated_payload = validate_payload(collection, payload)
    if collection == "vectors":
        validated_payload["dimension"] = len(validated_payload["values"])
    if collection == "matrices":
        validated_payload["rows"] = len(validated_payload["values"])
        validated_payload["columns"] = len(validated_payload["values"][0])
    ip_address = request.client.host if request and request.client else None
    return api_record_repository.create(db, collection, validated_payload, user.id, ip_address)


@router.put("/{collection}/{record_id}")
def update_record(
    collection: str,
    record_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    request: Request = None,
) -> dict[str, Any]:
    validate_collection(collection)
    payload.pop("id", None)
    validated_payload = validate_payload(collection, payload)
    if collection == "vectors":
        validated_payload["dimension"] = len(validated_payload["values"])
    if collection == "matrices":
        validated_payload["rows"] = len(validated_payload["values"])
        validated_payload["columns"] = len(validated_payload["values"][0])
    ip_address = request.client.host if request and request.client else None
    updated = api_record_repository.update(db, collection, record_id, validated_payload, user.id, ip_address)
    if updated is None:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")
    return updated


@router.delete("/{collection}/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    collection: str,
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    request: Request = None,
) -> None:
    validate_collection(collection)
    ip_address = request.client.host if request and request.client else None
    if not api_record_repository.delete(db, collection, record_id, user.id, ip_address):
        raise HTTPException(status_code=404, detail="Registro no encontrado.")