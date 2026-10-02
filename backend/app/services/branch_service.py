from sqlalchemy.orm import Session

from app.repositories.api_record_repository import api_record_repository
from app.schemas.branch import Branch, BranchCreate


def list_branches(db: Session) -> list[Branch]:
    return [Branch.model_validate(row) for row in api_record_repository.list(db, "branches")]


def create_branch(db: Session, payload: BranchCreate) -> Branch:
    branch = api_record_repository.create(db, "branches", payload.model_dump())
    return Branch.model_validate(branch)