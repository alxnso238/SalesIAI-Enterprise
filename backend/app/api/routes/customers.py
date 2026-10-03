from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.api_record import ApiRecord

router = APIRouter(dependencies=[Depends(require_roles("admin", "member", "analyst", "viewer"))])


@router.get("/{customer_id}/sales")
def get_customer_sales(customer_id: int, db: Session = Depends(get_db)) -> list[dict]:
    customer = db.scalar(
        select(ApiRecord).where(ApiRecord.collection == "customers", ApiRecord.id == customer_id)
    )
    if customer is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    customer_name = str(customer.payload.get("full_name", "")).strip().casefold()
    sales = db.scalars(
        select(ApiRecord)
        .where(ApiRecord.collection == "sales")
        .order_by(ApiRecord.created_at.desc(), ApiRecord.id.desc())
    ).all()
    return [
        {**sale.payload, "id": sale.id, "created_at": sale.created_at.isoformat()}
        for sale in sales
        if sale.payload.get("customer_id") == customer_id
        or str(sale.payload.get("customer", "")).strip().casefold() == customer_name
    ]