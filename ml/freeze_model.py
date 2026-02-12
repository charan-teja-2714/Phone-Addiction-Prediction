"""
Model Freeze & Packaging Script
================================
Freezes the trained CatBoost model and all preprocessing artifacts
for deployment via FastAPI / Hugging Face Hub.

Steps:
  1. Validate that the trained CatBoost model exists
  2. Export preprocessing encoders to artifacts/encoders.pkl
  3. Export preprocessing metadata to artifacts/preprocessing_metadata.json
  4. Sanity-check inference with a real sample from train_ready_data.csv
  5. Save sample input/output to validation/
  6. Log every step to logs/model_freeze.log

Usage:
    python freeze_model.py          (from ml/ directory)
"""

import json
import logging
import shutil
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier

# ──────────────────────────────────────────────
# Paths (relative to this script's location)
# ──────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent

MODEL_PATH = ROOT / "models" / "catboost" / "model.cbm"
FEATURE_SCHEMA_PATH = ROOT / "models" / "feature_schema.json"
LABEL_MAPPING_PATH = ROOT / "models" / "label_mapping.json"

ARTIFACTS_DIR = ROOT / "artifacts"
ENCODERS_PATH = ARTIFACTS_DIR / "encoders.pkl"
METADATA_PATH = ARTIFACTS_DIR / "preprocessing_metadata.json"

VALIDATION_DIR = ROOT / "validation"
SAMPLE_INPUT_PATH = VALIDATION_DIR / "sample_input.json"
SANITY_OUTPUT_PATH = VALIDATION_DIR / "sanity_check_output.json"

TRAIN_READY_PATH = ROOT / "data" / "processed" / "train_ready_data.csv"
EXISTING_ARTIFACTS = ROOT / "data" / "processed" / "preprocessing_artifacts.pkl"

LOG_DIR = ROOT / "logs"
LOG_FILE = LOG_DIR / "model_freeze.log"

