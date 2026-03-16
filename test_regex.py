import re
from pydantic import BaseModel, Field

class TestModel(BaseModel):
    password: str = Field(..., min_length=8, pattern=r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$")

try:
    TestModel(password="Abcd@1234")
    print("Success 1!")
except Exception as e:
    print("Failed 1:", e)

