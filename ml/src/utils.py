"""
Shared utility helpers: logging, serialisation, directory creation.
"""

import json
import logging
from pathlib import Path

import joblib

from . import config


def get_logger(name: str = "ml_pipeline") -> logging.Logger:
    """Return a logger that writes to both console and the log file."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    # File handler
    config.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(config.LOG_FILE, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    return logger


def ensure_dirs() -> None:
    """Create every output directory referenced in config (idempotent)."""
    for d in [
        config.DATA_RAW_DIR,
        config.DATA_PROCESSED_DIR,
        config.MODELS_DIR,
        config.METRICS_DIR,
        config.PLOTS_DIR,
        config.CONFUSION_MATRIX_DIR,
        config.FEATURE_IMPORTANCE_DIR,
        config.LOGS_DIR,
    ]:
        d.mkdir(parents=True, exist_ok=True)


def save_model(model, path: Path) -> None:
    """Persist a trained model with joblib."""
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)


def load_model(path: Path):
    """Load a persisted model."""
    return joblib.load(path)


def save_metrics(metrics: dict, path: Path) -> None:
    """Write evaluation metrics to a JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(metrics, f, indent=2)


def load_metrics(path: Path) -> dict:
    """Read evaluation metrics from a JSON file."""
    with open(path) as f:
        return json.load(f)
