from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.schemas.company import Company, CompanyCreate
from app.services.company_service import create_company, list_companies

router = APIRouter()


@router.get("", response_model=list[Company], dependencies=[Depends(require_roles("admin", "member", "analyst", "viewer"))])
def get_companies(db: Session = Depends(get_db)) -> list[Company]:
    return list_companies(db)


@router.post("", response_model=Company, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin"))])
def post_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> Company:
    return create_company(db, payload)
