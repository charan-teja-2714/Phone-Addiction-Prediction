"""
Pydantic request / response schemas for the prediction API.

The input accepts BOTH raw string values ("Male", "Gaming") and
pre-encoded integers (1, 2) for categorical fields, so it works
seamlessly with mobile apps sending human-readable values AND
with pre-processed numeric pipelines.
"""

from typing import Union
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Request
# ──────────────────────────────────────────────
class PredictionRequest(BaseModel):
    Age: int = Field(..., ge=5, le=100, description="Age in years")
    Gender: Union[str, int] = Field(..., description="Female / Male / Other (or encoded 0/1/2)")
    Daily_Usage_Hours: float = Field(..., ge=0, le=24)
    Sleep_Hours: float = Field(..., ge=0, le=24)
    Academic_Performance: float = Field(..., ge=0, le=100)
    Social_Interactions: int = Field(..., ge=0)
    Exercise_Hours: float = Field(..., ge=0, le=24)
    Anxiety_Level: int = Field(..., ge=0, le=10)
    Depression_Level: int = Field(..., ge=0, le=10)
    Self_Esteem: int = Field(..., ge=0, le=10)
    Parental_Control: int = Field(..., ge=0, le=10)
    Screen_Time_Before_Bed: float = Field(..., ge=0, le=24)
    Phone_Checks_Per_Day: int = Field(..., ge=0)
    Apps_Used_Daily: int = Field(..., ge=0)
    Time_on_Social_Media: float = Field(..., ge=0, le=24)
    Time_on_Gaming: float = Field(..., ge=0, le=24)
    Time_on_Education: float = Field(..., ge=0, le=24)
    Phone_Usage_Purpose: Union[str, int] = Field(
        ..., description="Browsing / Education / Gaming / Other / Social Media (or 0-4)"
    )
    Family_Communication: int = Field(..., ge=0, le=10)
    Weekend_Usage_Hours: float = Field(..., ge=0, le=24)

    model_config = {"json_schema_extra": {
        "examples": [
            {
                "Age": 17,
                "Gender": "Male",
                "Daily_Usage_Hours": 6.5,
                "Sleep_Hours": 5.0,
                "Academic_Performance": 65,
                "Social_Interactions": 3,
                "Exercise_Hours": 0.5,
                "Anxiety_Level": 8,
                "Depression_Level": 7,
                "Self_Esteem": 3,
                "Parental_Control": 1,
                "Screen_Time_Before_Bed": 2.5,
                "Phone_Checks_Per_Day": 120,
                "Apps_Used_Daily": 15,
                "Time_on_Social_Media": 3.0,
                "Time_on_Gaming": 2.0,
                "Time_on_Education": 0.5,
                "Phone_Usage_Purpose": "Social Media",
                "Family_Communication": 2,
                "Weekend_Usage_Hours": 9.0,
            }
        ]
    }}


# ──────────────────────────────────────────────
# Response
# ──────────────────────────────────────────────
class PredictionResponse(BaseModel):
    predicted_class: int = Field(..., description="0, 1, or 2")
    label: str = Field(..., description="Human-readable addiction level")
    confidence: float = Field(..., description="Max probability score")


class HealthResponse(BaseModel):
    status: str


class ModelInfoResponse(BaseModel):
    model: str
    num_features: int
    classes: dict[str, str]
