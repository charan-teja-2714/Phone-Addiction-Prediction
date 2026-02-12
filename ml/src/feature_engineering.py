"""
Feature engineering: create derived features, prepare X / y splits,
and apply SMOTE oversampling to the training set.
"""

import pandas as pd
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE

from . import config
from .utils import get_logger

logger = get_logger(__name__)


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create additional features from existing columns."""
    df = df.copy()

    # Total screen time (social media + gaming + education)
    if all(c in df.columns for c in ["Time_on_Social_Media", "Time_on_Gaming", "Time_on_Education"]):
        df["Total_Content_Hours"] = (
            df["Time_on_Social_Media"] + df["Time_on_Gaming"] + df["Time_on_Education"]
        )

    # Usage intensity = daily usage / sleep hours (higher → worse balance)
    if "Daily_Usage_Hours" in df.columns and "Sleep_Hours" in df.columns:
        df["Usage_Sleep_Ratio"] = df["Daily_Usage_Hours"] / (df["Sleep_Hours"] + 1e-6)

    # Mental health composite (anxiety + depression - self_esteem)
    if all(c in df.columns for c in ["Anxiety_Level", "Depression_Level", "Self_Esteem"]):
        df["Mental_Health_Score"] = (
            df["Anxiety_Level"] + df["Depression_Level"] - df["Self_Esteem"]
        )

    # Weekend vs weekday usage ratio
    if "Weekend_Usage_Hours" in df.columns and "Daily_Usage_Hours" in df.columns:
        df["Weekend_Weekday_Ratio"] = df["Weekend_Usage_Hours"] / (df["Daily_Usage_Hours"] + 1e-6)

    logger.info("Added derived features. New shape: %s", df.shape)
    return df


def apply_smote(X_train: pd.DataFrame, y_train: pd.Series) -> tuple:
    """
    Apply SMOTE oversampling to balance minority classes in the training set.
    Returns (X_resampled, y_resampled) as DataFrames/Series.
    """
    logger.info("Before SMOTE — training distribution: %s", y_train.value_counts().sort_index().to_dict())

    smote = SMOTE(random_state=config.SMOTE_RANDOM_STATE)
    X_resampled, y_resampled = smote.fit_resample(X_train, y_train)

    # Convert back to DataFrame/Series to preserve column names
    X_resampled = pd.DataFrame(X_resampled, columns=X_train.columns)
    y_resampled = pd.Series(y_resampled, name=y_train.name)

    logger.info("After  SMOTE — training distribution: %s", y_resampled.value_counts().sort_index().to_dict())
    logger.info("Training set grew from %d → %d samples", len(X_train), len(X_resampled))
    return X_resampled, y_resampled


def get_splits(df: pd.DataFrame) -> tuple:
    """
    Apply feature engineering, stratified split, and SMOTE oversampling.
    Returns (X_train, X_test, y_train, y_test, feature_names).

    SMOTE is applied ONLY to the training set — the test set stays untouched
    so evaluation reflects real-world class distribution.
    """
    df = add_derived_features(df)

    y = df[config.TARGET_COLUMN]
    X = df.drop(columns=[config.TARGET_COLUMN])
    feature_names = list(X.columns)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=config.TEST_SIZE,
        random_state=config.RANDOM_STATE,
        stratify=y,
    )

    logger.info("Train size: %d | Test size: %d", len(X_train), len(X_test))
    logger.info("Train target distribution (original): %s", y_train.value_counts().sort_index().to_dict())
    logger.info("Test  target distribution: %s", y_test.value_counts().sort_index().to_dict())

    # Apply SMOTE to training data only
    if config.APPLY_SMOTE:
        X_train, y_train = apply_smote(X_train, y_train)

    return X_train, X_test, y_train, y_test, feature_names


if __name__ == "__main__":
    from .data_loader import load_raw_data
    from .preprocessing import run_preprocessing

    raw = load_raw_data()
    processed, _ = run_preprocessing(raw)
    X_train, X_test, y_train, y_test, feats = get_splits(processed)
    print("Features:", feats)
