from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.schemas.branch import Branch, BranchCreate
from app.services.branch_service import create_branch, list_branches

router = APIRouter()


@router.get("", response_model=list[Branch], dependencies=[Depends(require_roles("admin", "member", "analyst", "viewer"))])
def get_branches(db: Session = Depends(get_db)) -> list[Branch]:
    return list_branches(db)


@router.post("", response_model=Branch, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin"))])
def post_branch(payload: BranchCreate, db: Session = Depends(get_db)) -> Branch:
    return create_branch(db, payload)