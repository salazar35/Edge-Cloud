"""Service for performing health checks on Kubernetes clusters."""

from datetime import datetime
from kubernetes.client.rest import ApiException

from app.models.cluster import Cluster, ClusterStatus
from app.utils.k8s_client import k8s_manager


class HealthService:
    async def check_cluster_health(self, cluster: Cluster) -> dict:
        """Perform comprehensive health check on a cluster."""
        try:
            clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
            core_v1 = clients["core_v1"]
            version_api = clients["version"]

            # Get version
            version_info = version_api.get_code()
            version = f"{version_info.major}.{version_info.minor}"

            # Get nodes
            nodes_list = core_v1.list_node()
            nodes = []
            for node in nodes_list.items:
                node_status = "Unknown"
                for condition in node.status.conditions:
                    if condition.type == "Ready":
                        node_status = "Ready" if condition.status == "True" else "NotReady"
                        break

                nodes.append({
                    "name": node.metadata.name,
                    "status": node_status,
                    "roles": self._get_node_roles(node),
                    "version": node.status.node_info.kubelet_version,
                    "os": node.status.node_info.os_image,
                    "cpu": node.status.capacity.get("cpu", "N/A"),
                    "memory": node.status.capacity.get("memory", "N/A"),
                })

            # Get component statuses (deprecated in newer K8s but still useful)
            components = []
            try:
                cs_list = core_v1.list_component_status()
                for cs in cs_list.items:
                    status = "Healthy"
                    for condition in cs.conditions:
                        if condition.type == "Healthy" and condition.status != "True":
                            status = "Unhealthy"
                    components.append({
                        "name": cs.metadata.name,
                        "status": status,
                    })
            except ApiException:
                # Component status API might not be available
                pass

            return {
                "cluster_id": cluster.id,
                "cluster_name": cluster.name,
                "status": ClusterStatus.CONNECTED,
                "version": version,
                "nodes_count": len(nodes),
                "nodes": nodes,
                "components": components,
                "last_check": datetime.utcnow(),
            }

        except ApiException as e:
            return {
                "cluster_id": cluster.id,
                "cluster_name": cluster.name,
                "status": ClusterStatus.ERROR,
                "version": cluster.version,
                "nodes_count": 0,
                "nodes": [],
                "components": [],
                "error": f"API Error: {e.reason}",
                "last_check": datetime.utcnow(),
            }
        except Exception as e:
            k8s_manager.remove_client(cluster.id)
            return {
                "cluster_id": cluster.id,
                "cluster_name": cluster.name,
                "status": ClusterStatus.DISCONNECTED,
                "version": cluster.version,
                "nodes_count": 0,
                "nodes": [],
                "components": [],
                "error": str(e),
                "last_check": datetime.utcnow(),
            }

    def _get_node_roles(self, node) -> list[str]:
        """Extract node roles from labels."""
        roles = []
        for label, value in (node.metadata.labels or {}).items():
            if label.startswith("node-role.kubernetes.io/"):
                role = label.split("/")[1]
                if role:
                    roles.append(role)
        return roles if roles else ["worker"]
