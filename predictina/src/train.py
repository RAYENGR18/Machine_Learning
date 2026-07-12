"""
Predictina – House Price Prediction (Tunisia)
Full ML training pipeline with MLflow tracking.

Run:
    python src/train.py
"""

import os
import sys
import warnings
import joblib
import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor

import xgboost as xgb
import lightgbm as lgb

# ── make src/ importable when run as a script ──
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preprocessing import (
    NUMERIC_FEATURES, BOOL_FEATURES, CAT_FEATURES,
    ALL_FEATURES, TARGET, build_full_pipeline
)

warnings.filterwarnings("ignore")

# ─────────────────────────────── paths ────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "fidari.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MLFLOW_DB_PATH = os.path.join(BASE_DIR, "mlflow.db")
mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB_PATH}")
mlflow.set_experiment("predictina_house_prices")


# ─────────────────────────────── metrics ──────────────────────────────
def evaluate(pipeline, X, y, split: str = "test") -> dict:
    preds = pipeline.predict(X)
    rmse  = np.sqrt(mean_squared_error(y, preds))
    mae   = mean_absolute_error(y, preds)
    r2    = r2_score(y, preds)
    print(f"  [{split}] RMSE={rmse:,.0f}  MAE={mae:,.0f}  R2={r2:.4f}")
    return {"rmse": rmse, "mae": mae, "r2": r2}


# ──────────────────────────────── train ───────────────────────────────
def train():
    print("Loading dataset …")
    df = pd.read_csv(DATA_PATH)

    for col in BOOL_FEATURES:
        df[col] = df[col].astype(bool)

    X = df[ALL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)}  Test: {len(X_test)}")

    candidates = {
        "RandomForest": build_full_pipeline(
            RandomForestRegressor(
                n_estimators=300, max_depth=None,
                min_samples_leaf=2, n_jobs=-1, random_state=42
            )
        ),
        "XGBoost": build_full_pipeline(
            xgb.XGBRegressor(
                n_estimators=400, learning_rate=0.05, max_depth=6,
                subsample=0.8, colsample_bytree=0.8,
                n_jobs=-1, random_state=42, verbosity=0
            )
        ),
        "LightGBM": build_full_pipeline(
            lgb.LGBMRegressor(
                n_estimators=400, learning_rate=0.05, num_leaves=63,
                subsample=0.8, colsample_bytree=0.8,
                n_jobs=-1, random_state=42, verbose=-1
            )
        ),
    }

    best_name, best_r2, best_pipeline = None, -1.0, None

    for name, pipeline in candidates.items():
        print(f"\nTraining {name} …")
        with mlflow.start_run(run_name=name):
            pipeline.fit(X_train, y_train)

            train_m = evaluate(pipeline, X_train, y_train, "train")
            test_m  = evaluate(pipeline, X_test,  y_test,  "test")

            mlflow.log_params({"model": name, "train_size": len(X_train), "test_size": len(X_test)})
            mlflow.log_metrics({
                "train_rmse": train_m["rmse"], "train_mae": train_m["mae"], "train_r2": train_m["r2"],
                "test_rmse":  test_m["rmse"],  "test_mae":  test_m["mae"],  "test_r2":  test_m["r2"],
            })
            mlflow.sklearn.log_model(
                pipeline, artifact_path="pipeline",
                registered_model_name=f"predictina_{name.lower()}"
            )

            if test_m["r2"] > best_r2:
                best_r2, best_name, best_pipeline = test_m["r2"], name, pipeline

    # ── persist ──────────────────────────────────────────────────────
    best_path = os.path.join(MODEL_DIR, "best_pipeline.pkl")
    meta_path = os.path.join(MODEL_DIR, "feature_meta.pkl")

    joblib.dump(best_pipeline, best_path)
    joblib.dump({
        "numeric_features": NUMERIC_FEATURES,
        "bool_features":    BOOL_FEATURES,
        "cat_features":     CAT_FEATURES,
        "all_features":     ALL_FEATURES,
        "target":           TARGET,
        "medians": {c: float(df[c].median()) for c in NUMERIC_FEATURES},
        "modes":   {c: str(df[c].mode()[0])  for c in CAT_FEATURES},
    }, meta_path)

    print(f"\nBest model : {best_name}  (R2={best_r2:.4f})")
    print(f"   Pipeline : {best_path}")
    print(f"   Meta     : {meta_path}")

    print("\nLocation impact (100m2 apartment, 3 rooms):")
    for city in ["Tunis", "Sousse", "Sfax", "Tataouine"]:
        sample = pd.DataFrame([{
            "surface": 100, "rooms": 3, "bathrooms": 1,
            "floor": 2, "total_floors": 5, "year_built": 2010,
            "parking": False, "has_garden": False, "has_pool": False,
            "location": city, "city": city, "property_type": "apartment",
        }])
        pred = best_pipeline.predict(sample)[0]
        print(f"   {city:<12}: {pred:>12,.0f} TND")


if __name__ == "__main__":
    train()
