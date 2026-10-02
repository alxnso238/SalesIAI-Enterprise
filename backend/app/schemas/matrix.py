from pydantic import BaseModel, Field, model_validator


class MatrixCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    values: list[list[float]] = Field(min_length=1)
    source: str = Field(default="manual", max_length=80)

    @model_validator(mode="after")
    def validate_rows(self):
        columns = len(self.values[0])
        if columns == 0 or any(len(row) != columns for row in self.values):
            raise ValueError("La matriz debe ser rectangular y no vacia")
        return self


class Matrix(MatrixCreate):
    id: int
    rows: int
    columns: int
