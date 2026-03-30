"""FastAPI entrypoint for Predictina house-price predictions."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException

from model_loader import PredictinaModelService
from schema import PredictionRequest, PredictionResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
LOGGER = logging.getLogger(__name__)

app = FastAPI(title="Predictina API", version="1.0.0")
service = PredictinaModelService()


@app.on_event("startup")
def startup_event() -> None:
    try:
        service.load()
        LOGGER.info("Prediction model loaded successfully.")
    except Exception as exc:
        LOGGER.exception("Failed loading prediction model: %s", exc)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest) -> PredictionResponse:
    try:
        prediction = service.predict(payload.dict())
        return PredictionResponse(predicted_price=round(prediction, 2))
    except Exception as exc:
        LOGGER.exception("Prediction error: %s", exc)
        raise HTTPException(status_code=500, detail="Prediction failed") from exc
