from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    tax_id: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=300)