"""Service layer for cluster management operations."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.cluster import Cluster, ClusterStatus
from app.schemas.cluster import ClusterCreate
from app.utils.k8s_client import k8s_manager


class ClusterService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_clusters(self) -> list[Cluster]:
        """List all registered clusters."""
        result = await self.db.execute(select(Cluster).order_by(Cluster.created_at.desc()))
        return result.scalars().all()

    async def get_cluster(self, cluster_id: int) -> Cluster | None:
        """Get a single cluster by ID."""
        result = await self.db.execute(select(Cluster).where(Cluster.id == cluster_id))
        return result.scalar_one_or_none()

    async def create_cluster(self, data: ClusterCreate) -> Cluster:
        """Register a new cluster."""
        # Test connection first
        connection_check = await k8s_manager.check_connection(data.kubeconfig)

        cluster = Cluster(
            name=data.name,
            description=data.description,
            api_server_url=data.api_server_url,
            kubeconfig=data.kubeconfig,
            status=ClusterStatus.CONNECTED if connection_check["connected"] else ClusterStatus.ERROR,
            version=connection_check.get("version"),
        )

        self.db.add(cluster)
        await self.db.flush()
        await self.db.refresh(cluster)
        return cluster

    async def delete_cluster(self, cluster_id: int) -> bool:
        """Remove a cluster from management."""
        cluster = await self.get_cluster(cluster_id)
        if not cluster:
            return False

        k8s_manager.remove_client(cluster_id)
        await self.db.delete(cluster)
        return True

    async def update_cluster_status(self, cluster_id: int, status: ClusterStatus, version: str = None, nodes_count: int = 0):
        """Update cluster status after health check."""
        cluster = await self.get_cluster(cluster_id)
        if cluster:
            cluster.status = status
            cluster.last_health_check = datetime.utcnow()
            if version:
                cluster.version = version
            cluster.nodes_count = nodes_count
            await self.db.flush()

    async def update_cluster(self, cluster_id: int, data: ClusterCreate) -> Cluster:
        """Update cluster information."""
        cluster = await self.get_cluster(cluster_id)
        if not cluster:
            return None

        # Remove cached client (kubeconfig may have changed)
        k8s_manager.remove_client(cluster_id)

        # Update fields
        cluster.name = data.name
        cluster.description = data.description
        cluster.api_server_url = data.api_server_url
        cluster.kubeconfig = data.kubeconfig

        # Re-test connection
        connection_check = await k8s_manager.check_connection(data.kubeconfig)
        cluster.status = ClusterStatus.CONNECTED if connection_check["connected"] else ClusterStatus.ERROR
        if connection_check.get("version"):
            cluster.version = connection_check["version"]

        await self.db.flush()
        await self.db.refresh(cluster)
        return cluster
