"""API routes for workload management and deployment."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.workload import (
    WorkloadResponse,
    WorkloadListResponse,
    WorkloadDetailResponse,
    DeploymentCreate,
    ScaleRequest,
)
from app.services.cluster_service import ClusterService
from app.services.workload_service import WorkloadService

router = APIRouter(
    prefix="/api/clusters/{cluster_id}/namespaces/{namespace}",
    tags=["workloads"],
)
workload_service = WorkloadService()


async def _get_cluster(cluster_id: int, db: AsyncSession):
    """Helper to get and validate cluster exists."""
    service = ClusterService(db)
    cluster = await service.get_cluster(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


@router.get("/workloads", response_model=WorkloadListResponse)
async def list_workloads(
    cluster_id: int,
    namespace: str,
    db: AsyncSession = Depends(get_db),
):
    """List all workloads in a namespace."""
    cluster = await _get_cluster(cluster_id, db)

    try:
        workloads = await workload_service.list_workloads(cluster, namespace)
        return WorkloadListResponse(
            workloads=[WorkloadResponse(**w) for w in workloads],
            total=len(workloads),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workloads/{workload_name}", response_model=WorkloadDetailResponse)
async def get_workload_detail(
    cluster_id: int,
    namespace: str,
    workload_name: str,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a workload."""
    cluster = await _get_cluster(cluster_id, db)

    try:
        detail = await workload_service.get_workload_detail(cluster, namespace, workload_name)
        if not detail:
            raise HTTPException(status_code=404, detail=f"Workload '{workload_name}' not found")
        return WorkloadDetailResponse(**detail)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/deployments", response_model=dict, status_code=201)
async def deploy_workload(
    cluster_id: int,
    namespace: str,
    data: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Deploy a new workload (Deployment) to the cluster."""
    cluster = await _get_cluster(cluster_id, db)

    # Override namespace from path
    data.namespace = namespace

    try:
        result = await workload_service.deploy_workload(cluster, data)
        return result
    except Exception as e:
        if "already exists" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/workloads/{workload_name}", status_code=204)
async def delete_workload(
    cluster_id: int,
    namespace: str,
    workload_name: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a workload from the cluster."""
    cluster = await _get_cluster(cluster_id, db)

    try:
        await workload_service.delete_workload(cluster, namespace, workload_name)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/workloads/{workload_name}/scale", response_model=dict)
async def scale_workload(
    cluster_id: int,
    namespace: str,
    workload_name: str,
    data: ScaleRequest,
    db: AsyncSession = Depends(get_db),
):
    """Scale a workload to the specified number of replicas."""
    cluster = await _get_cluster(cluster_id, db)

    try:
        result = await workload_service.scale_workload(
            cluster, namespace, workload_name, data.replicas
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