# ──────────────────────────────────────────────
# Logger
# ──────────────────────────────────────────────
def setup_logger() -> logging.Logger:
    logger = logging.getLogger("model_freeze")
    logger.setLevel(logging.DEBUG)
    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(LOG_FILE, mode="w", encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger


log = setup_logger()

# ──────────────────────────────────────────────
# Derived-feature builder (mirrors feature_engineering.py)
# ──────────────────────────────────────────────
def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Reproduce the exact derived features used during training."""
    df = df.copy()
    if all(c in df.columns for c in ["Time_on_Social_Media", "Time_on_Gaming", "Time_on_Education"]):
        df["Total_Content_Hours"] = (
            df["Time_on_Social_Media"] + df["Time_on_Gaming"] + df["Time_on_Education"]
        )
    if "Daily_Usage_Hours" in df.columns and "Sleep_Hours" in df.columns:
        df["Usage_Sleep_Ratio"] = df["Daily_Usage_Hours"] / (df["Sleep_Hours"] + 1e-6)
    if all(c in df.columns for c in ["Anxiety_Level", "Depression_Level", "Self_Esteem"]):
        df["Mental_Health_Score"] = (
            df["Anxiety_Level"] + df["Depression_Level"] - df["Self_Esteem"]
        )
    if "Weekend_Usage_Hours" in df.columns and "Daily_Usage_Hours" in df.columns:
        df["Weekend_Weekday_Ratio"] = df["Weekend_Usage_Hours"] / (df["Daily_Usage_Hours"] + 1e-6)
    return df


# ──────────────────────────────────────────────
# Step 1: Validate trained model
# ──────────────────────────────────────────────
def validate_model():
    log.info("=" * 60)
    log.info("STEP 1 — Validate trained CatBoost model")
    log.info("=" * 60)
    if not MODEL_PATH.exists():
        log.error("Model file not found at %s", MODEL_PATH)
        sys.exit(1)

    model = CatBoostClassifier()
    model.load_model(str(MODEL_PATH))
    log.info("Model loaded successfully from %s", MODEL_PATH)
    log.info("Model tree count: %d", model.tree_count_)
    return model


# ──────────────────────────────────────────────
# Step 2: Export preprocessing artifacts
# ──────────────────────────────────────────────
def export_artifacts():
    log.info("=" * 60)
    log.info("STEP 2 — Export preprocessing artifacts")
    log.info("=" * 60)

    if not EXISTING_ARTIFACTS.exists():
        log.error("Preprocessing artifacts not found at %s", EXISTING_ARTIFACTS)
        sys.exit(1)

    raw_arts = joblib.load(EXISTING_ARTIFACTS)

    # --- encoders.pkl: just the label encoders ---
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    encoders = raw_arts["label_encoders"]
    joblib.dump(encoders, ENCODERS_PATH)
    log.info("Saved label encoders → %s", ENCODERS_PATH)
    for col, enc in encoders.items():
        log.info("  %s: %s", col, list(enc.classes_))

    # --- preprocessing_metadata.json ---
    with open(FEATURE_SCHEMA_PATH) as f:
        schema = json.load(f)

    metadata = {
        "target_column": "Addiction_Level",
        "binning_thresholds": {
            "low_threshold": raw_arts["low_threshold"],
            "high_threshold": raw_arts["high_threshold"],
        },
        "class_mapping": {str(k): v for k, v in raw_arts["class_mapping"].items()},
        "categorical_encodings": {
            col: {cls: int(idx) for idx, cls in enumerate(enc.classes_)}
            for col, enc in encoders.items()
        },
        "feature_order": schema["features"],
        "derived_features": schema["derived_features_added_at_inference"],
        "total_raw_features": schema["total_raw_features"],
        "total_model_features": schema["total_model_features"],
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    log.info("Saved preprocessing metadata → %s", METADATA_PATH)


# ──────────────────────────────────────────────
# Step 3: Sanity-check inference
# ──────────────────────────────────────────────
def sanity_check(model: CatBoostClassifier):
    log.info("=" * 60)
    log.info("STEP 3 — Sanity-check inference")
    log.info("=" * 60)

    if not TRAIN_READY_PATH.exists():
        log.error("Train-ready data not found at %s", TRAIN_READY_PATH)
        sys.exit(1)

    # Load schema to enforce feature order
    with open(FEATURE_SCHEMA_PATH) as f:
        schema = json.load(f)
    raw_features = schema["features"]

    # Pick first sample from train_ready_data
    df = pd.read_csv(TRAIN_READY_PATH)
    sample_row = df.iloc[0:1].copy()
    actual_class = int(sample_row["Addiction_Level"].values[0])

    # Select only the raw input features in schema order
    sample_input = sample_row[raw_features].copy()
    log.info("Sample input (raw 20 features):\n%s", sample_input.to_dict(orient="records")[0])

    # Add derived features (same as training pipeline)
    sample_with_derived = add_derived_features(sample_input)
    log.info("Sample with derived features (24 total):\n%s", list(sample_with_derived.columns))

    # Predict
    pred_class = int(model.predict(sample_with_derived).flat[0])
    pred_proba = model.predict_proba(sample_with_derived)[0]

    # Load label mapping
    with open(LABEL_MAPPING_PATH) as f:
        label_map = json.load(f)

    pred_label = label_map[str(pred_class)]
    actual_label = label_map[str(actual_class)]

    log.info("Actual class:    %d (%s)", actual_class, actual_label)
    log.info("Predicted class: %d (%s)", pred_class, pred_label)
    log.info("Probabilities:   %s", {label_map[str(i)]: round(p, 4) for i, p in enumerate(pred_proba)})

    # Save sample_input.json
    VALIDATION_DIR.mkdir(parents=True, exist_ok=True)
    input_record = sample_input.to_dict(orient="records")[0]
    # Ensure JSON-safe types
    input_json = {k: (int(v) if isinstance(v, (np.integer,)) else float(v) if isinstance(v, (np.floating,)) else v) for k, v in input_record.items()}
    with open(SAMPLE_INPUT_PATH, "w") as f:
        json.dump(input_json, f, indent=2)
    log.info("Saved sample input → %s", SAMPLE_INPUT_PATH)

    # Save sanity_check_output.json
    output_json = {
        "input_features": input_json,
        "derived_features_added": schema["derived_features_added_at_inference"],
        "actual_class": actual_class,
        "actual_label": actual_label,
        "predicted_class": pred_class,
        "predicted_label": pred_label,
        "probabilities": {
            label_map[str(i)]: round(float(p), 4) for i, p in enumerate(pred_proba)
        },
        "match": actual_class == pred_class,
    }
    with open(SANITY_OUTPUT_PATH, "w") as f:
        json.dump(output_json, f, indent=2)
    log.info("Saved sanity check output → %s", SANITY_OUTPUT_PATH)

    if actual_class == pred_class:
        log.info("SANITY CHECK PASSED — prediction matches actual label.")
    else:
        log.warning(
            "SANITY CHECK NOTE — prediction (%s) differs from actual (%s). "
            "This can happen for borderline samples and does not indicate a bug.",
            pred_label, actual_label,
        )


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    log.info("*" * 60)
    log.info("MODEL FREEZE & PACKAGING — CatBoost")
    log.info("*" * 60)

    model = validate_model()
    export_artifacts()
    sanity_check(model)

    log.info("=" * 60)
    log.info("MODEL FREEZE COMPLETE")
    log.info("=" * 60)
    log.info("Outputs:")
    log.info("  Model:        %s", MODEL_PATH)
    log.info("  Schema:       %s", FEATURE_SCHEMA_PATH)
    log.info("  Labels:       %s", LABEL_MAPPING_PATH)
    log.info("  Encoders:     %s", ENCODERS_PATH)
    log.info("  Metadata:     %s", METADATA_PATH)
    log.info("  Sample input: %s", SAMPLE_INPUT_PATH)
    log.info("  Sanity check: %s", SANITY_OUTPUT_PATH)
    log.info("  Freeze log:   %s", LOG_FILE)
    log.info("=" * 60)


if __name__ == "__main__":
    main()
