"""Reusable sklearn transformers and full model pipeline builder for Predictina."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


@dataclass(frozen=True)
class FeatureSchema:
    numeric_features: tuple[str, ...]
    categorical_features: tuple[str, ...]
    boolean_features: tuple[str, ...]


class FeatureBuilder(BaseEstimator, TransformerMixin):
    """Create deterministic features and default values used at train/inference time."""

    def __init__(self, schema: FeatureSchema):
        self.schema = schema
        self.default_year_built_ = 2000.0

    def fit(self, X: pd.DataFrame, y: pd.Series | None = None) -> "FeatureBuilder":
        frame = X.copy()
        year_series = pd.to_numeric(frame.get("year_built"), errors="coerce")
        if not year_series.dropna().empty:
            self.default_year_built_ = float(year_series.median())
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        frame = X.copy()

        for col in self.schema.numeric_features:
            frame[col] = pd.to_numeric(frame[col], errors="coerce") if col in frame else np.nan

        for col in self.schema.boolean_features:
            frame[col] = self._to_bool(frame[col]) if col in frame else False
            frame[col] = frame[col].fillna(False).astype(bool)

        for col in self.schema.categorical_features:
            if col not in frame:
                frame[col] = "unknown"
            frame[col] = frame[col].fillna("unknown").astype(str)

        frame["bathrooms"] = frame["bathrooms"].where(frame["bathrooms"].notna(), frame["rooms"] / 2)
        frame["floor"] = frame["floor"].where(frame["floor"].notna(), frame["total_floors"] / 2)
        frame["year_built"] = frame["year_built"].fillna(self.default_year_built_)

        frame["surface"] = frame["surface"].mask(frame["surface"] <= 0, np.nan)
        frame["rooms"] = frame["rooms"].mask(frame["rooms"] <= 0, np.nan)

        frame["rooms_per_surface"] = frame["rooms"] / frame["surface"].replace(0, np.nan)
        frame["bathrooms_per_room"] = frame["bathrooms"] / frame["rooms"].replace(0, np.nan)
        frame["log_surface"] = np.log1p(frame["surface"])
        frame["building_density"] = frame["total_floors"] / (frame["floor"] + 1)
        frame["property_age"] = 2026 - frame["year_built"]

        return frame.replace([np.inf, -np.inf], np.nan)

    @staticmethod
    def _to_bool(series: pd.Series) -> pd.Series:
        as_str = series.astype(str).str.strip().str.lower()
        return as_str.isin({"1", "true", "yes", "y", "oui", "vrai"})


class SkewAwareNumericImputer(BaseEstimator, TransformerMixin):
    """Impute numerics with mean/median depending on skewness."""

    def __init__(self, skew_threshold: float = 1.0):
        self.skew_threshold = skew_threshold
        self.fill_values_: dict[str, float] = {}

    def fit(self, X: pd.DataFrame, y: pd.Series | None = None) -> "SkewAwareNumericImputer":
        frame = pd.DataFrame(X)
        self.fill_values_.clear()
        for col in frame.columns:
            series = pd.to_numeric(frame[col], errors="coerce")
            if series.dropna().empty:
                self.fill_values_[col] = 0.0
                continue
            skewness = float(series.skew()) if series.dropna().shape[0] > 2 else 0.0
            if abs(skewness) >= self.skew_threshold:
                self.fill_values_[col] = float(series.median())
            else:
                self.fill_values_[col] = float(series.mean())
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        frame = pd.DataFrame(X).copy()
        for col, fill_val in self.fill_values_.items():
            frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(fill_val)
        return frame


def build_preprocessor(
    numeric_features: Iterable[str],
    categorical_features: Iterable[str],
    boolean_features: Iterable[str],
) -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("skew_imputer", SkewAwareNumericImputer()),
            ("final_imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    bool_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value=False)),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, list(numeric_features)),
            ("categorical", categorical_pipeline, list(categorical_features)),
            ("boolean", bool_pipeline, list(boolean_features)),
        ]
    )


def build_training_pipeline(
    regressor: BaseEstimator,
    schema: FeatureSchema,
    model_numeric_features: Iterable[str],
    model_categorical_features: Iterable[str],
    model_boolean_features: Iterable[str],
) -> Pipeline:
    return Pipeline(
        steps=[
            ("feature_builder", FeatureBuilder(schema=schema)),
            (
                "preprocessor",
                build_preprocessor(
                    numeric_features=model_numeric_features,
                    categorical_features=model_categorical_features,
                    boolean_features=model_boolean_features,
                ),
            ),
            ("regressor", regressor),
        ]
    )
