from collections import defaultdict
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.api_record import ApiRecord
from app.repositories.api_record_repository import api_record_repository

router = APIRouter(dependencies=[Depends(require_roles("admin", "member", "analyst", "viewer"))])


def _number(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _product_key(value: object) -> str:
    return str(value or "").strip().casefold()


@router.get("")
def get_report(db: Session = Depends(get_db)) -> dict:
    sales = db.scalars(
        select(ApiRecord).where(ApiRecord.collection == "sales").order_by(ApiRecord.created_at)
    ).all()
    inventory = api_record_repository.list(db, "inventory")
    products = api_record_repository.list(db, "products")
    targets = api_record_repository.list(db, "targets")
    sales_by_month: dict[str, float] = defaultdict(float)
    sales_by_branch: dict[str, float] = defaultdict(float)
    sales_count_by_branch: dict[str, int] = defaultdict(int)
    sales_by_product: dict[str, float] = defaultdict(float)
    inventory_by_product: dict[str, float] = defaultdict(float)
    inventory_seen: set[str] = set()
    sold_quantity_by_product: dict[str, float] = defaultdict(float)
    catalog_stock = {
        _product_key(product.get("name")): _number(product.get("stock"))
        for product in products
        if _product_key(product.get("name"))
    }
    months = []
    current = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for offset in range(11, -1, -1):
        year = current.year
        month = current.month - offset
        while month <= 0:
            month += 12
            year -= 1
        months.append(f"{year:04d}-{month:02d}")
    for record in sales:
        amount = _number(record.payload.get("amount"))
        timestamp = record.created_at
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)
        sales_by_month[timestamp.strftime("%Y-%m")] += amount
        branch = str(record.payload.get("branch", "Sin sucursal"))
        sales_by_branch[branch] += amount
        sales_count_by_branch[branch] += 1
        items = record.payload.get("items") or []
        if items:
            for item in items:
                product_name = str(item.get("product") or "Sin producto")
                product_key = _product_key(product_name)
                quantity = _number(item.get("quantity", 1))
                line_amount = quantity * _number(item.get("unit_price"))
                sales_by_product[product_name] += line_amount
                sold_quantity_by_product[product_key] += quantity
        elif record.payload.get("product"):
            product_name = str(record.payload["product"])
            sales_by_product[product_name] += amount
            sold_quantity_by_product[_product_key(product_name)] += _number(record.payload.get("quantity", 1))
    for row in inventory:
        product = _product_key(row.get("product"))
        if not product:
            continue
        quantity = _number(row.get("quantity"))
        movement = row.get("movement", "entry")
        if movement == "adjustment":
            inventory_by_product[product] = quantity
        else:
            if product not in inventory_seen:
                inventory_by_product[product] = catalog_stock.get(product, 0) if movement == "exit" else 0
            inventory_by_product[product] += -quantity if movement == "exit" else quantity
        inventory_seen.add(product)

    current_stock_by_product = {**catalog_stock, **inventory_by_product}

    today = datetime.now(UTC).date()
    target_progress = []
    for target in targets:
        start = date.fromisoformat(str(target["period_start"])[:10])
        end = date.fromisoformat(str(target["period_end"])[:10])
        actual_amount = 0.0
        actual_quantity = 0.0
        for record in sales:
            stamp = record.created_at
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=UTC)
            sale_date = stamp.date()
            if not start <= sale_date <= end:
                continue
            if target.get("branch") and record.payload.get("branch") != target["branch"]:
                continue
            if target.get("product") and record.payload.get("product") != target["product"]:
                continue
            actual_amount += _number(record.payload.get("amount"))
            sale_items = record.payload.get("items") or []
            actual_quantity += (
                sum(_number(item.get("quantity", 1)) for item in sale_items)
                if sale_items else _number(record.payload.get("quantity", 1))
            )
        goal = _number(target.get("target_amount")) if target.get("target_amount") is not None else _number(target.get("target_quantity"))
        actual = actual_amount if target.get("target_amount") is not None else actual_quantity
        target_progress.append({
            **target,
            "actual": actual,
            "goal": goal,
            "completion_percent": round((actual / goal) * 100, 1) if goal else 0,
            "unit": "importe" if target.get("target_amount") is not None else "unidades",
            "period_active": start <= today <= end,
        })

    inventory_rotation = []
    for product in products:
        name = str(product.get("name", "Sin producto"))
        product_key = _product_key(name)
        stock = current_stock_by_product.get(product_key, 0)
        sold = sold_quantity_by_product.get(product_key, 0)
        inventory_rotation.append({
            "product": name,
            "stock": stock,
            "sold_quantity": sold,
            "rotation": round(sold / stock, 2) if stock > 0 else 0,
        })

    recent_activity = []
    for record in db.scalars(select(ApiRecord).order_by(ApiRecord.created_at.desc(), ApiRecord.id.desc()).limit(8)):
        recent_activity.append({
            "id": record.id,
            "resource": record.collection,
            "label": str(record.payload.get("name") or record.payload.get("code") or record.payload.get("operation") or record.payload.get("email") or f"Registro {record.id}"),
            "created_at": record.created_at.isoformat(),
            "user_email": record.payload.get("user_email"),
        })

    monthly_series = [{"month": month, "total": sales_by_month.get(month, 0)} for month in months]
    return {
        "sales": {"current": sum(_number(row.payload.get("amount")) for row in sales), "records": len(sales)},
        "inventory": {"quantity": sum(current_stock_by_product.values()), "records": len(inventory)},
        "companies": api_record_repository.count(db, "companies"),
        "branches": api_record_repository.count(db, "branches"),
        "products": api_record_repository.count(db, "products"),
        "targets": len(target_progress),
        "active_targets": sum(1 for target in target_progress if target["period_active"]),
        "sales_records": len(sales),
        "inventory_records": len(inventory),
        "sales_by_month": monthly_series,
        "sales_by_branch": [
            {"branch": branch, "total": total, "orders": sales_count_by_branch[branch]}
            for branch, total in sorted(sales_by_branch.items(), key=lambda item: item[1], reverse=True)
        ],
        "sales_by_product": [
            {"product": product, "total": total, "quantity": sold_quantity_by_product[_product_key(product)]}
            for product, total in sorted(sales_by_product.items(), key=lambda item: item[1], reverse=True)
        ],
        "inventory_by_product": [
            {"product": product, "quantity": quantity}
            for product, quantity in sorted(inventory_by_product.items(), key=lambda item: item[1], reverse=True)
        ],
        "inventory_rotation": inventory_rotation,
        "target_progress": target_progress,
        "recent_activity": recent_activity,
    }
