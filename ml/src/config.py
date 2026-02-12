"""
Central configuration for the Smartphone Addiction Prediction pipeline.
All paths, hyperparameters, and constants are defined here.
"""

from pathlib import Path

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent.parent

DATA_RAW_DIR = ROOT_DIR / "data" / "raw"
DATA_PROCESSED_DIR = ROOT_DIR / "data" / "processed"

RAW_DATASET_PATH = DATA_RAW_DIR / "primary_dataset.csv"
CLEANED_DATA_PATH = DATA_PROCESSED_DIR / "cleaned_data.csv"
TRAIN_READY_DATA_PATH = DATA_PROCESSED_DIR / "train_ready_data.csv"

MODELS_DIR = ROOT_DIR / "models"
METRICS_DIR = ROOT_DIR / "metrics"
PLOTS_DIR = ROOT_DIR / "plots"
LOGS_DIR = ROOT_DIR / "logs"

CONFUSION_MATRIX_DIR = PLOTS_DIR / "confusion_matrices"
FEATURE_IMPORTANCE_DIR = PLOTS_DIR / "feature_importance"
MODEL_COMPARISON_PATH = PLOTS_DIR / "model_comparison.png"

LOG_FILE = LOGS_DIR / "training.log"

# ──────────────────────────────────────────────
# Dataset
# ──────────────────────────────────────────────
TARGET_COLUMN = "Addiction_Level"

# Columns to drop if present (identifiers / non-predictive)
COLUMNS_TO_DROP = ["ID", "Name", "Location", "School_Grade"]

CATEGORICAL_COLUMNS = ["Gender", "Phone_Usage_Purpose"]

NUMERICAL_COLUMNS = [
    "Daily_Usage_Hours",
    "Sleep_Hours",
    "Academic_Performance",
    "Social_Interactions",
    "Exercise_Hours",
    "Anxiety_Level",
    "Depression_Level",
    "Self_Esteem",
    "Parental_Control",
    "Screen_Time_Before_Bed",
    "Phone_Checks_Per_Day",
    "Apps_Used_Daily",
    "Time_on_Social_Media",
    "Time_on_Gaming",
    "Time_on_Education",
    "Weekend_Usage_Hours",
]

# ──────────────────────────────────────────────
# Addiction-level binning thresholds
# ──────────────────────────────────────────────
# Dataset is right-skewed (median=10, mean=8.88), so thresholds are set
# to produce a usable class distribution:
#   Low  (<7):   ~14%  (419 samples)
#   Moderate (7–9): ~22%  (655 samples)
#   High (>=9):  ~64%  (1926 samples)
LOW_THRESHOLD = 7.0
HIGH_THRESHOLD = 9.0

CLASS_LABELS = {0: "Low Addiction", 1: "Moderate Addiction", 2: "High Addiction"}
CLASS_NAMES = ["Low Addiction", "Moderate Addiction", "High Addiction"]

# ──────────────────────────────────────────────
# Train / test split
# ──────────────────────────────────────────────
TEST_SIZE = 0.20
RANDOM_STATE = 42
CV_FOLDS = 5

# ──────────────────────────────────────────────
# SMOTE oversampling (applied to training set only)
# ──────────────────────────────────────────────
APPLY_SMOTE = True
SMOTE_RANDOM_STATE = RANDOM_STATE

# ──────────────────────────────────────────────
# Model hyperparameters
# ──────────────────────────────────────────────
RF_PARAMS = {
    "n_estimators": 300,
    "max_depth": 15,
    "min_samples_split": 5,
    "min_samples_leaf": 2,
    "random_state": RANDOM_STATE,
    "n_jobs": -1,
    "class_weight": "balanced",
}

XGB_PARAMS = {
    "n_estimators": 300,
    "max_depth": 8,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": RANDOM_STATE,
    "eval_metric": "mlogloss",
    "n_jobs": -1,
}

LGBM_PARAMS = {
    "n_estimators": 300,
    "max_depth": 10,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": RANDOM_STATE,
    "n_jobs": -1,
    "verbose": -1,
    "class_weight": "balanced",
}

CATBOOST_PARAMS = {
    "iterations": 300,
    "depth": 8,
    "learning_rate": 0.1,
    "random_seed": RANDOM_STATE,
    "verbose": 0,
    "auto_class_weights": "Balanced",
}
