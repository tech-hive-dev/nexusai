from pydantic import BaseModel, Field, ValidationError

class M(BaseModel):
    password: str = Field(..., pattern=r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$")

try:
    M(password="Abcd@1234")
    print("Success")
except ValidationError as e:
    print("Validation Error:", e.errors())

try:
    M(password="invalid")
except ValidationError as e:
    print("Validation Error 2:", e.errors())
