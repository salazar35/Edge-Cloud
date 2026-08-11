from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ClusterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Cluster name")
    description: Optional[str] = Field(None, description="Cluster description")
    api_server_url: str = Field(..., description="Kubernetes API server URL")
    kubeconfig: str = Field(..., description="Kubeconfig file content (YAML)")


class ClusterResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    api_server_url: str
    status: str
    version: Optional[str]
    nodes_count: int
    created_at: datetime
    updated_at: datetime
    last_health_check: Optional[datetime]

    class Config:
        from_attributes = True


class ClusterHealthResponse(BaseModel):
    cluster_id: int
    cluster_name: str
    status: str
    version: Optional[str]
    nodes_count: int
    nodes: list[dict] = []
    components: list[dict] = []
    last_check: datetime


class ClusterListResponse(BaseModel):
    clusters: list[ClusterResponse]
    total: int
