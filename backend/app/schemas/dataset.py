from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DatasetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    source_type: Literal["sales", "customers", "products", "inventory", "manual"] = "manual"


class DatasetVariableCreate(BaseModel):
    dataset_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=150)
    variable_type: Literal["categorical", "discreta", "continua"]
    measurement_scale: Literal["nominal", "ordinal", "interval", "ratio"] | None = None
    source_field: str | None = Field(default=None, max_length=100)
    unit: str | None = Field(default=None, max_length=40)
    is_random: bool = False


class ObservationCreate(BaseModel):
    variable_id: int = Field(gt=0)
    value: int | float | str | bool
    source_type: str | None = Field(default=None, max_length=40)
    source_id: int | None = Field(default=None, gt=0)
    observed_at: datetime | None = None


class DatasetAnalysisInput(BaseModel):
    operation: Literal["mean", "median", "compare"] = "compare"