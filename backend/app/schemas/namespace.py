from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NamespaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=253, pattern=r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")
    labels: Optional[dict[str, str]] = None
    annotations: Optional[dict[str, str]] = None


class NamespaceUpdate(BaseModel):
    labels: Optional[dict[str, str]] = None
    annotations: Optional[dict[str, str]] = None


class ResourceQuotaSpec(BaseModel):
    cpu_requests: Optional[str] = None       # e.g., "4"
    cpu_limits: Optional[str] = None         # e.g., "8"
    memory_requests: Optional[str] = None    # e.g., "4Gi"
    memory_limits: Optional[str] = None      # e.g., "8Gi"
    pods: Optional[str] = None               # e.g., "20"
    services: Optional[str] = None           # e.g., "10"
    configmaps: Optional[str] = None         # e.g., "20"
    secrets: Optional[str] = None            # e.g., "20"
    pvcs: Optional[str] = Field(None, alias="persistentvolumeclaims")


class RoleBindingCreate(BaseModel):
    name: str
    role_name: str                # ClusterRole or Role name
    role_kind: str = "ClusterRole"  # "ClusterRole" or "Role"
    subject_kind: str = "ServiceAccount"  # "User", "Group", "ServiceAccount"
    subject_name: str
    subject_namespace: Optional[str] = None  # Required for ServiceAccount


class NamespaceResponse(BaseModel):
    name: str
    status: str
    labels: dict[str, str] = {}
    annotations: dict[str, str] = {}
    created_at: Optional[datetime] = None


class NamespaceDetailResponse(BaseModel):
    name: str
    status: str
    labels: dict[str, str] = {}
    annotations: dict[str, str] = {}
    created_at: Optional[datetime] = None
    resource_quota: Optional[dict] = None
    role_bindings: list[dict] = []


class NamespaceListResponse(BaseModel):
    namespaces: list[NamespaceResponse]
    total: int
