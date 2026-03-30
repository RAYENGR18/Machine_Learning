"""Pydantic schemas for Predictina API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    surface: Optional[float] = Field(default=None, gt=0, description="House surface in square meters")
    rooms: Optional[float] = Field(default=None, ge=0, description="Number of rooms")
    bathrooms: Optional[float] = Field(default=None, ge=0, description="Number of bathrooms")
    location: Optional[str] = Field(default=None, min_length=2, max_length=120)
    city: Optional[str] = Field(default=None, min_length=2, max_length=120)
    property_type: Optional[str] = Field(default=None, min_length=2, max_length=120)
    floor: Optional[float] = Field(default=None, ge=0)
    total_floors: Optional[float] = Field(default=None, ge=0)
    parking: Optional[bool] = Field(default=None)
    has_garden: Optional[bool] = Field(default=None)
    has_pool: Optional[bool] = Field(default=None)
    year_built: Optional[float] = Field(default=None, ge=1850, le=2100)


class PredictionResponse(BaseModel):
    predicted_price: float
