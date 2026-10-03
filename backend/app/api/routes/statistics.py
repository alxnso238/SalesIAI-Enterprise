from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.algorithms.statistics import arithmetic_mean, bayes_probability, statistical_median
from app.core.database import get_db
from app.core.exceptions import DomainError
from app.core.security import require_roles
from app.models.api_record import ApiRecord
from app.models.security import User
from app.repositories.api_record_repository import api_record_repository
from app.schemas.dataset import DatasetAnalysisInput
from app.schemas.statistics import BayesInput, RandomVariableInput, ValuesInput
from app.services.sales_insight_service import sales_distribution_insight

router = APIRouter(dependencies=[Depends(require_roles("admin", "member", "analyst", "viewer"))])
ANALYST_ROLES = ("admin", "member", "analyst")


def _record_analysis(
    db: Session,
    user: User,
    operation: str,
    inputs: dict,
    result: dict,
) -> dict:
    return api_record_repository.create(
        db,
        "statistical_analyses",
        {
            "operation": operation,
            "inputs": inputs,
            "result": result,
            "user_email": user.email,
            "created_at": datetime.now(UTC).isoformat(),
        },
        user_id=user.id,
    )


@router.get("/analytics")
def get_analytics(
    date_from: date | None = None,
    date_to: date | None = None,
    branch: str | None = None,
    seller: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="La fecha inicial no puede ser posterior a la fecha final.")
    sales = db.scalars(
        select(ApiRecord)
        .where(ApiRecord.collection == "sales")
        .order_by(ApiRecord.created_at)
    ).all()
    completed_sales = [
        sale for sale in sales
        if str(sale.payload.get("status", "completed")).casefold()
        in {"completed", "completada"}
    ]
    catalog = api_record_repository.list(db, "products")
    product_categories = {
        str(product.get("name", "")).strip().casefold(): str(product.get("category", "")).strip()
        for product in catalog
    }
    filtered_sales: list[ApiRecord] = []
    for sale in completed_sales:
        timestamp = sale.created_at
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)
        if date_from and timestamp.date() < date_from:
            continue
        if date_to and timestamp.date() > date_to:
            continue
        if branch and str(sale.payload.get("branch", "")).casefold() != branch.casefold():
            continue
        if seller and str(sale.payload.get("seller_email", "")).casefold() != seller.casefold():
            continue
        product_names = _sale_product_names(sale)
        if category and not any(
            product_categories.get(name.casefold(), "").casefold() == category.casefold()
            for name in product_names
        ):
            continue
        filtered_sales.append(sale)
    completed = filtered_sales
    amounts = [float(sale.payload.get("amount", 0) or 0) for sale in completed]
    quantities = [
        sum(float(line.get("quantity", 1) or 1) for line in sale.payload.get("items", []))
        if sale.payload.get("items") else float(sale.payload.get("quantity", 1) or 1)
        for sale in completed
    ]
    monthly_sales: dict[str, float] = {}
    for sale in completed:
        timestamp = sale.created_at
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)
        month = timestamp.strftime("%Y-%m")
        monthly_sales[month] = monthly_sales.get(month, 0) + float(sale.payload.get("amount", 0) or 0)
    return {
        "sales_count": len(completed),
        "total_revenue": sum(amounts),
        "average_sale": arithmetic_mean(amounts) if amounts else 0,
        "median_sale": statistical_median(amounts) if amounts else 0,
        "average_quantity": arithmetic_mean(quantities) if quantities else 0,
        "insights": [insight] if (insight := sales_distribution_insight(amounts)) else [],
        "filter_options": {
            "branches": sorted({str(sale.payload.get("branch", "")).strip() for sale in completed_sales if sale.payload.get("branch")}),
            "sellers": sorted({str(sale.payload.get("seller_email", "")).strip() for sale in completed_sales if sale.payload.get("seller_email")}),
            "categories": sorted({value for value in product_categories.values() if value}),
        },
        "sales_by_month": [
            {"month": month, "total": total}
            for month, total in sorted(monthly_sales.items())[-12:]
        ],
        "sales_by_product": _product_summary(completed),
    }


def _product_summary(sales: list[ApiRecord]) -> list[dict]:
    products: dict[str, dict[str, float]] = {}
    for sale in sales:
        lines = sale.payload.get("items") or []
        if lines:
            sale_lines = [
                (
                    str(line.get("product") or "Sin producto"),
                    float(line.get("quantity", 1) or 1),
                    float(line.get("quantity", 1) or 1) * float(line.get("unit_price", 0) or 0),
                )
                for line in lines
            ]
        elif sale.payload.get("product"):
            sale_lines = [(
                str(sale.payload["product"]),
                float(sale.payload.get("quantity", 1) or 1),
                float(sale.payload.get("amount", 0) or 0),
            )]
        else:
            sale_lines = [("Sin producto", 0, float(sale.payload.get("amount", 0) or 0))]
        for name, quantity, revenue in sale_lines:
            item = products.setdefault(name, {"revenue": 0, "quantity": 0})
            item["revenue"] += revenue
            item["quantity"] += quantity
    return [
        {"product": name, **values}
        for name, values in sorted(products.items(), key=lambda entry: entry[1]["revenue"], reverse=True)
    ]


