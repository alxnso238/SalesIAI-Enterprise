from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import DomainError
from app.models.api_record import ApiRecord
from app.models.audit import AuditLog
from app.repositories.api_record_repository import api_record_repository
from app.schemas.sale import Sale, SaleCreate
from app.services.sales_insight_service import sales_distribution_insight


def list_sales(db: Session) -> list[Sale]:
    return [Sale.model_validate(row) for row in api_record_repository.list(db, "sales")]


def create_sale(
    db: Session,
    payload: SaleCreate,
    user_id: int | None = None,
    ip_address: str | None = None,
    seller_email: str | None = None,
) -> Sale:
    sale_payload = payload.model_dump(exclude={"payments"})
    sale_payload["seller_email"] = seller_email
    items = [item.model_dump() for item in payload.items]
    if not items and payload.product:
        items = [{
            "product": payload.product,
            "quantity": payload.quantity,
            "unit_price": payload.amount / payload.quantity,
        }]
    sale_payload["items"] = items
    sale_payload["payments"] = [payment.model_dump() for payment in payload.payments]

    stock_items = []
    if payload.status.casefold() in {"completed", "completada"}:
        for item in items:
            available = _available_stock(db, item["product"], payload.branch)
            if available is None:
                if payload.items:
                    raise DomainError(f"El producto {item['product']} no existe en el catálogo.")
                continue
            if float(item["quantity"]) > available:
                raise DomainError(
                    f"Existencias insuficientes para {item['product']}: disponibles {available:g}."
                )
            stock_items.append(item)

    sale_record = ApiRecord(collection="sales", payload=sale_payload)
    db.add(sale_record)
    try:
        db.flush()
        _audit(db, user_id, "sales", sale_record.id, ip_address)

        if payload.status.casefold() in {"completed", "completada"}:
            for item in stock_items:
                movement = ApiRecord(
                    collection="inventory",
                    payload={
                        "product": item["product"],
                        "branch": payload.branch,
                        "quantity": item["quantity"],
                        "movement": "exit",
                        "source_sale_id": sale_record.id,
                        "status": "available",
                    },
                )
                db.add(movement)
                db.flush()
                _audit(db, user_id, "inventory", movement.id, ip_address)

        for payment in payload.payments:
            payment_record = ApiRecord(
                collection="payments",
                payload={**payment.model_dump(), "sale_id": sale_record.id, "sale_code": payload.code},
            )
            db.add(payment_record)
            db.flush()
            _audit(db, user_id, "payments", payment_record.id, ip_address)

        if payload.status.casefold() in {"completed", "completada"}:
            completed_sales = db.scalars(
                select(ApiRecord).where(ApiRecord.collection == "sales")
            ).all()
            amounts = [
                float(record.payload.get("amount", 0) or 0)
                for record in completed_sales
                if str(record.payload.get("status", "completed")).casefold()
                in {"completed", "completada"}
            ]
            insight = sales_distribution_insight(amounts, sale_record.id)
            if insight:
                insight_record = ApiRecord(collection="insights", payload=insight)
                db.add(insight_record)
                db.flush()
                _audit(db, user_id, "insights", insight_record.id, ip_address)

        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(sale_record)
    return Sale.model_validate({**sale_record.payload, "id": sale_record.id})


def _available_stock(db: Session, product_name: str, branch: str) -> float | None:
    product_key = product_name.strip().casefold()
    products = db.scalars(select(ApiRecord).where(ApiRecord.collection == "products")).all()
    product = next(
        (
            row for row in products
            if str(row.payload.get("name", "")).strip().casefold() == product_key
        ),
        None,
    )
    stock = float(product.payload.get("stock", 0) or 0) if product else None
    movements = db.scalars(select(ApiRecord).where(ApiRecord.collection == "inventory")).all()
    current: float | None = None
    for movement_record in movements:
        movement = movement_record.payload
        if (
            str(movement.get("product", "")).strip().casefold() != product_key
            or str(movement.get("branch", "")).strip().casefold() != branch.strip().casefold()
        ):
            continue
        quantity = float(movement.get("quantity", 0) or 0)
        movement_type = movement.get("movement", "entry")
        if movement_type == "adjustment":
            current = quantity
        elif current is None:
            current = stock or 0 if movement_type == "exit" else 0
            current += -quantity if movement_type == "exit" else quantity
        else:
            current += -quantity if movement_type == "exit" else quantity
    if current is not None:
        return current
    return stock


def _audit(
    db: Session,
    user_id: int | None,
    module: str,
    entity_id: int,
    ip_address: str | None,
) -> None:
    db.add(AuditLog(
        user_id=user_id,
        action="create",
        module=module,
        entity_type=module,
        entity_id=entity_id,
        status="success",
        ip_address=ip_address,
        details={"source": "sale_transaction"},
    ))