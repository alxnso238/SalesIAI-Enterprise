from typing import Any, Literal

from pydantic import BaseModel, Field

OperationName = Literal[
    "sum_vector", "subtract_vector", "scalar_multiply", "dot_product",
    "add_matrix", "subtract_matrix", "multiply_matrix", "transpose_matrix",
    "scalar_multiply_matrix", "linear_combination",
]


class OperationRequest(BaseModel):
    operation: OperationName
    data: list[float] | list[list[float]]
    other: list[float] | list[list[float]] | None = None
    scalar: float | None = None
    weights: list[float] | None = None


class OperationResponse(BaseModel):
    id: int
    operation: str
    result: float | list[float] | list[list[float]]
    status: str
    executed_at: str
    inputs: dict[str, Any] = {}
    user_id: int | None = None
    user_email: str | None = None
