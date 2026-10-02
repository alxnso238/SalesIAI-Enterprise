from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.api_record import ApiRecord
from app.models.audit import AuditLog


class ApiRecordRepository:
    def list(self, db: Session, collection: str) -> list[dict[str, Any]]:
        records = db.scalars(
            select(ApiRecord)
            .where(ApiRecord.collection == collection)
            .order_by(ApiRecord.id)
        )
        return [{**record.payload, "id": record.id} for record in records]

    def count(self, db: Session, collection: str) -> int:
        return db.scalar(
            select(func.count(ApiRecord.id)).where(ApiRecord.collection == collection)
        ) or 0

    def create(
        self,
        db: Session,
        collection: str,
        payload: dict[str, Any],
        user_id: int | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        record = ApiRecord(collection=collection, payload=payload)
        db.add(record)
        db.flush()
        db.add(AuditLog(
            user_id=user_id,
            action="create",
            module=collection,
            entity_type=collection,
            entity_id=record.id,
            status="success",
            ip_address=ip_address,
            details={"collection": collection},
        ))
        db.commit()
        db.refresh(record)
        return {**record.payload, "id": record.id}

    def update(
        self,
        db: Session,
        collection: str,
        record_id: int,
        payload: dict[str, Any],
        user_id: int | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any] | None:
        record = db.scalar(
            select(ApiRecord).where(
                ApiRecord.collection == collection, ApiRecord.id == record_id
            )
        )
        if record is None:
            return None
        record.payload = payload
        db.add(AuditLog(
            user_id=user_id,
            action="update",
            module=collection,
            entity_type=collection,
            entity_id=record.id,
            status="success",
            ip_address=ip_address,
            details={"collection": collection},
        ))
        db.commit()
        db.refresh(record)
        return {**record.payload, "id": record.id}

    def delete(
        self,
        db: Session,
        collection: str,
        record_id: int,
        user_id: int | None = None,
        ip_address: str | None = None,
    ) -> bool:
        record = db.scalar(
            select(ApiRecord).where(
                ApiRecord.collection == collection, ApiRecord.id == record_id
            )
        )
        if record is None:
            return False
        db.add(AuditLog(
            user_id=user_id,
            action="delete",
            module=collection,
            entity_type=collection,
            entity_id=record.id,
            status="success",
            ip_address=ip_address,
            details={"collection": collection},
        ))
        db.delete(record)
        db.commit()
        return True


api_record_repository = ApiRecordRepository()