def _sale_product_names(sale: ApiRecord) -> list[str]:
    lines = sale.payload.get("items") or []
    if lines:
        return [str(line.get("product", "")).strip() for line in lines]
    product = sale.payload.get("product")
    return [str(product).strip()] if product else []


@router.post("/datasets/{dataset_id}/variables/{variable_id}/analyze")
def analyze_dataset_variable(
    dataset_id: int,
    variable_id: int,
    payload: DatasetAnalysisInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*ANALYST_ROLES)),
) -> dict:
    datasets = api_record_repository.list(db, "datasets")
    variables = api_record_repository.list(db, "dataset_variables")
    dataset_exists = any(dataset["id"] == dataset_id for dataset in datasets)
    variable = next(
        (
            row for row in variables
            if row["id"] == variable_id and row.get("dataset_id") == dataset_id
        ),
        None,
    )
    if not dataset_exists or variable is None:
        raise HTTPException(status_code=404, detail="Dataset o variable no encontrado.")
    if variable.get("variable_type") == "categorical":
        raise HTTPException(status_code=422, detail="Las variables categóricas no admiten estos cálculos numéricos.")

    observations = [
        row for row in api_record_repository.list(db, "observations")
        if row.get("variable_id") == variable_id
    ]
    try:
        values = [float(row["value"]) for row in observations]
    except (TypeError, ValueError, KeyError):
        raise HTTPException(status_code=422, detail="Las observaciones deben ser numéricas.") from None
    if not values:
        raise HTTPException(status_code=422, detail="La variable no tiene observaciones.")

    if payload.operation == "mean":
        result = {"value": arithmetic_mean(values), "sample_size": len(values)}
    elif payload.operation == "median":
        result = {"value": statistical_median(values), "sample_size": len(values)}
    else:
        mean = arithmetic_mean(values)
        midpoint = statistical_median(values)
        result = {"mean": mean, "median": midpoint, "difference": mean - midpoint, "sample_size": len(values)}
    inputs = {
        "dataset_id": dataset_id,
        "variable_id": variable_id,
        "variable": variable["name"],
        "values": values,
    }
    return _record_analysis(db, user, payload.operation, inputs, result)


@router.post("/mean")
def calculate_mean(
    payload: ValuesInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*ANALYST_ROLES)),
) -> dict:
    try:
        result = {"value": arithmetic_mean(payload.values), "sample_size": len(payload.values)}
    except DomainError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return _record_analysis(db, user, "mean", payload.model_dump(), result)


@router.post("/median")
def calculate_median(
    payload: ValuesInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*ANALYST_ROLES)),
) -> dict:
    try:
        result = {"value": statistical_median(payload.values), "sample_size": len(payload.values)}
    except DomainError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return _record_analysis(db, user, "median", payload.model_dump(), result)


@router.post("/compare")
def compare_mean_median(
    payload: ValuesInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*ANALYST_ROLES)),
) -> dict:
    try:
        mean = arithmetic_mean(payload.values)
        median = statistical_median(payload.values)
    except DomainError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    result = {"mean": mean, "median": median, "difference": mean - median, "sample_size": len(payload.values)}
    return _record_analysis(db, user, "compare", payload.model_dump(), result)


@router.post("/bayes")
def calculate_bayes(
    payload: BayesInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*ANALYST_ROLES)),
) -> dict:
    try:
        posterior, evidence = bayes_probability(
            payload.probability_a,
            payload.probability_b_given_a,
            payload.probability_b_given_not_a,
        )
    except DomainError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    result = {"probability_a_given_b": posterior, "probability_b": evidence}
    return _record_analysis(db, user, "bayes", payload.model_dump(), result)


@router.post("/random-variables/analyze")
def analyze_random_variable(
    payload: RandomVariableInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*ANALYST_ROLES)),
) -> dict:
    values = payload.values
    result = {
        "name": payload.name,
        "variable_type": payload.variable_type,
        "observations": len(values),
        "mean": arithmetic_mean(values),
        "median": statistical_median(values),
        "minimum": min(values),
        "maximum": max(values),
    }
    return _record_analysis(db, user, "random_variable", payload.model_dump(), result)


@router.get("/history")
def get_analysis_history(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[dict]:
    records = db.scalars(
        select(ApiRecord)
        .where(ApiRecord.collection == "statistical_analyses")
        .order_by(ApiRecord.created_at.desc(), ApiRecord.id.desc())
        .limit(limit)
    ).all()
    return [
        {"id": record.id, **record.payload, "created_at": record.created_at.isoformat()}
        for record in records
    ]