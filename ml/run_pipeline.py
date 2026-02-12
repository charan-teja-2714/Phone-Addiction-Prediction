"""
Master entry point — trains all four models sequentially and
generates the final comparison chart.

Usage:
    python -m ml.run_pipeline          (from project root)
    python run_pipeline.py             (from ml/ directory)
"""

import sys
from pathlib import Path

# Ensure the ml package is importable when running from the ml/ directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml.src.evaluate import plot_model_comparison
from ml.src.train_random_forest import train as train_rf
from ml.src.train_xgboost import train as train_xgb
from ml.src.train_lightgbm import train as train_lgbm
from ml.src.train_catboost import train as train_cb
from ml.src.utils import get_logger

logger = get_logger("run_pipeline")


def main():
    logger.info("=" * 70)
    logger.info("SMARTPHONE ADDICTION PREDICTION — FULL PIPELINE")
    logger.info("=" * 70)

    results = {}

    for name, trainer in [
        ("Random Forest", train_rf),
        ("XGBoost", train_xgb),
        ("LightGBM", train_lgbm),
        ("CatBoost", train_cb),
    ]:
        try:
            _, metrics = trainer()
            results[name] = metrics
        except Exception:
            logger.exception("Failed training %s", name)

    # Comparison chart
    plot_model_comparison()

    logger.info("=" * 70)
    logger.info("PIPELINE COMPLETE — Summary")
    logger.info("=" * 70)
    for name, m in results.items():
        logger.info(
            "  %-15s  Acc=%.4f  F1=%.4f",
            name,
            m["accuracy"],
            m["f1_macro"],
        )
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
