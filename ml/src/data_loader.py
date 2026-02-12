"""
Load the raw CSV, drop identifier columns, and perform initial validation.
"""

import pandas as pd

from . import config
from .utils import get_logger

logger = get_logger(__name__)


def load_raw_data(path=None) -> pd.DataFrame:
    """Read the primary dataset and drop identifier columns."""
    path = path or config.RAW_DATASET_PATH
    logger.info("Loading raw dataset from %s", path)
    df = pd.read_csv(path)
    logger.info("Raw shape: %s", df.shape)

    # Drop identifier / non-predictive columns if present
    cols_to_drop = [c for c in config.COLUMNS_TO_DROP if c in df.columns]
    if cols_to_drop:
        df.drop(columns=cols_to_drop, inplace=True)
        logger.info("Dropped identifier columns: %s", cols_to_drop)

    # Validate that the target column exists
    if config.TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{config.TARGET_COLUMN}' not found in dataset.")

    logger.info("Columns after cleanup: %s", list(df.columns))
    return df


if __name__ == "__main__":
    df = load_raw_data()
    print(df.head())
    print(df.info())
