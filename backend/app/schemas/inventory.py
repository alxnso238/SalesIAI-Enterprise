from typing import Literal

from pydantic import BaseModel, Field


class InventoryCreate(BaseModel):
    product: str = Field(min_length=2, max_length=120)
    branch: str = Field(min_length=2, max_length=120)
    quantity: int = Field(ge=0)
    movement: Literal["entry", "exit", "adjustment"] = "entry"


class Inventory(InventoryCreate):
    id: int
    status: str = "available"