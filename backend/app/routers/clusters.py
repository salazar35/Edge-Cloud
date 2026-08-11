"""API routes for cluster management."""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import json

from app.database import get_db
from app.schemas.cluster import (
    ClusterCreate,
    ClusterResponse,
    ClusterHealthResponse,
    ClusterListResponse,
)
from app.services.cluster_service import ClusterService
from app.services.health_service import HealthService

router = APIRouter(prefix="/api/clusters", tags=["clusters"])
health_service = HealthService()


@router.get("", response_model=ClusterListResponse)
async def list_clusters(db: AsyncSession = Depends(get_db)):
    """List all registered Kubernetes clusters."""
    service = ClusterService(db)
    clusters = await service.list_clusters()
    return ClusterListResponse(
        clusters=[ClusterResponse.model_validate(c) for c in clusters],
        total=len(clusters),
    )


@router.post("", response_model=ClusterResponse, status_code=201)
async def create_cluster(data: ClusterCreate, db: AsyncSession = Depends(get_db)):
    """Register a new Kubernetes cluster."""
    service = ClusterService(db)

    # Check if cluster name already exists
    existing_clusters = await service.list_clusters()
    if any(c.name == data.name for c in existing_clusters):
        raise HTTPException(status_code=409, detail=f"Cluster '{data.name}' already exists")

    cluster = await service.create_cluster(data)
    return ClusterResponse.model_validate(cluster)


@router.get("/{cluster_id}", response_model=ClusterResponse)
async def get_cluster(cluster_id: int, db: AsyncSession = Depends(get_db)):
    """Get details of a specific cluster."""
    service = ClusterService(db)
    cluster = await service.get_cluster(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return ClusterResponse.model_validate(cluster)


@router.delete("/{cluster_id}", status_code=204)
async def delete_cluster(cluster_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a cluster from management."""
    service = ClusterService(db)
    success = await service.delete_cluster(cluster_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cluster not found")


@router.patch("/{cluster_id}", response_model=ClusterResponse)
async def update_cluster(cluster_id: int, data: ClusterCreate, db: AsyncSession = Depends(get_db)):
    """Update cluster information."""
    service = ClusterService(db)
    cluster = await service.get_cluster(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    cluster = await service.update_cluster(cluster_id, data)
    return ClusterResponse.model_validate(cluster)


@router.get("/{cluster_id}/health", response_model=ClusterHealthResponse)
async def health_check(cluster_id: int, db: AsyncSession = Depends(get_db)):
    """Perform a health check on a cluster."""
    service = ClusterService(db)
    cluster = await service.get_cluster(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    result = await health_service.check_cluster_health(cluster)

    # Update cluster status in DB
    await service.update_cluster_status(
        cluster_id=cluster.id,
        status=result["status"],
        version=result.get("version"),
        nodes_count=result.get("nodes_count", 0),
    )

    return ClusterHealthResponse(
        cluster_id=result["cluster_id"],
        cluster_name=result["cluster_name"],
        status=result["status"],
        version=result.get("version"),
        nodes_count=result.get("nodes_count", 0),
        nodes=result.get("nodes", []),
        components=result.get("components", []),
        last_check=result["last_check"],
    )


@router.websocket("/ws/health")
async def websocket_health(websocket: WebSocket, db: AsyncSession = Depends(get_db)):
    """WebSocket endpoint for real-time cluster health updates."""
    await websocket.accept()
    try:
        while True:
            service = ClusterService(db)
            clusters = await service.list_clusters()

            health_data = []
            for cluster in clusters:
                result = await health_service.check_cluster_health(cluster)
                await service.update_cluster_status(
                    cluster_id=cluster.id,
                    status=result["status"],
                    version=result.get("version"),
                    nodes_count=result.get("nodes_count", 0),
                )
                health_data.append({
                    "cluster_id": result["cluster_id"],
                    "cluster_name": result["cluster_name"],
                    "status": result["status"].value if hasattr(result["status"], "value") else result["status"],
                    "nodes_count": result.get("nodes_count", 0),
                    "version": result.get("version"),
                })

            await websocket.send_json({"clusters": health_data})
            await asyncio.sleep(30)  # Check every 30 seconds
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()
