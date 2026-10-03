from pydantic import BaseModel, Field


class EmployeeCreate(BaseModel):
    employee_code: str | None = Field(default=None, max_length=40)
    full_name: str = Field(min_length=2, max_length=150)
    email: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    position: str = Field(default="seller", min_length=2, max_length=80)
    branch: str | None = Field(default=None, max_length=120)