"""
Train and evaluate a CatBoost classifier.
CatBoost uses its native .cbm format for persistence.
"""

import numpy as np
from catboost import CatBoostClassifier

from . import config
from .data_loader import load_raw_data
from .evaluate import (
    compute_metrics,
    plot_confusion_matrix,
    plot_feature_importance,
    run_cross_validation,
    save_evaluation,
)
from .feature_engineering import get_splits
from .preprocessing import run_preprocessing
from .utils import ensure_dirs, get_logger

logger = get_logger(__name__)
MODEL_NAME = "CatBoost"


def train():
    ensure_dirs()
    logger.info("=" * 60)
    logger.info("Training %s", MODEL_NAME)
    logger.info("=" * 60)

    raw = load_raw_data()
    processed, _ = run_preprocessing(raw)
    X_train, X_test, y_train, y_test, feature_names = get_splits(processed)

    model = CatBoostClassifier(**config.CATBOOST_PARAMS)
    model.fit(X_train, y_train)
    logger.info("Training complete.")

    y_pred = model.predict(X_test)
    # CatBoost predict may return strings; ensure int
    y_pred = np.array(y_pred, dtype=int)
    metrics = compute_metrics(y_test, y_pred, MODEL_NAME)
    cv_results = run_cross_validation(model, X_train, y_train, MODEL_NAME)

    plot_confusion_matrix(y_test, y_pred, MODEL_NAME)
    plot_feature_importance(
        np.array(model.get_feature_importance()), feature_names, MODEL_NAME
    )

    # Save in native CatBoost format
    model_path = config.MODELS_DIR / "catboost" / "model.cbm"
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(str(model_path))
    logger.info("Saved CatBoost model → %s", model_path)
    save_evaluation(metrics, cv_results, MODEL_NAME)

    logger.info("%s pipeline finished.\n", MODEL_NAME)
    return model, metrics


if __name__ == "__main__":
    train()
