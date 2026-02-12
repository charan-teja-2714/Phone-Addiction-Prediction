"""
Preprocessing pipeline:
  1. Impute missing values (median for numeric, mode for categorical).
  2. Label-encode categorical features.
  3. Bin the continuous Addiction_Level into 3 classes.
  4. Save cleaned & train-ready datasets and preprocessing artifacts.
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from . import config
from .utils import ensure_dirs, get_logger

logger = get_logger(__name__)


def impute_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Fill missing values: median for numeric, mode for categorical."""
    df = df.copy()
    for col in df.select_dtypes(include="number").columns:
        if df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col].fillna(median_val, inplace=True)
            logger.info("Imputed %s with median=%.4f", col, median_val)

    for col in df.select_dtypes(include="object").columns:
        if df[col].isnull().sum() > 0:
            mode_val = df[col].mode()[0]
            df[col].fillna(mode_val, inplace=True)
            logger.info("Imputed %s with mode=%s", col, mode_val)

    return df


def encode_categoricals(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Label-encode categorical columns. Returns (df, encoders_dict)."""
    df = df.copy()
    encoders: dict[str, LabelEncoder] = {}
    cat_cols = [c for c in config.CATEGORICAL_COLUMNS if c in df.columns]

    for col in cat_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        logger.info("Encoded %s → %s", col, list(le.classes_))

    return df, encoders


def bin_target(series: pd.Series) -> pd.Series:
    """Convert continuous addiction scores into 3 ordinal classes."""
    conditions = [
        series < config.LOW_THRESHOLD,
        (series >= config.LOW_THRESHOLD) & (series < config.HIGH_THRESHOLD),
        series >= config.HIGH_THRESHOLD,
    ]
    choices = [0, 1, 2]
    binned = pd.Series(
        np.select(conditions, choices, default=1),
        index=series.index,
        name=series.name,
    )
    logger.info(
        "Target distribution after binning:\n%s",
        binned.value_counts().sort_index().to_dict(),
    )
    return binned


def run_preprocessing(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Full preprocessing pipeline.
    Returns the train-ready DataFrame and a dict of artifacts.
    """
    ensure_dirs()

    # 1. Impute
    logger.info("Step 1/4 — Imputing missing values")
    df = impute_missing(df)

    # 2. Save cleaned (pre-encoding) snapshot
    df.to_csv(config.CLEANED_DATA_PATH, index=False)
    logger.info("Saved cleaned data → %s", config.CLEANED_DATA_PATH)

    # 3. Encode categoricals
    logger.info("Step 2/4 — Encoding categorical features")
    df, encoders = encode_categoricals(df)

    # 4. Bin target
    logger.info("Step 3/4 — Binning target into 3 classes")
    df[config.TARGET_COLUMN] = bin_target(df[config.TARGET_COLUMN])

    # 5. Save train-ready dataset
    df.to_csv(config.TRAIN_READY_DATA_PATH, index=False)
    logger.info("Saved train-ready data → %s", config.TRAIN_READY_DATA_PATH)

    # 6. Persist artifacts
    artifacts = {
        "label_encoders": encoders,
        "class_mapping": config.CLASS_LABELS,
        "low_threshold": config.LOW_THRESHOLD,
        "high_threshold": config.HIGH_THRESHOLD,
    }
    artifact_path = config.DATA_PROCESSED_DIR / "preprocessing_artifacts.pkl"
    joblib.dump(artifacts, artifact_path)
    logger.info("Saved preprocessing artifacts → %s", artifact_path)

    return df, artifacts


if __name__ == "__main__":
    from .data_loader import load_raw_data

    raw = load_raw_data()
    processed, arts = run_preprocessing(raw)
    print(processed.head())
