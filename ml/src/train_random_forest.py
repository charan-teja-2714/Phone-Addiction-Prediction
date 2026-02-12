"""
Train and evaluate a Random Forest classifier.
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier

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
from .utils import ensure_dirs, get_logger, save_model

logger = get_logger(__name__)
MODEL_NAME = "Random Forest"


def train():
    ensure_dirs()
    logger.info("=" * 60)
    logger.info("Training %s", MODEL_NAME)
    logger.info("=" * 60)

    # Data pipeline
    raw = load_raw_data()
    processed, _ = run_preprocessing(raw)
    X_train, X_test, y_train, y_test, feature_names = get_splits(processed)

    # Train
    model = RandomForestClassifier(**config.RF_PARAMS)
    model.fit(X_train, y_train)
    logger.info("Training complete.")

    # Evaluate
    y_pred = model.predict(X_test)
    metrics = compute_metrics(y_test, y_pred, MODEL_NAME)
    cv_results = run_cross_validation(model, X_train, y_train, MODEL_NAME)

    # Plots
    plot_confusion_matrix(y_test, y_pred, MODEL_NAME)
    plot_feature_importance(
        np.array(model.feature_importances_), feature_names, MODEL_NAME
    )

    # Persist
    model_path = config.MODELS_DIR / "random_forest" / "model.pkl"
    save_model(model, model_path)
    save_evaluation(metrics, cv_results, MODEL_NAME)

    logger.info("%s pipeline finished.\n", MODEL_NAME)
    return model, metrics


if __name__ == "__main__":
    train()
