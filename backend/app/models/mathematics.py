from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Vector(Base):
    __tablename__ = "vectors"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    dimension: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    values: Mapped[list["VectorValue"]] = relationship(
        back_populates="vector",
        cascade="all, delete-orphan",
    )


class VectorValue(Base):
    __tablename__ = "vector_values"

    id: Mapped[int] = mapped_column(primary_key=True)

    vector_id: Mapped[int] = mapped_column(
        ForeignKey("vectors.id"),
        nullable=False,
        index=True,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    label: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    value: Mapped[Decimal] = mapped_column(
        Numeric(18, 6),
        nullable=False,
    )

    vector: Mapped["Vector"] = relationship(
        back_populates="values"
    )
class Matrix(Base):
    __tablename__ = "matrices"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    rows: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    columns: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    values: Mapped[list["MatrixValue"]] = relationship(
        back_populates="matrix",
        cascade="all, delete-orphan",
    )


class MatrixValue(Base):
    __tablename__ = "matrix_values"

    id: Mapped[int] = mapped_column(primary_key=True)

    matrix_id: Mapped[int] = mapped_column(
        ForeignKey("matrices.id"),
        nullable=False,
        index=True,
    )

    row_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    column_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    value: Mapped[Decimal] = mapped_column(
        Numeric(18, 6),
        nullable=False,
    )

    matrix: Mapped["Matrix"] = relationship(
        back_populates="values"
    )