"""Data cleaning and feature definitions for Predictina."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

import numpy as np
import pandas as pd

TARGET_COL = "price_tnd"


@dataclass(frozen=True)
class DatasetConfig:
    target_col: str = TARGET_COL
    numeric_features: tuple[str, ...] = (
        "surface",
        "rooms",
        "bathrooms",
        "floor",
        "total_floors",
        "year_built",
    )
    categorical_features: tuple[str, ...] = (
        "location",
        "city",
        "property_type",
        "region",
    )
    boolean_features: tuple[str, ...] = ("parking", "has_garden", "has_pool")


def _parse_price_to_tnd(value: str | float | int) -> float:
    if pd.isna(value):
        return np.nan

    text = str(value).strip().replace("\u202f", " ").replace(",", "")
    if "prix à consulter" in text.lower():
        return np.nan

    number = re.findall(r"[\d.]+", text)
    if not number:
        return np.nan

    amount = float(number[0])
    if "eur" in text.lower():
        return amount * 3.37
    return amount


def _extract_location(raw_value: str) -> tuple[str, str]:
    if pd.isna(raw_value):
        return "unknown", "unknown"

    try:
        payload = json.loads(raw_value)
        city = str(payload.get("city") or payload.get("municipality") or "unknown").strip().lower()
        district = str(payload.get("district") or payload.get("zone") or city or "unknown").strip().lower()
        return district if district else "unknown", city if city else "unknown"
    except Exception:
        return "unknown", "unknown"


def _extract_number(text: str, pattern: str) -> float:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return float(match.group(1)) if match else np.nan


def _infer_region(city: str, location: str) -> str:
    token = f"{city} {location}".lower()
    if any(k in token for k in ["tunis", "ariana", "manouba", "ben arous"]):
        return "grand_tunis"
    if any(k in token for k in ["sousse", "monastir", "mahdia"]):
        return "sahel"
    if any(k in token for k in ["sfax", "gabes", "medenine", "djerba"]):
        return "sud_est"
    if any(k in token for k in ["gafsa", "tozeur", "kebili", "kasserine"]):
        return "sud_ouest"
    if any(k in token for k in ["nabeul", "hammamet", "bizerte", "beja", "jendouba"]):
        return "nord"
    return "other"


def clean_raw_data(df_raw: pd.DataFrame) -> pd.DataFrame:
    df = df_raw.copy()

    if "transaction_type" in df:
        df = df[df["transaction_type"].astype(str).str.lower().eq("sale")]

    df[TARGET_COL] = df["price"].apply(_parse_price_to_tnd)

    locations = df.get("location_details", pd.Series([None] * len(df))).apply(_extract_location)
    df["location"] = locations.apply(lambda x: x[0])
    df["city"] = locations.apply(lambda x: x[1])
    if "municipality" in df.columns:
        df["city"] = df["city"].where(df["city"].ne("unknown"), df["municipality"].fillna("unknown").astype(str).str.lower())

    if "property_type" not in df.columns:
        df["property_type"] = "unknown"
    df["property_type"] = df["property_type"].fillna("unknown").astype(str).str.lower()

    for col in ["surface", "rooms", "bathrooms"]:
        df[col] = pd.to_numeric(df.get(col), errors="coerce")

    text_blob = (
        df.get("title", "").fillna("").astype(str)
        + " "
        + df.get("subtitle", "").fillna("").astype(str)
        + " "
        + df.get("description", "").fillna("").astype(str)
    ).str.lower()

    df["floor"] = pd.to_numeric(df.get("floor"), errors="coerce") if "floor" in df.columns else np.nan
    df["total_floors"] = pd.to_numeric(df.get("total_floors"), errors="coerce") if "total_floors" in df.columns else np.nan
    df["year_built"] = pd.to_numeric(df.get("year_built"), errors="coerce") if "year_built" in df.columns else np.nan

    df["floor"] = df["floor"].where(df["floor"].notna(), text_blob.apply(lambda t: _extract_number(t, r"(\d+)\s*(?:ème|eme|e)?\s*étage")))
    df["total_floors"] = df["total_floors"].where(
        df["total_floors"].notna(), text_blob.apply(lambda t: _extract_number(t, r"(?:sur|/|de)\s*(\d+)\s*(?:étages|niveaux)"))
    )
    df["year_built"] = df["year_built"].where(
        df["year_built"].notna(), text_blob.apply(lambda t: _extract_number(t, r"(?:construit|built|année)\s*(?:en)?\s*(19\d{2}|20\d{2})"))
    )

    df["parking"] = text_blob.str.contains(r"parking|garage|carport", regex=True)
    df["has_garden"] = text_blob.str.contains(r"jardin|garden", regex=True)
    df["has_pool"] = text_blob.str.contains(r"piscine|pool", regex=True)
    df["region"] = [
        _infer_region(city=city, location=loc)
        for city, loc in zip(df["city"].fillna("unknown"), df["location"].fillna("unknown"), strict=False)
    ]

    df = df.dropna(subset=[TARGET_COL])
    df = df[df[TARGET_COL] > 0]

    config = DatasetConfig()
    columns = list(config.numeric_features + config.categorical_features + config.boolean_features) + [TARGET_COL]
    return df[columns].reset_index(drop=True)


def get_model_feature_lists() -> tuple[list[str], list[str], list[str]]:
    numeric = [
        "surface",
        "rooms",
        "bathrooms",
        "floor",
        "total_floors",
        "year_built",
        "rooms_per_surface",
        "bathrooms_per_room",
        "log_surface",
        "building_density",
        "property_age",
    ]
    categorical = ["location", "city", "property_type", "region"]
    boolean = ["parking", "has_garden", "has_pool"]
    return numeric, categorical, boolean
