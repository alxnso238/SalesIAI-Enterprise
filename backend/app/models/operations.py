from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Operation(Base):
    __tablename__ = "operations"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    operation_type: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )


class OperationInput(Base):
    __tablename__ = "operation_inputs"

    id: Mapped[int] = mapped_column(primary_key=True)

    operation_id: Mapped[int] = mapped_column(
        ForeignKey("operations.id"),
        nullable=False,
        index=True,
    )

    input_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    input_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    vector_id: Mapped[int | None] = mapped_column(
        ForeignKey("vectors.id"),
        nullable=True,
    )

    matrix_id: Mapped[int | None] = mapped_column(
        ForeignKey("matrices.id"),
        nullable=True,
    )

    input_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )


class OperationResult(Base):
    __tablename__ = "operation_results"

    id: Mapped[int] = mapped_column(primary_key=True)

    operation_id: Mapped[int] = mapped_column(
        ForeignKey("operations.id"),
        nullable=False,
        index=True,
    )

    result_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    vector_id: Mapped[int | None] = mapped_column(
        ForeignKey("vectors.id"),
        nullable=True,
    )

    matrix_id: Mapped[int | None] = mapped_column(
        ForeignKey("matrices.id"),
        nullable=True,
    )

    result_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )