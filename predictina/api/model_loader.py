"""MLflow model loading utilities for API inference."""

from __future__ import annotations

import logging
import os

import mlflow
import pandas as pd

LOGGER = logging.getLogger(__name__)


class PredictinaModelService:
    def __init__(self, model_name: str = "PredictinaHousePriceModel") -> None:
        self.model_name = model_name
        self._model = None

    def load(self) -> None:
        tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "file:./mlruns")
        mlflow.set_tracking_uri(tracking_uri)
        model_uri = f"models:/{self.model_name}/Production"
        LOGGER.info("Loading model from %s", model_uri)
        self._model = mlflow.pyfunc.load_model(model_uri)

    def predict(self, features: dict) -> float:
        if self._model is None:
            raise RuntimeError("Model is not loaded")

        frame = pd.DataFrame([features])
        frame["rooms_per_surface"] = frame["rooms"] / frame["surface"]
        frame["bathrooms_per_room"] = frame["bathrooms"] / frame["rooms"].replace(0, 1)
        frame["log_surface"] = frame["surface"].apply(lambda x: __import__("math").log1p(x))

        pred = self._model.predict(frame)
        return float(pred[0])
