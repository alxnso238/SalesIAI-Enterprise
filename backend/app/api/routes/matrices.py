from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.repositories.api_record_repository import api_record_repository
from app.schemas.matrix import Matrix, MatrixCreate

router = APIRouter()


@router.get("", response_model=list[Matrix], dependencies=[Depends(require_roles("admin", "member", "analyst"))])
def list_matrices(db: Session = Depends(get_db)) -> list[dict]:
    return api_record_repository.list(db, "matrices")


@router.post("", response_model=Matrix, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "member", "analyst"))])
def create_matrix(payload: MatrixCreate, db: Session = Depends(get_db)) -> dict:
    return api_record_repository.create(
        db,
        "matrices",
        {**payload.model_dump(), "rows": len(payload.values), "columns": len(payload.values[0])},
    )
