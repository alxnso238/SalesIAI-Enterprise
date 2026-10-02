from typing import Any

from sqlalchemy.orm import Session

from app.algorithms import matrices, vectors
from app.core.exceptions import DomainError
from app.repositories.api_record_repository import api_record_repository
from app.schemas.operation import OperationRequest
from app.models.security import User


def execute_operation(
    request: OperationRequest,
    db: Session,
    user: User | None = None,
    ip_address: str | None = None,
) -> dict[str, Any]:
    operation = request.operation
    if operation == "sum_vector":
        result = vectors.sum_vector(request.data, request.other)  # type: ignore[arg-type]
    elif operation == "subtract_vector":
        result = vectors.subtract_vector(request.data, request.other)  # type: ignore[arg-type]
    elif operation == "scalar_multiply":
        result = vectors.scalar_multiply(request.data, request.scalar)  # type: ignore[arg-type]
    elif operation == "dot_product":
        result = vectors.dot_product(request.data, request.other)  # type: ignore[arg-type]
    elif operation == "linear_combination":
        if not request.weights:
            raise DomainError("La combinacion lineal requiere pesos")
        result = vectors.linear_combination(request.data, request.weights)  # type: ignore[arg-type]
    elif operation == "add_matrix":
        result = matrices.add_matrix(request.data, request.other)  # type: ignore[arg-type]
    elif operation == "subtract_matrix":
        result = matrices.subtract_matrix(request.data, request.other)  # type: ignore[arg-type]
    elif operation == "multiply_matrix":
        result = matrices.multiply_matrix(request.data, request.other)  # type: ignore[arg-type]
    elif operation == "transpose_matrix":
        result = matrices.transpose_matrix(request.data)  # type: ignore[arg-type]
    elif operation == "scalar_multiply_matrix":
        result = matrices.scalar_multiply_matrix(request.data, request.scalar)  # type: ignore[arg-type]
    else:
        raise DomainError(f"Operacion no soportada: {operation}")

    from datetime import UTC, datetime

    return api_record_repository.create(
        db,
        "operations",
        {
            "operation": operation,
            "result": result,
            "status": "completed",
            "executed_at": datetime.now(UTC).isoformat(),
            "inputs": request.model_dump(mode="json"),
            "user_id": user.id if user else None,
            "user_email": user.email if user else None,
        },
        user_id=user.id if user and user.id > 0 else None,
        ip_address=ip_address,
    )
