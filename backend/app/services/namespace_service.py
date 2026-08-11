"""Service for managing Kubernetes namespaces with full configuration."""

from kubernetes import client
from kubernetes.client.rest import ApiException

from app.models.cluster import Cluster
from app.schemas.namespace import ResourceQuotaSpec, RoleBindingCreate
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
                annotations = ns.metadata.annotations or {}
                # Filter out internal K8s annotations for cleaner display
                filtered_annotations = {
                    k: v for k, v in annotations.items()
                    if not k.startswith("kubectl.kubernetes.io")
                }
                namespaces.append({
                    "name": ns.metadata.name,
                    "status": ns.status.phase,
                    "labels": ns.metadata.labels or {},
                    "annotations": filtered_annotations,
                    "created_at": ns.metadata.creation_timestamp,
                })
            return namespaces
        except ApiException as e:
            if e.status in (401, 403, 0):
                k8s_manager.remove_client(cluster.id)
            raise Exception(f"Failed to list namespaces: {e.reason}")

    async def get_namespace_detail(self, cluster: Cluster, name: str) -> dict:
        """Get detailed namespace info including resource quotas and RBAC."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]

        try:
            ns = core_v1.read_namespace(name=name)
        except ApiException as e:
            if e.status == 404:
                raise Exception(f"Namespace '{name}' not found")
            raise Exception(f"Failed to get namespace: {e.reason}")

        # Get resource quotas
        resource_quota = None
        try:
            quotas = core_v1.list_namespaced_resource_quota(namespace=name)
            if quotas.items:
                q = quotas.items[0]  # Take first quota
                resource_quota = {
                    "name": q.metadata.name,
                    "hard": q.spec.hard if q.spec.hard else {},
                    "used": q.status.used if q.status and q.status.used else {},
                }
        except ApiException:
            pass

        # Get role bindings
        role_bindings = []
        try:
            from kubernetes.client import RbacAuthorizationV1Api
            rbac_v1 = RbacAuthorizationV1Api(clients["api_client"])
            rbs = rbac_v1.list_namespaced_role_binding(namespace=name)
            for rb in rbs.items:
                subjects = []
                for s in (rb.subjects or []):
                    subjects.append({
                        "kind": s.kind,
                        "name": s.name,
                        "namespace": s.namespace,
                    })
                role_bindings.append({
                    "name": rb.metadata.name,
                    "role_kind": rb.role_ref.kind,
                    "role_name": rb.role_ref.name,
                    "subjects": subjects,
                })
        except ApiException:
            pass

        annotations = ns.metadata.annotations or {}
        filtered_annotations = {
            k: v for k, v in annotations.items()
            if not k.startswith("kubectl.kubernetes.io")
        }

        return {
            "name": ns.metadata.name,
            "status": ns.status.phase,
            "labels": ns.metadata.labels or {},
            "annotations": filtered_annotations,
            "created_at": ns.metadata.creation_timestamp,
            "resource_quota": resource_quota,
            "role_bindings": role_bindings,
        }

    async def create_namespace(self, cluster: Cluster, name: str, labels: dict = None, annotations: dict = None) -> dict:
        """Create a new namespace in a cluster."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]

        body = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=name,
                labels=labels or {},
                annotations=annotations or {},
            )
        )

        try:
            ns = core_v1.create_namespace(body=body)
            return {
                "name": ns.metadata.name,
                "status": ns.status.phase,
                "labels": ns.metadata.labels or {},
                "annotations": ns.metadata.annotations or {},
                "created_at": ns.metadata.creation_timestamp,
            }
        except ApiException as e:
            if e.status == 409:
                raise Exception(f"Namespace '{name}' already exists")
            raise Exception(f"Failed to create namespace: {e.reason}")

    async def update_namespace(self, cluster: Cluster, name: str, labels: dict = None, annotations: dict = None) -> dict:
        """Update namespace labels and annotations."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]

        try:
            ns = core_v1.read_namespace(name=name)
        except ApiException as e:
            if e.status == 404:
                raise Exception(f"Namespace '{name}' not found")
            raise Exception(f"Failed to read namespace: {e.reason}")

        # Merge labels/annotations
        if labels is not None:
            ns.metadata.labels = labels
        if annotations is not None:
            current_annotations = ns.metadata.annotations or {}
            # Keep internal K8s annotations
            internal = {k: v for k, v in current_annotations.items() if k.startswith("kubectl.kubernetes.io")}
            ns.metadata.annotations = {**internal, **annotations}

        try:
            updated = core_v1.replace_namespace(name=name, body=ns)
            filtered_annotations = {
                k: v for k, v in (updated.metadata.annotations or {}).items()
                if not k.startswith("kubectl.kubernetes.io")
            }
            return {
                "name": updated.metadata.name,
                "status": updated.status.phase,
                "labels": updated.metadata.labels or {},
                "annotations": filtered_annotations,
                "created_at": updated.metadata.creation_timestamp,
            }
        except ApiException as e:
            raise Exception(f"Failed to update namespace: {e.reason}")

    async def set_resource_quota(self, cluster: Cluster, namespace: str, spec: ResourceQuotaSpec) -> dict:
        """Create or update resource quota for a namespace."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]

        # Build hard limits
        hard = {}
        if spec.cpu_requests:
            hard["requests.cpu"] = spec.cpu_requests
        if spec.cpu_limits:
            hard["limits.cpu"] = spec.cpu_limits
        if spec.memory_requests:
            hard["requests.memory"] = spec.memory_requests
        if spec.memory_limits:
            hard["limits.memory"] = spec.memory_limits
        if spec.pods:
            hard["pods"] = spec.pods
        if spec.services:
            hard["services"] = spec.services
        if spec.configmaps:
            hard["configmaps"] = spec.configmaps
        if spec.secrets:
            hard["secrets"] = spec.secrets
        if spec.pvcs:
            hard["persistentvolumeclaims"] = spec.pvcs

        if not hard:
            raise Exception("At least one resource limit must be specified")

        quota_name = f"{namespace}-quota"
        quota_body = client.V1ResourceQuota(
            metadata=client.V1ObjectMeta(name=quota_name),
            spec=client.V1ResourceQuotaSpec(hard=hard),
        )

        try:
            # Try to update existing
            core_v1.replace_namespaced_resource_quota(
                name=quota_name, namespace=namespace, body=quota_body
            )
        except ApiException as e:
            if e.status == 404:
                # Create new
                core_v1.create_namespaced_resource_quota(
                    namespace=namespace, body=quota_body
                )
            else:
                raise Exception(f"Failed to set resource quota: {e.reason}")

        return {"name": quota_name, "hard": hard}

    async def delete_resource_quota(self, cluster: Cluster, namespace: str) -> bool:
        """Delete resource quota from a namespace."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]
        quota_name = f"{namespace}-quota"

        try:
            core_v1.delete_namespaced_resource_quota(name=quota_name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status == 404:
                return True  # Already deleted
            raise Exception(f"Failed to delete resource quota: {e.reason}")

    async def create_role_binding(self, cluster: Cluster, namespace: str, binding: RoleBindingCreate) -> dict:
        """Create a RoleBinding in a namespace."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        from kubernetes.client import RbacAuthorizationV1Api
        rbac_v1 = RbacAuthorizationV1Api(clients["api_client"])

        subject = client.V1Subject(
            kind=binding.subject_kind,
            name=binding.subject_name,
            namespace=binding.subject_namespace,
        )

        role_binding_body = client.V1RoleBinding(
            metadata=client.V1ObjectMeta(name=binding.name),
            role_ref=client.V1RoleRef(
                api_group="rbac.authorization.k8s.io",
                kind=binding.role_kind,
                name=binding.role_name,
            ),
            subjects=[subject],
        )

        try:
            rb = rbac_v1.create_namespaced_role_binding(namespace=namespace, body=role_binding_body)
            return {
                "name": rb.metadata.name,
                "role_kind": rb.role_ref.kind,
                "role_name": rb.role_ref.name,
                "subjects": [{"kind": s.kind, "name": s.name, "namespace": s.namespace} for s in rb.subjects],
            }
        except ApiException as e:
            if e.status == 409:
                raise Exception(f"RoleBinding '{binding.name}' already exists")
            raise Exception(f"Failed to create RoleBinding: {e.reason}")

    async def delete_role_binding(self, cluster: Cluster, namespace: str, name: str) -> bool:
        """Delete a RoleBinding from a namespace."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        from kubernetes.client import RbacAuthorizationV1Api
        rbac_v1 = RbacAuthorizationV1Api(clients["api_client"])

        try:
            rbac_v1.delete_namespaced_role_binding(name=name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status == 404:
                raise Exception(f"RoleBinding '{name}' not found")
            raise Exception(f"Failed to delete RoleBinding: {e.reason}")

    async def delete_namespace(self, cluster: Cluster, name: str) -> bool:
        """Delete a namespace from a cluster."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        core_v1 = clients["core_v1"]

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
