"""
Inference logic: encode → derive features → predict.
Stateless — receives artifacts as argument, never mutates them.
"""

import logging

import numpy as np
import pandas as pd
from fastapi import HTTPException

from .model_loader import Artifacts
from .schemas import PredictionRequest, PredictionResponse

logger = logging.getLogger("api.inference")


def _encode_categorical(value, column: str, encodings: dict[str, dict[str, int]]) -> int:
    """
    Encode a categorical field. Accepts either:
      - a string label ("Male") → looks up the mapping
      - an int already encoded (1) → passes through after validation
    """
    mapping = encodings[column]

    if isinstance(value, int):
        valid_codes = set(mapping.values())
        if value not in valid_codes:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid encoded value {value} for '{column}'. "
                       f"Valid codes: {sorted(valid_codes)}",
            )
        return value

    # String label
    label = str(value)
    if label not in mapping:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown value '{label}' for '{column}'. "
                   f"Allowed: {list(mapping.keys())}",
        )
    return mapping[label]


def _add_derived_features(row: dict) -> dict:
    """Compute the 4 derived features from raw values."""
    row["Total_Content_Hours"] = (
        row["Time_on_Social_Media"] + row["Time_on_Gaming"] + row["Time_on_Education"]
    )
    row["Usage_Sleep_Ratio"] = row["Daily_Usage_Hours"] / (row["Sleep_Hours"] + 1e-6)
    row["Mental_Health_Score"] = (
        row["Anxiety_Level"] + row["Depression_Level"] - row["Self_Esteem"]
    )
    row["Weekend_Weekday_Ratio"] = row["Weekend_Usage_Hours"] / (row["Daily_Usage_Hours"] + 1e-6)
    return row


def predict(request: PredictionRequest, artifacts: Artifacts) -> PredictionResponse:
    """
    Full inference pipeline for a single sample.
    1. Extract raw values in schema order
    2. Encode categoricals
    3. Compute derived features
    4. Predict with CatBoost
    """
    try:
        # 1. Build ordered dict from request
        raw = request.model_dump()

        # 2. Encode categoricals
        for col in artifacts.categorical_encodings:
            raw[col] = _encode_categorical(
                raw[col], col, artifacts.categorical_encodings
            )

        # 3. Arrange in frozen feature order (20 raw features)
        ordered = {feat: raw[feat] for feat in artifacts.feature_order}

        # 4. Add derived features
        ordered = _add_derived_features(ordered)

        # 5. Build numpy array in the exact column order the model expects
        full_feature_order = artifacts.feature_order + artifacts.derived_features
        values = np.array([[ordered[f] for f in full_feature_order]], dtype=np.float64)

        # 6. Predict
        pred_class = int(artifacts.model.predict(values).flat[0])
        pred_proba = artifacts.model.predict_proba(values)[0]
        confidence = round(float(np.max(pred_proba)), 4)
        label = artifacts.label_mapping[str(pred_class)]

        logger.info(
            "Prediction: class=%d (%s) confidence=%.4f",
            pred_class, label, confidence,
        )

        return PredictionResponse(
            predicted_class=pred_class,
            label=label,
            confidence=confidence,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail="Internal prediction error") from e
