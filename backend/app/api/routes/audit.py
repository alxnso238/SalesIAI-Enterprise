from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.audit import AuditLog
from app.models.security import User

router = APIRouter(dependencies=[Depends(require_roles("admin"))])


@router.get("")
def list_audit_logs(db: Session = Depends(get_db)) -> list[dict]:
    entries = db.execute(
        select(AuditLog, User.email)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(500)
    )
    return [
        {
            "id": audit.id,
            "user_email": email,
            "action": audit.action,
            "module": audit.module,
            "entity_type": audit.entity_type,
            "entity_id": audit.entity_id,
            "status": audit.status,
            "ip_address": audit.ip_address,
            "details": audit.details,
            "created_at": audit.created_at,
        }
        for audit, email in entries
    ]
