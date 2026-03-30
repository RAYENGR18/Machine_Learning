"""Pydantic schemas for Predictina API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    surface: float = Field(..., gt=0, description="House surface in square meters")
    rooms: float = Field(..., ge=0, description="Number of rooms")
    bathrooms: float = Field(..., ge=0, description="Number of bathrooms")
    location: str = Field(..., min_length=2, max_length=120)


class PredictionResponse(BaseModel):
    predicted_price: float
