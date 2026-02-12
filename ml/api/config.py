"""
API configuration — all paths resolve relative to the ml/ project root.
"""

from pathlib import Path

# ml/ root (one level above api/)
ML_ROOT = Path(__file__).resolve().parent.parent

# Frozen artifacts
MODEL_PATH = ML_ROOT / "models" / "catboost" / "model.cbm"
FEATURE_SCHEMA_PATH = ML_ROOT / "models" / "feature_schema.json"
LABEL_MAPPING_PATH = ML_ROOT / "models" / "label_mapping.json"
ENCODERS_PATH = ML_ROOT / "artifacts" / "encoders.pkl"
METADATA_PATH = ML_ROOT / "artifacts" / "preprocessing_metadata.json"

# Server
HOST = "0.0.0.0"
PORT = 8000
