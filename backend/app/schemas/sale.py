import math

from pydantic import BaseModel, Field, model_validator


class SaleItemCreate(BaseModel):
    product: str = Field(min_length=2, max_length=120)
    quantity: float = Field(gt=0, allow_inf_nan=False)
    unit_price: float = Field(ge=0, allow_inf_nan=False)


class PaymentCreate(BaseModel):
    payment_method: str = Field(min_length=2, max_length=40)
    amount: float = Field(gt=0, allow_inf_nan=False)
    status: str = Field(default="completed", min_length=2, max_length=30)


class SaleCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    branch: str = Field(min_length=2, max_length=120)
    customer: str = Field(min_length=2, max_length=120)
    amount: float = Field(ge=0, allow_inf_nan=False)
    product: str | None = Field(default=None, min_length=2, max_length=120)
    quantity: float = Field(default=1, gt=0, allow_inf_nan=False)
    status: str = Field(default="completed", min_length=2, max_length=30)
    items: list[SaleItemCreate] = Field(default_factory=list, max_length=100)
    payments: list[PaymentCreate] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def validate_sale_totals(self) -> "SaleCreate":
        if self.items:
            items_total = sum(item.quantity * item.unit_price for item in self.items)
            if not math.isclose(items_total, self.amount, rel_tol=0, abs_tol=0.01):
                raise ValueError("El importe debe coincidir con la suma del detalle de venta")
        payments_total = sum(payment.amount for payment in self.payments)
        if payments_total > self.amount + 0.01:
            raise ValueError("Los pagos no pueden superar el importe de la venta")
        if self.status.casefold() in {"cancelled", "cancelada"} and self.payments:
            raise ValueError("Una venta cancelada no puede registrar pagos")
        return self


class Sale(SaleCreate):
    id: int