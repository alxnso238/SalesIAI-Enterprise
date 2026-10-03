from typing import Literal

import math

from pydantic import BaseModel, Field, field_validator


class ValuesInput(BaseModel):
    values: list[float] = Field(min_length=1, max_length=10000)

    @field_validator("values")
    @classmethod
    def values_must_be_finite(cls, values: list[float]) -> list[float]:
        if any(not math.isfinite(value) for value in values):
            raise ValueError("Las observaciones deben ser numeros finitos")
        return values


class BayesInput(BaseModel):
    probability_a: float = Field(ge=0, le=1, allow_inf_nan=False)
    probability_b_given_a: float = Field(ge=0, le=1, allow_inf_nan=False)
    probability_b_given_not_a: float = Field(ge=0, le=1, allow_inf_nan=False)


class RandomVariableInput(ValuesInput):
    name: str = Field(min_length=1, max_length=120)
    variable_type: Literal["discreta", "continua"]