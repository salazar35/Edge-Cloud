from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NamespaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=253, pattern=r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")
    labels: Optional[dict[str, str]] = None


class NamespaceResponse(BaseModel):
    name: str
    status: str
    labels: dict[str, str] = {}
    created_at: Optional[datetime] = None


class NamespaceListResponse(BaseModel):
    namespaces: list[NamespaceResponse]
    total: int
