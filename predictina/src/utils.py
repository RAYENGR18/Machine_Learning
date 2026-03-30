"""Utility helpers for Predictina training and inference."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any


def setup_logging(level: int = logging.INFO) -> None:
    """Configure a consistent logging format for scripts and API."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def ensure_dir(path: str | Path) -> Path:
    """Create directory if it does not exist and return it as Path."""
    path_obj = Path(path)
    path_obj.mkdir(parents=True, exist_ok=True)
    return path_obj


def save_json(payload: dict[str, Any], output_path: str | Path) -> None:
    """Persist a dictionary to JSON with UTF-8 encoding."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide values and fallback on default for division by zero."""
    if denominator in (0, 0.0):
        return default
    return numerator / denominator
