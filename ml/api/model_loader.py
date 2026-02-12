"""
Loads all frozen artifacts at application startup.
Fails fast with clear messages if anything is missing.
All artifacts are read-only after loading — thread-safe for concurrent requests.
"""

import json
import logging
import sys
from dataclasses import dataclass, field

import joblib
from catboost import CatBoostClassifier

from . import config

logger = logging.getLogger("api.model_loader")


@dataclass(frozen=True)
class Artifacts:
    """Immutable container for all loaded artifacts."""
    model: CatBoostClassifier
    feature_order: list[str]
    label_mapping: dict[str, str]
    categorical_encodings: dict[str, dict[str, int]]
    derived_features: list[str]
    total_model_features: int


def _require_file(path, name: str):
    """Exit immediately if a required artifact file is missing."""
    if not path.exists():
        logger.critical("MISSING ARTIFACT: %s not found at %s", name, path)
        sys.exit(1)


def load_artifacts() -> Artifacts:
    """Load and validate every artifact. Called once at startup."""
    logger.info("Loading artifacts...")

    # 1. CatBoost model
    _require_file(config.MODEL_PATH, "CatBoost model")
    model = CatBoostClassifier()
    model.load_model(str(config.MODEL_PATH))
    logger.info("Loaded CatBoost model (%d trees)", model.tree_count_)

    # 2. Feature schema
    _require_file(config.FEATURE_SCHEMA_PATH, "Feature schema")
    with open(config.FEATURE_SCHEMA_PATH) as f:
        schema = json.load(f)
    feature_order = schema["features"]
    derived_features = schema["derived_features_added_at_inference"]
    total_model_features = schema["total_model_features"]
    logger.info("Feature schema: %d raw → %d total", len(feature_order), total_model_features)

    # 3. Label mapping
    _require_file(config.LABEL_MAPPING_PATH, "Label mapping")
    with open(config.LABEL_MAPPING_PATH) as f:
        label_mapping = json.load(f)
    logger.info("Label mapping: %s", label_mapping)

    # 4. Preprocessing metadata (categorical encodings)
    _require_file(config.METADATA_PATH, "Preprocessing metadata")
    with open(config.METADATA_PATH) as f:
        metadata = json.load(f)
    categorical_encodings = metadata["categorical_encodings"]
    logger.info("Categorical encodings loaded for: %s", list(categorical_encodings.keys()))

    artifacts = Artifacts(
        model=model,
        feature_order=feature_order,
        label_mapping=label_mapping,
        categorical_encodings=categorical_encodings,
        derived_features=derived_features,
        total_model_features=total_model_features,
    )
    logger.info("All artifacts loaded successfully.")
    return artifacts
