"""
Predictina – FastAPI backend
Loads the saved sklearn Pipeline and serves predictions.
All fields are optional: missing values are filled with smart dataset defaults.

Start:
    uvicorn api.main:app --reload --port 8000
"""

import os
import sys
import joblib
import pandas as pd
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── make src/ importable ───────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "src"))

# ─────────────────────────────── paths ────────────────────────────────
MODEL_PATH = os.path.join(BASE_DIR, "models", "best_pipeline.pkl")
META_PATH  = os.path.join(BASE_DIR, "models", "feature_meta.pkl")

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(
        f"Model not found at {MODEL_PATH}.\n"
        "Run:  python src/train.py"
    )

pipeline     = joblib.load(MODEL_PATH)
feature_meta = joblib.load(META_PATH)

NUMERIC_FEATURES = feature_meta["numeric_features"]
BOOL_FEATURES    = feature_meta["bool_features"]
CAT_FEATURES     = feature_meta["cat_features"]
ALL_FEATURES     = feature_meta["all_features"]
MEDIANS          = feature_meta["medians"]
MODES            = feature_meta["modes"]

# ─────────────────────────── app setup ────────────────────────────────
app = FastAPI(
    title="Predictina API",
    description="House price prediction for Tunisia 🇹🇳 — all fields optional",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────── request schema ────────────────────────────
class PredictRequest(BaseModel):
    # Numeric – optional, fills with dataset median
    surface:      Optional[float] = Field(None, description="Surface area m²")
    rooms:        Optional[int]   = Field(None, description="Number of rooms")
    bathrooms:    Optional[int]   = Field(None, description="Number of bathrooms")
    floor:        Optional[int]   = Field(None, description="Floor number")
    total_floors: Optional[int]   = Field(None, description="Total floors in building")
    year_built:   Optional[int]   = Field(None, description="Year built")

    # Boolean – optional, defaults to False
    parking:    Optional[bool] = Field(None, description="Has parking")
    has_garden: Optional[bool] = Field(None, description="Has garden")
    has_pool:   Optional[bool] = Field(None, description="Has swimming pool")

    # Categorical – optional, fills with most-frequent value
    location:      Optional[str] = Field(None, description="Neighbourhood / sub-city")
    city:          Optional[str] = Field(None, description="City (e.g. Tunis, Sfax)")
    property_type: Optional[str] = Field(None, description="apartment | house | villa")

    model_config = {
        "json_schema_extra": {
            "example": {
                "surface": 120,
                "rooms": 3,
                "city": "Tunis",
                "property_type": "apartment",
            }
        }
    }


# ──────────────────────────── helpers ────────────────────────────────
def fill_defaults(req: PredictRequest) -> dict:
    """Return a complete feature dict, filling None with smart defaults."""
    row = {}
    for col in NUMERIC_FEATURES:
        val = getattr(req, col)
        row[col] = float(val) if val is not None else MEDIANS[col]
    for col in BOOL_FEATURES:
        val = getattr(req, col)
        row[col] = bool(val) if val is not None else False
    for col in CAT_FEATURES:
        val = getattr(req, col)
        row[col] = str(val) if val is not None else MODES[col]
    return row


# ────────────────────────────── routes ───────────────────────────────
@app.get("/")
def root():
    return {"app": "Predictina", "version": "2.0", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}


@app.get("/meta")
def meta():
    """Return dataset metadata (cities, types, medians) for frontend use."""
    return {
        "numeric_features": NUMERIC_FEATURES,
        "bool_features":    BOOL_FEATURES,
        "cat_features":     CAT_FEATURES,
        "feature_medians":  MEDIANS,
        "feature_modes":    MODES,
        "cities":           ["Tunis","Sousse","Sfax","Bizerte","Nabeul",
                             "Monastir","Hammamet","Kairouan","Gafsa","Gabès","Tataouine"],
        "property_types":   ["apartment", "house", "villa"],
    }


@app.post("/predict")
def predict(req: PredictRequest):
    """
    Predict house price in TND.
    All fields are optional — missing values are filled with smart defaults.
    """
    try:
        row    = fill_defaults(req)
        df_row = pd.DataFrame([row])[ALL_FEATURES]
        price  = float(pipeline.predict(df_row)[0])

        provided = {k: v for k, v in req.model_dump().items() if v is not None}
        defaults = {k: row[k] for k in ALL_FEATURES if k not in provided}

        return {
            "predicted_price_TND": round(price, 2),
            "input_provided":      provided,
            "defaults_applied":    defaults,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/predict/batch")
def predict_batch(requests: list[PredictRequest]):
    """Batch predictions — up to 100 properties at once."""
    if len(requests) > 100:
        raise HTTPException(status_code=400, detail="Batch limit is 100 items.")
    results = []
    for req in requests:
        row    = fill_defaults(req)
        df_row = pd.DataFrame([row])[ALL_FEATURES]
        price  = float(pipeline.predict(df_row)[0])
        results.append({"predicted_price_TND": round(price, 2)})
    return results
