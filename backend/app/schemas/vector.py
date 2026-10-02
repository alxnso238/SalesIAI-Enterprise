from pydantic import BaseModel, Field


class VectorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    values: list[float] = Field(min_length=1)
    source: str = Field(default="manual", max_length=80)


class Vector(VectorCreate):
    id: int
    dimension: int
