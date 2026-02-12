"""
Evaluation utilities shared by all training scripts:
  - Classification metrics (accuracy, precision, recall, F1)
  - Cross-validation
  - Confusion-matrix plotting
  - Feature-importance plotting
  - Model comparison chart
"""

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score

from . import config
from .utils import get_logger, save_metrics

logger = get_logger(__name__)


def compute_metrics(y_true, y_pred, model_name: str) -> dict:
    """Compute and return classification metrics as a dict."""
    metrics = {
        "model": model_name,
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision_macro": round(precision_score(y_true, y_pred, average="macro", zero_division=0), 4),
        "recall_macro": round(recall_score(y_true, y_pred, average="macro", zero_division=0), 4),
        "f1_macro": round(f1_score(y_true, y_pred, average="macro", zero_division=0), 4),
        "classification_report": classification_report(
            y_true, y_pred, target_names=config.CLASS_NAMES, output_dict=True, zero_division=0
        ),
    }
    logger.info(
        "%s — Accuracy: %.4f | Precision: %.4f | Recall: %.4f | F1: %.4f",
        model_name,
        metrics["accuracy"],
        metrics["precision_macro"],
        metrics["recall_macro"],
        metrics["f1_macro"],
    )
    return metrics


def run_cross_validation(model, X, y, model_name: str) -> dict:
    """Run stratified k-fold CV and return summary statistics."""
    skf = StratifiedKFold(n_splits=config.CV_FOLDS, shuffle=True, random_state=config.RANDOM_STATE)
    scores = cross_val_score(model, X, y, cv=skf, scoring="f1_macro", n_jobs=-1)
    cv_results = {
        "cv_folds": config.CV_FOLDS,
        "cv_f1_scores": [round(s, 4) for s in scores],
        "cv_f1_mean": round(scores.mean(), 4),
        "cv_f1_std": round(scores.std(), 4),
    }
    logger.info(
        "%s — CV F1 (macro): %.4f ± %.4f",
        model_name,
        cv_results["cv_f1_mean"],
        cv_results["cv_f1_std"],
    )
    return cv_results


def plot_confusion_matrix(y_true, y_pred, model_name: str) -> Path:
    """Save a confusion-matrix heatmap and return its path."""
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(7, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=config.CLASS_NAMES,
        yticklabels=config.CLASS_NAMES,
        ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix — {model_name}")
    plt.tight_layout()

    path = config.CONFUSION_MATRIX_DIR / f"{model_name.lower().replace(' ', '_')}_cm.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    logger.info("Saved confusion matrix → %s", path)
    return path


def plot_feature_importance(importances, feature_names, model_name: str, top_n: int = 15) -> Path:
    """Save a horizontal bar chart of top-N feature importances."""
    indices = np.argsort(importances)[::-1][:top_n]
    top_features = [feature_names[i] for i in indices]
    top_importances = importances[indices]

    fig, ax = plt.subplots(figsize=(9, 6))
    ax.barh(range(len(top_features)), top_importances[::-1], color="steelblue")
    ax.set_yticks(range(len(top_features)))
    ax.set_yticklabels(top_features[::-1])
    ax.set_xlabel("Importance")
    ax.set_title(f"Feature Importance — {model_name}")
    plt.tight_layout()

    path = config.FEATURE_IMPORTANCE_DIR / f"{model_name.lower().replace(' ', '_')}_fi.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    logger.info("Saved feature importance plot → %s", path)
    return path


def save_evaluation(metrics: dict, cv_results: dict, model_name: str) -> Path:
    """Merge metrics + CV results and write to JSON."""
    combined = {**metrics, **cv_results}
    # Make classification_report JSON-safe (already a dict)
    filename = f"{model_name.lower().replace(' ', '_')}_metrics.json"
    path = config.METRICS_DIR / filename
    save_metrics(combined, path)
    logger.info("Saved metrics → %s", path)
    return path


def plot_model_comparison() -> Path:
    """Read all *_metrics.json files and create a grouped bar chart."""
    metric_files = sorted(config.METRICS_DIR.glob("*_metrics.json"))
    if not metric_files:
        logger.warning("No metric files found — skipping comparison plot.")
        return config.MODEL_COMPARISON_PATH

    models, accuracies, precisions, recalls, f1s = [], [], [], [], []
    for f in metric_files:
        with open(f) as fp:
            m = json.load(fp)
        models.append(m["model"])
        accuracies.append(m["accuracy"])
        precisions.append(m["precision_macro"])
        recalls.append(m["recall_macro"])
        f1s.append(m["f1_macro"])

    x = np.arange(len(models))
    width = 0.2

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.bar(x - 1.5 * width, accuracies, width, label="Accuracy", color="#4C72B0")
    ax.bar(x - 0.5 * width, precisions, width, label="Precision", color="#55A868")
    ax.bar(x + 0.5 * width, recalls, width, label="Recall", color="#C44E52")
    ax.bar(x + 1.5 * width, f1s, width, label="F1-score", color="#8172B2")

    ax.set_xticks(x)
    ax.set_xticklabels(models, rotation=15, ha="right")
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score")
    ax.set_title("Model Comparison — Smartphone Addiction Prediction")
    ax.legend()
    plt.tight_layout()

    config.MODEL_COMPARISON_PATH.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(config.MODEL_COMPARISON_PATH, dpi=150)
    plt.close(fig)
    logger.info("Saved model comparison plot → %s", config.MODEL_COMPARISON_PATH)
    return config.MODEL_COMPARISON_PATH
