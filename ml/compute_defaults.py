"""
Compute Age + Gender stratified median defaults for optional features.
=======================================================================
Updates artifacts/preprocessing_metadata.json with a `graceful_degradation`
block so the mobile app can fill in reasonable defaults when users skip
questionnaire fields.

The FastAPI backend remains strict (all 20 features required). The
intelligence for filling defaults lives in the mobile app layer.

Usage:
    python compute_defaults.py      (from ml/ directory)

Re-run this script whenever the dataset changes.
"""

import json
from pathlib import Path

import pandas as pd

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
RAW_DATASET = ROOT / "data" / "raw" / "primary_dataset.csv"
METADATA_PATH = ROOT / "artifacts" / "preprocessing_metadata.json"

# ──────────────────────────────────────────────
# Feature classification (fixed, must not change)
# ──────────────────────────────────────────────
AUTO_FEATURES = [
    "Daily_Usage_Hours",
    "Phone_Checks_Per_Day",
    "Screen_Time_Before_Bed",
    "Weekend_Usage_Hours",
    "Time_on_Social_Media",
    "Time_on_Gaming",
    "Time_on_Education",
    "Apps_Used_Daily",
    "Sleep_Hours",
    "Exercise_Hours",
]

OPTIONAL_FEATURES = [
    "Anxiety_Level",
    "Depression_Level",
    "Self_Esteem",
    "Academic_Performance",
    "Family_Communication",
    "Social_Interactions",
    "Parental_Control",
]

AGE_GROUPS = ["<18", "18-22", "23-30", ">30"]
GENDERS = ["Male", "Female", "Other"]

# Minimum samples required in a stratum before we trust its median.
# Below this, we fall back to the next broader group.
MIN_STRATUM_SIZE = 5


def assign_age_group(age: int) -> str:
    """Map a numeric age to one of the four fixed buckets."""
    if age < 18:
        return "<18"
    elif age <= 22:
        return "18-22"
    elif age <= 30:
        return "23-30"
    else:
        return ">30"


def compute_stratified_defaults(df: pd.DataFrame) -> dict:
    """
    Compute median defaults with three-tier fallback:
      1. Age-group + Gender median  (if >= MIN_STRATUM_SIZE samples)
      2. Gender-only median         (if age+gender stratum is too small)
      3. Global median              (ultimate fallback)
    """
    df = df.copy()
    df["age_group"] = df["Age"].apply(assign_age_group)

    # Pre-compute broader fallbacks
    global_medians = {
        feat: round(float(df[feat].median()), 1) for feat in OPTIONAL_FEATURES
    }
    gender_medians = {}
    for gender in GENDERS:
        subset = df[df["Gender"] == gender]
        gender_medians[gender] = {
            feat: round(float(subset[feat].median()), 1) if len(subset) >= MIN_STRATUM_SIZE else global_medians[feat]
            for feat in OPTIONAL_FEATURES
        }

    # Build the stratified defaults with fallback logic
    stratified = {}
    for ag in AGE_GROUPS:
        stratified[ag] = {}
        for gender in GENDERS:
            stratum = df[(df["age_group"] == ag) & (df["Gender"] == gender)]
            defaults = {}
            for feat in OPTIONAL_FEATURES:
                if len(stratum) >= MIN_STRATUM_SIZE:
                    # Tier 1: age+gender specific median
                    defaults[feat] = round(float(stratum[feat].median()), 1)
                elif gender in gender_medians:
                    # Tier 2: gender-only median
                    defaults[feat] = gender_medians[gender][feat]
                else:
                    # Tier 3: global median
                    defaults[feat] = global_medians[feat]
            stratified[ag][gender] = defaults

    return stratified, global_medians, gender_medians


def main():
    print("Loading dataset...")
    df = pd.read_csv(RAW_DATASET)

    # Drop ID columns if present (we only need Age, Gender, and the optional features)
    required_cols = ["Age", "Gender"] + OPTIONAL_FEATURES
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Required column '{col}' not found in dataset.")

    print(f"Dataset: {len(df)} records")
    print(f"Age range: {df['Age'].min()} – {df['Age'].max()}")

    # Show stratum sizes for transparency
    df["age_group"] = df["Age"].apply(assign_age_group)
    print("\nStratum sample sizes:")
    for ag in AGE_GROUPS:
        for gender in GENDERS:
            n = len(df[(df["age_group"] == ag) & (df["Gender"] == gender)])
            fallback = "" if n >= MIN_STRATUM_SIZE else " -> FALLBACK (gender-only or global)"
            print(f"  {ag:>5} | {gender:<6} | n={n:>4}{fallback}")

    stratified, global_medians, gender_medians = compute_stratified_defaults(df)

    # ── Update preprocessing_metadata.json (preserve existing keys) ──
    print(f"\nLoading existing metadata from {METADATA_PATH}...")
    with open(METADATA_PATH) as f:
        metadata = json.load(f)

    metadata["graceful_degradation"] = {
        "description": (
            "Age + Gender stratified median defaults for optional features. "
            "Used by the mobile app to fill in reasonable values when users "
            "skip questionnaire fields. The backend API remains strict — all "
            "20 features are always required. The mobile app applies these "
            "defaults before sending the request."
        ),
        "default_strategy": "age_gender_stratified_median",
        "fallback_chain": [
            "1. Age-group + Gender median (if stratum has >= 5 samples)",
            "2. Gender-only median (if age+gender stratum is too small)",
            "3. Global median (ultimate fallback)",
        ],
        "min_stratum_size": MIN_STRATUM_SIZE,
        "age_groups": AGE_GROUPS,
        "auto_features": AUTO_FEATURES,
        "optional_features": OPTIONAL_FEATURES,
        "data_completeness": {
            "description": (
                "Data completeness score = (number of user-provided optional "
                "features) / (total optional features). Calculated in the "
                "mobile app. A score of 1.0 means all optional fields were "
                "filled by the user; 0.0 means all used defaults. This score "
                "does NOT affect model confidence — it is purely informational "
                "for the user and for analytics."
            ),
            "total_optional_features": len(OPTIONAL_FEATURES),
            "formula": "user_provided_count / 7",
        },
        "global_medians": global_medians,
        "gender_medians": gender_medians,
        "stratified_defaults": stratified,
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nUpdated {METADATA_PATH}")
    print("Done. Stratified defaults written successfully.")


if __name__ == "__main__":
    main()
