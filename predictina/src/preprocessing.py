"""
predictina.preprocessing
Shared, picklable preprocessing utilities used by both training and inference.
"""

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler, FunctionTransformer


# ─────────────── feature column lists ────────────────────────────────
NUMERIC_FEATURES = ["surface", "rooms", "bathrooms", "floor", "total_floors", "year_built"]
BOOL_FEATURES    = ["parking", "has_garden", "has_pool"]
CAT_FEATURES     = ["location", "city", "property_type"]
TARGET           = "price"
ALL_FEATURES     = NUMERIC_FEATURES + BOOL_FEATURES + CAT_FEATURES


# ─────────────── picklable helper ────────────────────────────────────
def bool_to_float(X):
    """Cast boolean columns to float64 so SimpleImputer can handle them."""
    return np.array(X, dtype=np.float64)


# ─────────────── pipeline builder ────────────────────────────────────
def build_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
    ])
    bool_transformer = Pipeline([
        ("to_float", FunctionTransformer(bool_to_float)),
        ("imputer",  SimpleImputer(strategy="constant", fill_value=0)),
    ])
    cat_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num",  numeric_transformer, NUMERIC_FEATURES),
        ("bool", bool_transformer,    BOOL_FEATURES),
        ("cat",  cat_transformer,     CAT_FEATURES),
    ])


def build_full_pipeline(model) -> Pipeline:
    """Wrap a sklearn estimator in the full preprocessing + model pipeline."""
    return Pipeline([
        ("preprocessor", build_preprocessor()),
        ("model",        model),
    ])
