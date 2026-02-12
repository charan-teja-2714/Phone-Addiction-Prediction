"""
Smartphone Addiction Prediction — FastAPI Service
===================================================
Production-ready inference API serving the frozen CatBoost model.

Start with:
    uvicorn api.main:app --host 0.0.0.0 --port 8000    (from ml/ directory)
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .inference import predict
from .model_loader import Artifacts, load_artifacts
from .schemas import (
    HealthResponse,
    ModelInfoResponse,
    PredictionRequest,
    PredictionResponse,
)

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("api")

# ──────────────────────────────────────────────
# App
# ──────────────────────────────────────────────
app = FastAPI(
    title="Smartphone Addiction Prediction API",
    description="Predicts addiction level (Low / Moderate / High) from user behaviour features.",
    version="1.0.0",
)

# CORS — allow React Native / web front-ends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Startup — load once, serve forever
# ──────────────────────────────────────────────
artifacts: Artifacts | None = None


@app.on_event("startup")
def startup_event():
    global artifacts
    logger.info("Starting up — loading artifacts...")
    artifacts = load_artifacts()
    logger.info("Server ready.")


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info():
    return ModelInfoResponse(
        model="CatBoostClassifier",
        num_features=len(artifacts.feature_order),
        classes=artifacts.label_mapping,
    )


@app.post("/predict", response_model=PredictionResponse)
def predict_endpoint(request: PredictionRequest):
    return predict(request, artifacts)
