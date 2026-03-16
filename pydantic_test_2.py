from pydantic import BaseModel, Field, ValidationError

class M(BaseModel):
    password: str = Field(..., pattern=r"^[A-Z]$")

try:
    M(password="Abcd@1234")
except ValidationError as e:
    import json
    print(e.json())
