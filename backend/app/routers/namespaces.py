"""API routes for namespace management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.namespace import (
    NamespaceCreate, NamespaceUpdate, NamespaceResponse,
    NamespaceDetailResponse, NamespaceListResponse,
    ResourceQuotaSpec, RoleBindingCreate,
)
from app.services.cluster_service import ClusterService
from app.services.namespace_service import NamespaceService

router = APIRouter(prefix="/api/clusters/{cluster_id}/namespaces", tags=["namespaces"])
namespace_service = NamespaceService()


async def _get_cluster(cluster_id: int, db: AsyncSession):
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


@router.get("/{namespace_name}", response_model=NamespaceDetailResponse)
async def get_namespace_detail(cluster_id: int, namespace_name: str, db: AsyncSession = Depends(get_db)):
    """Get detailed namespace info including resource quotas and RBAC."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        detail = await namespace_service.get_namespace_detail(cluster, namespace_name)
        return NamespaceDetailResponse(**detail)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=NamespaceResponse, status_code=201)
async def create_namespace(cluster_id: int, data: NamespaceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new namespace."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        ns = await namespace_service.create_namespace(
            cluster, name=data.name, labels=data.labels, annotations=data.annotations
        )
        return NamespaceResponse(**ns)
    except Exception as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{namespace_name}", response_model=NamespaceResponse)
async def update_namespace(cluster_id: int, namespace_name: str, data: NamespaceUpdate, db: AsyncSession = Depends(get_db)):
    """Update namespace labels and annotations."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        ns = await namespace_service.update_namespace(
            cluster, name=namespace_name, labels=data.labels, annotations=data.annotations
        )
        return NamespaceResponse(**ns)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{namespace_name}", status_code=204)
async def delete_namespace(cluster_id: int, namespace_name: str, db: AsyncSession = Depends(get_db)):
    """Delete a namespace."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        await namespace_service.delete_namespace(cluster, namespace_name)
    except Exception as e:
        if "protected" in str(e).lower():
            raise HTTPException(status_code=403, detail=str(e))
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# === Resource Quotas ===

@router.post("/{namespace_name}/resource-quota")
async def set_resource_quota(cluster_id: int, namespace_name: str, spec: ResourceQuotaSpec, db: AsyncSession = Depends(get_db)):
    """Create or update resource quota for a namespace."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        result = await namespace_service.set_resource_quota(cluster, namespace_name, spec)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{namespace_name}/resource-quota", status_code=204)
async def delete_resource_quota(cluster_id: int, namespace_name: str, db: AsyncSession = Depends(get_db)):
    """Delete resource quota from a namespace."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        await namespace_service.delete_resource_quota(cluster, namespace_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === RBAC - Role Bindings ===

@router.post("/{namespace_name}/role-bindings")
async def create_role_binding(cluster_id: int, namespace_name: str, data: RoleBindingCreate, db: AsyncSession = Depends(get_db)):
    """Create a RoleBinding in a namespace."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        result = await namespace_service.create_role_binding(cluster, namespace_name, data)
        return result
    except Exception as e:
        if "already exists" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{namespace_name}/role-bindings/{binding_name}", status_code=204)
async def delete_role_binding(cluster_id: int, namespace_name: str, binding_name: str, db: AsyncSession = Depends(get_db)):
    """Delete a RoleBinding from a namespace."""
    cluster = await _get_cluster(cluster_id, db)
    try:
        await namespace_service.delete_role_binding(cluster, namespace_name, binding_name)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))
