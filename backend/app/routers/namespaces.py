"""API routes for namespace management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.namespace import NamespaceCreate, NamespaceResponse, NamespaceListResponse
from app.services.cluster_service import ClusterService
from app.services.namespace_service import NamespaceService

router = APIRouter(prefix="/api/clusters/{cluster_id}/namespaces", tags=["namespaces"])
namespace_service = NamespaceService()


async def _get_cluster(cluster_id: int, db: AsyncSession):
    """Helper to get and validate cluster exists."""
    service = ClusterService(db)
    cluster = await service.get_cluster(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


@router.get("", response_model=NamespaceListResponse)
async def list_namespaces(cluster_id: int, db: AsyncSession = Depends(get_db)):
    """List all namespaces in a cluster."""
    cluster = await _get_cluster(cluster_id, db)

    try:
        namespaces = await namespace_service.list_namespaces(cluster)
        return NamespaceListResponse(
            namespaces=[NamespaceResponse(**ns) for ns in namespaces],
            total=len(namespaces),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=NamespaceResponse, status_code=201)
async def create_namespace(
    cluster_id: int,
    data: NamespaceCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new namespace in a cluster."""
    cluster = await _get_cluster(cluster_id, db)

    try:
        ns = await namespace_service.create_namespace(
            cluster, name=data.name, labels=data.labels
        )
        return NamespaceResponse(**ns)
    except Exception as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{namespace_name}", status_code=204)
async def delete_namespace(
    cluster_id: int,
    namespace_name: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a namespace from a cluster."""
    cluster = await _get_cluster(cluster_id, db)

    try:
        await namespace_service.delete_namespace(cluster, namespace_name)
    except Exception as e:
        if "protected" in str(e).lower():
            raise HTTPException(status_code=403, detail=str(e))
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))
