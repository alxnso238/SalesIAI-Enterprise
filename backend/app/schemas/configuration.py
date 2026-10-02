from pydantic import BaseModel, Field


class ConfigurationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    value: str = Field(max_length=2000)