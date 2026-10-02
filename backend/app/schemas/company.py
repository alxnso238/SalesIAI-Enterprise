from pydantic import BaseModel, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    tax_id: str = Field(min_length=3, max_length=30)
    city: str = Field(min_length=2, max_length=80)


class Company(CompanyCreate):
    id: int
    status: str = "active"
