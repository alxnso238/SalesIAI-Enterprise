from datetime import date

from pydantic import BaseModel, Field, model_validator


class TargetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    period_start: date
    period_end: date
    target_quantity: float | None = Field(default=None, ge=0)
    target_amount: float | None = Field(default=None, ge=0)
    branch: str | None = Field(default=None, max_length=120)
    product: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def validate_target(self):
        if self.period_end < self.period_start:
            raise ValueError("La fecha final debe ser igual o posterior a la inicial.")
        if self.target_quantity is None and self.target_amount is None:
            raise ValueError("Define una meta de cantidad o de importe.")
        return self