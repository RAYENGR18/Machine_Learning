"""Preprocessing and feature engineering pipeline for Predictina."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


TARGET_COL = "price_tnd"


@dataclass
class DatasetConfig:
    target_col: str = TARGET_COL
    numeric_features: tuple[str, ...] = ("surface", "rooms", "bathrooms")
    categorical_features: tuple[str, ...] = ("location",)


def _parse_price_to_tnd(value: str | float | int) -> float:
    if pd.isna(value):
        return np.nan
    text = str(value).strip().replace("\u202f", " ").replace(",", "")
    if "Prix à consulter" in text:
        return np.nan

    number = re.findall(r"[\d.]+", text)
    if not number:
        return np.nan
    amount = float(number[0])

    if "EUR" in text.upper():
        return amount * 3.37
    return amount


def clean_raw_data(df_raw: pd.DataFrame) -> pd.DataFrame:
    """Clean raw scraped data and keep modeling columns only."""
    df = df_raw.copy()

    if "transaction_type" in df:
        df = df[df["transaction_type"].str.lower().eq("sale")]

    if "property_type" in df:
        excluded_types = {"land", "terrain"}
        df = df[~df["property_type"].str.lower().isin(excluded_types)]

    df[TARGET_COL] = df["price"].apply(_parse_price_to_tnd)

    if "location_details" in df.columns:
        def extract_city(raw: str) -> str:
            if pd.isna(raw):
                return "Unknown"
            try:
                payload = json.loads(raw)
                return payload.get("city") or payload.get("municipality") or "Unknown"
            except Exception:
                return "Unknown"

        df["location"] = df["location_details"].apply(extract_city)
    elif "municipality" in df.columns:
        df["location"] = df["municipality"].fillna("Unknown")
    else:
        df["location"] = "Unknown"

    for numeric_col in ("surface", "rooms", "bathrooms"):
        if numeric_col not in df.columns:
            df[numeric_col] = np.nan
        df[numeric_col] = pd.to_numeric(df[numeric_col], errors="coerce")

    df["surface"] = df["surface"].replace(0, np.nan)
    df["rooms"] = df["rooms"].replace(0, np.nan)

    df = df.dropna(subset=[TARGET_COL])
    df = df[df[TARGET_COL] > 0]

    kept_cols = ["surface", "rooms", "bathrooms", "location", TARGET_COL]
    return df[kept_cols].reset_index(drop=True)


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create deterministic features used in both training and serving."""
    feat_df = df.copy()
    feat_df["rooms_per_surface"] = feat_df["rooms"] / feat_df["surface"].replace(0, np.nan)
    feat_df["bathrooms_per_room"] = feat_df["bathrooms"] / feat_df["rooms"].replace(0, np.nan)
    feat_df["log_surface"] = np.log1p(feat_df["surface"])
    feat_df = feat_df.replace([np.inf, -np.inf], np.nan)
    return feat_df


def build_preprocessing_pipeline(numeric_features: Iterable[str], categorical_features: Iterable[str]) -> ColumnTransformer:
    """Build sklearn ColumnTransformer used for all model candidates."""
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("one_hot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, list(numeric_features)),
            ("categorical", categorical_pipeline, list(categorical_features)),
        ]
    )


def get_feature_lists() -> tuple[list[str], list[str]]:
    numeric = ["surface", "rooms", "bathrooms", "rooms_per_surface", "bathrooms_per_room", "log_surface"]
    categorical = ["location"]
    return numeric, categorical
