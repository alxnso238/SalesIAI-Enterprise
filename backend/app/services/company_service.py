from sqlalchemy.orm import Session

from app.repositories.api_record_repository import api_record_repository
from app.schemas.company import Company, CompanyCreate


def list_companies(db: Session) -> list[Company]:
    return [Company.model_validate(row) for row in api_record_repository.list(db, "companies")]


def create_company(db: Session, payload: CompanyCreate) -> Company:
    company = api_record_repository.create(db, "companies", payload.model_dump())
    return Company.model_validate(company)