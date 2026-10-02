from pydantic import BaseModel, Field


class BranchCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=80)
    manager: str = Field(min_length=2, max_length=120)
    code: str | None = Field(default=None, min_length=2, max_length=30)


class Branch(BranchCreate):
    id: int
    status: str = "active"