"""Service for managing Kubernetes namespaces."""

from kubernetes import client
from kubernetes.client.rest import ApiException

from app.models.cluster import Cluster
from app.utils.k8s_client import k8s_manager


class NamespaceService:
    async def list_namespaces(self, cluster: Cluster) -> list[dict]:
        """List all namespaces in a cluster."""
        try:
            clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
            core_v1 = clients["core_v1"]
        except Exception as e:
            k8s_manager.remove_client(cluster.id)
            raise Exception(f"Failed to connect to cluster: {str(e)}")

        try:
            ns_list = core_v1.list_namespace()
            namespaces = []
            for ns in ns_list.items:
                namespaces.append({
                    "name": ns.metadata.name,
                    "status": ns.status.phase,
                    "labels": ns.metadata.labels or {},
                    "created_at": ns.metadata.creation_timestamp,
                })
            return namespaces
        except ApiException as e:
            # Clear cached client on connection errors
            if e.status in (401, 403, 0):
                k8s_manager.remove_client(cluster.id)
            raise Exception(f"Failed to list namespaces: {e.reason}")

    async def create_namespace(self, cluster: Cluster, name: str, labels: dict = None) -> dict:
        """Create a new namespace in a cluster."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]

        body = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=name,
                labels=labels or {}
            )
        )

        try:
            ns = core_v1.create_namespace(body=body)
            return {
                "name": ns.metadata.name,
                "status": ns.status.phase,
                "labels": ns.metadata.labels or {},
                "created_at": ns.metadata.creation_timestamp,
            }
        except ApiException as e:
            if e.status == 409:
                raise Exception(f"Namespace '{name}' already exists")
            raise Exception(f"Failed to create namespace: {e.reason}")

    async def delete_namespace(self, cluster: Cluster, name: str) -> bool:
        """Delete a namespace from a cluster."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]

        # Prevent deletion of system namespaces
        protected_namespaces = ["default", "kube-system", "kube-public", "kube-node-lease"]
        if name in protected_namespaces:
            raise Exception(f"Cannot delete protected namespace: {name}")

        try:
            core_v1.delete_namespace(name=name)
            return True
        except ApiException as e:
            if e.status == 404:
                raise Exception(f"Namespace '{name}' not found")
            raise Exception(f"Failed to delete namespace: {e.reason}")
