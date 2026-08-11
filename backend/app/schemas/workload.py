from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ContainerSpec(BaseModel):
    name: str = Field(..., description="Container name")
    image: str = Field(..., description="Container image")
    ports: list[dict] = Field(default_factory=list, description="Container ports")
    env: list[dict] = Field(default_factory=list, description="Environment variables")
    resources: Optional[dict] = Field(None, description="Resource limits/requests")
    command: Optional[list[str]] = None
    args: Optional[list[str]] = None


class DeploymentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=253)
    namespace: Optional[str] = Field("default", description="Target namespace")
    replicas: int = Field(1, ge=1, le=100)
    containers: list[ContainerSpec] = Field(..., min_length=1)
    labels: dict[str, str] = Field(default_factory=dict)
    service_port: Optional[int] = Field(None, description="Expose service on this port")


class WorkloadResponse(BaseModel):
    name: str
    kind: str  # Deployment, StatefulSet, DaemonSet, Pod
    namespace: str
    replicas: Optional[int] = None
    available_replicas: Optional[int] = None
    ready_replicas: Optional[int] = None
    images: list[str] = []
    status: str
    created_at: Optional[datetime] = None
    labels: dict[str, str] = {}


class WorkloadListResponse(BaseModel):
    workloads: list[WorkloadResponse]
    total: int


class ScaleRequest(BaseModel):
    replicas: int = Field(..., ge=0, le=100)


class WorkloadDetailResponse(BaseModel):
    name: str
    kind: str
    namespace: str
    replicas: Optional[int] = None
    available_replicas: Optional[int] = None
    ready_replicas: Optional[int] = None
    images: list[str] = []
    status: str
    created_at: Optional[datetime] = None
    labels: dict[str, str] = {}
    pods: list[dict] = []
    events: list[dict] = []
    conditions: list[dict] = []
