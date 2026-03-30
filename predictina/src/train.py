"""Training entrypoint with MLflow tracking and model registry."""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

import matplotlib.pyplot as plt
import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from mlflow.models.signature import infer_signature
from mlflow.tracking import MlflowClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from evaluate import evaluate_regression
from preprocessing import (
    TARGET_COL,
    add_engineered_features,
    build_preprocessing_pipeline,
    clean_raw_data,
    get_feature_lists,
)
from utils import ensure_dir, save_json, setup_logging

LOGGER = logging.getLogger(__name__)


def _candidate_models(random_state: int = 42) -> dict[str, object]:
    models: dict[str, object] = {
        "random_forest": RandomForestRegressor(
            n_estimators=350,
            max_depth=20,
            min_samples_split=4,
            random_state=random_state,
            n_jobs=-1,
        )
    }

    try:
        from xgboost import XGBRegressor

        models["xgboost"] = XGBRegressor(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.85,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=random_state,
        )
    except Exception as exc:
        LOGGER.warning("XGBoost unavailable: %s", exc)

    try:
        from lightgbm import LGBMRegressor

        models["lightgbm"] = LGBMRegressor(
            n_estimators=500,
            learning_rate=0.05,
            max_depth=-1,
            num_leaves=31,
            subsample=0.85,
            colsample_bytree=0.9,
            random_state=random_state,
        )
    except Exception as exc:
        LOGGER.warning("LightGBM unavailable: %s", exc)

    return models


def _plot_model_comparison(scores_df: pd.DataFrame, out_dir: Path) -> Path:
    plot_path = out_dir / "model_comparison_rmse.png"
    order_df = scores_df.sort_values("rmse")

    plt.figure(figsize=(8, 4))
    plt.bar(order_df["model_name"], order_df["rmse"], color="#334155")
    plt.ylabel("RMSE")
    plt.xlabel("Model")
    plt.title("Model comparison (lower is better)")
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)
    plt.close()
    return plot_path


def _plot_feature_importance(model_pipeline: Pipeline, out_dir: Path, model_name: str) -> Path | None:
    reg = model_pipeline.named_steps["regressor"]
    if not hasattr(reg, "feature_importances_"):
        return None

    preprocessor = model_pipeline.named_steps["preprocessor"]
    try:
        feature_names = preprocessor.get_feature_names_out()
    except Exception:
        feature_names = np.array([f"feature_{i}" for i in range(len(reg.feature_importances_))])

    importance = np.asarray(reg.feature_importances_)
    order = np.argsort(importance)[-15:]

    plt.figure(figsize=(9, 5))
    plt.barh(np.array(feature_names)[order], importance[order], color="#10b981")
    plt.title(f"Top Feature Importances - {model_name}")
    plt.tight_layout()

    out_path = out_dir / f"feature_importance_{model_name}.png"
    plt.savefig(out_path, dpi=150)
    plt.close()
    return out_path


def run_training(data_path: str, experiment_name: str, model_name: str) -> None:
    setup_logging()
    ensure_dir("models")
    ensure_dir("mlruns")

    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "file:./mlruns"))
    mlflow.set_experiment(experiment_name)

    df_raw = pd.read_csv(data_path)
    df = clean_raw_data(df_raw)
    df = add_engineered_features(df)

    numeric_features, categorical_features = get_feature_lists()
    X = df[numeric_features + categorical_features]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    candidates = _candidate_models()
    if not candidates:
        raise RuntimeError("No model backends available. Install at least one model package.")

    artifacts_dir = ensure_dir("models/artifacts")
    scores = []

    with mlflow.start_run(run_name="model_selection") as parent_run:
        mlflow.log_params(
            {
                "n_rows": len(df),
                "n_features": X.shape[1],
                "test_size": 0.2,
                "random_state": 42,
            }
        )

        best_rmse = float("inf")
        best_model = None
        best_model_key = ""

        for key, regressor in candidates.items():
            with mlflow.start_run(run_name=key, nested=True):
                preprocessor = build_preprocessing_pipeline(numeric_features, categorical_features)
                model_pipeline = Pipeline(
                    steps=[
                        ("preprocessor", preprocessor),
                        ("regressor", regressor),
                    ]
                )

                model_pipeline.fit(X_train, y_train)
                preds = model_pipeline.predict(X_test)
                metrics = evaluate_regression(y_test.to_numpy(), preds)

                model_params = regressor.get_params()
                mlflow.log_params({f"{key}__{k}": v for k, v in model_params.items() if isinstance(v, (int, float, str, bool))})
                mlflow.log_metrics({"rmse": metrics.rmse, "mae": metrics.mae, "r2": metrics.r2})

                signature = infer_signature(X_train, model_pipeline.predict(X_train.head(3)))
                mlflow.sklearn.log_model(model_pipeline, artifact_path="model", signature=signature)

                fi_path = _plot_feature_importance(model_pipeline, artifacts_dir, key)
                if fi_path is not None:
                    mlflow.log_artifact(str(fi_path), artifact_path="plots")

                scores.append({"model_name": key, "rmse": metrics.rmse, "mae": metrics.mae, "r2": metrics.r2})
                if metrics.rmse < best_rmse:
                    best_rmse = metrics.rmse
                    best_model = model_pipeline
                    best_model_key = key

        if best_model is None:
            raise RuntimeError("Training failed; best model is None.")

        score_df = pd.DataFrame(scores)
        score_path = artifacts_dir / "model_scores.csv"
        score_df.to_csv(score_path, index=False)
        mlflow.log_artifact(str(score_path), artifact_path="metrics")

        chart_path = _plot_model_comparison(score_df, artifacts_dir)
        mlflow.log_artifact(str(chart_path), artifact_path="plots")

        mlflow.log_metric("best_rmse", best_rmse)
        mlflow.log_param("best_model", best_model_key)

        final_signature = infer_signature(X_train, best_model.predict(X_train.head(3)))
        model_info = mlflow.sklearn.log_model(
            sk_model=best_model,
            artifact_path="best_model",
            registered_model_name=model_name,
            signature=final_signature,
        )

        save_json(
            {
                "parent_run_id": parent_run.info.run_id,
                "best_model": best_model_key,
                "best_rmse": best_rmse,
                "registered_model_uri": model_info.model_uri,
            },
            artifacts_dir / "training_summary.json",
        )

    client = MlflowClient()
    latest_versions = client.get_latest_versions(model_name)
    if latest_versions:
        best_version = sorted(latest_versions, key=lambda x: int(x.version))[-1]
        client.transition_model_version_stage(
            name=model_name,
            version=best_version.version,
            stage="Production",
            archive_existing_versions=True,
        )
        LOGGER.info("Model %s version %s promoted to Production", model_name, best_version.version)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Predictina models with MLflow tracking")
    parser.add_argument("--data-path", default="data/house_pricing_raw.csv")
    parser.add_argument("--experiment-name", default="predictina-house-prices")
    parser.add_argument("--model-name", default="PredictinaHousePriceModel")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_training(data_path=args.data_path, experiment_name=args.experiment_name, model_name=args.model_name)
