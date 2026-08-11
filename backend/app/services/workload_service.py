"""Service for managing Kubernetes workloads (Deployments, Pods, etc.)."""

from kubernetes import client
from kubernetes.client.rest import ApiException

from app.models.cluster import Cluster
from app.schemas.workload import DeploymentCreate, ContainerSpec
from app.utils.k8s_client import k8s_manager


class WorkloadService:
    async def list_workloads(self, cluster: Cluster, namespace: str) -> list[dict]:
        """List all workloads (Deployments, StatefulSets, DaemonSets) in a namespace."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        apps_v1 = clients["apps_v1"]

        workloads = []

        # Deployments
        try:
            deployments = apps_v1.list_namespaced_deployment(namespace=namespace)
            for d in deployments.items:
                workloads.append({
                    "name": d.metadata.name,
                    "kind": "Deployment",
                    "namespace": namespace,
                    "replicas": d.spec.replicas,
                    "available_replicas": d.status.available_replicas or 0,
                    "ready_replicas": d.status.ready_replicas or 0,
                    "images": [c.image for c in d.spec.template.spec.containers],
                    "status": self._get_deployment_status(d),
                    "created_at": d.metadata.creation_timestamp,
                    "labels": d.metadata.labels or {},
                })
        except ApiException:
            pass

        # StatefulSets
        try:
            statefulsets = apps_v1.list_namespaced_stateful_set(namespace=namespace)
            for s in statefulsets.items:
                workloads.append({
                    "name": s.metadata.name,
                    "kind": "StatefulSet",
                    "namespace": namespace,
                    "replicas": s.spec.replicas,
                    "available_replicas": s.status.ready_replicas or 0,
                    "ready_replicas": s.status.ready_replicas or 0,
                    "images": [c.image for c in s.spec.template.spec.containers],
                    "status": self._get_statefulset_status(s),
                    "created_at": s.metadata.creation_timestamp,
                    "labels": s.metadata.labels or {},
                })
        except ApiException:
            pass

        # DaemonSets
        try:
            daemonsets = apps_v1.list_namespaced_daemon_set(namespace=namespace)
            for ds in daemonsets.items:
                workloads.append({
                    "name": ds.metadata.name,
                    "kind": "DaemonSet",
                    "namespace": namespace,
                    "replicas": ds.status.desired_number_scheduled,
                    "available_replicas": ds.status.number_available or 0,
                    "ready_replicas": ds.status.number_ready or 0,
                    "images": [c.image for c in ds.spec.template.spec.containers],
                    "status": self._get_daemonset_status(ds),
                    "created_at": ds.metadata.creation_timestamp,
                    "labels": ds.metadata.labels or {},
                })
        except ApiException:
            pass

        return workloads

    async def get_workload_detail(self, cluster: Cluster, namespace: str, name: str) -> dict | None:
        """Get detailed information about a specific workload."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        apps_v1 = clients["apps_v1"]
        core_v1 = clients["core_v1"]

        # Try Deployment first
        try:
            d = apps_v1.read_namespaced_deployment(name=name, namespace=namespace)
            pods = self._get_pods_for_workload(core_v1, namespace, d.spec.selector.match_labels)
            events = self._get_events(core_v1, namespace, name)

            return {
                "name": d.metadata.name,
                "kind": "Deployment",
                "namespace": namespace,
                "replicas": d.spec.replicas,
                "available_replicas": d.status.available_replicas or 0,
                "ready_replicas": d.status.ready_replicas or 0,
                "images": [c.image for c in d.spec.template.spec.containers],
                "status": self._get_deployment_status(d),
                "created_at": d.metadata.creation_timestamp,
                "labels": d.metadata.labels or {},
                "pods": pods,
                "events": events,
                "conditions": [
                    {
                        "type": c.type,
                        "status": c.status,
                        "reason": c.reason,
                        "message": c.message,
                    }
                    for c in (d.status.conditions or [])
                ],
            }
        except ApiException as e:
            if e.status != 404:
                raise

        # Try StatefulSet
        try:
            s = apps_v1.read_namespaced_stateful_set(name=name, namespace=namespace)
            pods = self._get_pods_for_workload(core_v1, namespace, s.spec.selector.match_labels)
            events = self._get_events(core_v1, namespace, name)

            return {
                "name": s.metadata.name,
                "kind": "StatefulSet",
                "namespace": namespace,
                "replicas": s.spec.replicas,
                "available_replicas": s.status.ready_replicas or 0,
                "ready_replicas": s.status.ready_replicas or 0,
                "images": [c.image for c in s.spec.template.spec.containers],
                "status": self._get_statefulset_status(s),
                "created_at": s.metadata.creation_timestamp,
                "labels": s.metadata.labels or {},
                "pods": pods,
                "events": events,
                "conditions": [],
            }
        except ApiException as e:
            if e.status != 404:
                raise

        return None

    async def deploy_workload(self, cluster: Cluster, data: DeploymentCreate) -> dict:
        """Create a new Deployment on the cluster."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        apps_v1 = clients["apps_v1"]
        core_v1 = clients["core_v1"]

        namespace = data.namespace or "default"

        # Build container specs
        containers = []
        for c_spec in data.containers:
            container = client.V1Container(
                name=c_spec.name,
                image=c_spec.image,
                ports=[
                    client.V1ContainerPort(container_port=p.get("containerPort", p.get("port", 80)))
                    for p in c_spec.ports
                ] if c_spec.ports else None,
                env=[
                    client.V1EnvVar(name=e["name"], value=e.get("value", ""))
                    for e in c_spec.env
                ] if c_spec.env else None,
                command=c_spec.command,
                args=c_spec.args,
            )

            if c_spec.resources:
                container.resources = client.V1ResourceRequirements(
                    limits=c_spec.resources.get("limits"),
                    requests=c_spec.resources.get("requests"),
                )

            containers.append(container)

        # Build labels
        labels = {"app": data.name, **data.labels}

        # Create Deployment
        deployment = client.V1Deployment(
            metadata=client.V1ObjectMeta(name=data.name, labels=labels),
            spec=client.V1DeploymentSpec(
                replicas=data.replicas,
                selector=client.V1LabelSelector(match_labels={"app": data.name}),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=labels),
                    spec=client.V1PodSpec(containers=containers),
                ),
            ),
        )

        try:
            result = apps_v1.create_namespaced_deployment(
                namespace=namespace, body=deployment
            )

            # Optionally create a service
            if data.service_port:
                service = client.V1Service(
                    metadata=client.V1ObjectMeta(name=data.name, labels=labels),
                    spec=client.V1ServiceSpec(
                        selector={"app": data.name},
                        ports=[
                            client.V1ServicePort(
                                port=data.service_port,
                                target_port=data.service_port,
                            )
                        ],
                        type="ClusterIP",
                    ),
                )
                core_v1.create_namespaced_service(namespace=namespace, body=service)

            return {
                "name": result.metadata.name,
                "kind": "Deployment",
                "namespace": namespace,
                "replicas": result.spec.replicas,
                "status": "Deploying",
                "created_at": result.metadata.creation_timestamp,
            }

        except ApiException as e:
            if e.status == 409:
                raise Exception(f"Deployment '{data.name}' already exists in namespace '{namespace}'")
            raise Exception(f"Failed to create deployment: {e.reason}")

    async def delete_workload(self, cluster: Cluster, namespace: str, name: str) -> bool:
        """Delete a workload (Deployment or StatefulSet)."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        apps_v1 = clients["apps_v1"]

        # Try deleting as Deployment
        try:
            apps_v1.delete_namespaced_deployment(name=name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status != 404:
                raise Exception(f"Failed to delete deployment: {e.reason}")

        # Try deleting as StatefulSet
        try:
            apps_v1.delete_namespaced_stateful_set(name=name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status != 404:
                raise Exception(f"Failed to delete statefulset: {e.reason}")

        raise Exception(f"Workload '{name}' not found in namespace '{namespace}'")

    async def scale_workload(self, cluster: Cluster, namespace: str, name: str, replicas: int) -> dict:
        """Scale a workload to specified replicas."""
        clients = k8s_manager.get_client(cluster.id, cluster.kubeconfig)
        apps_v1 = clients["apps_v1"]

        scale = client.V1Scale(
            metadata=client.V1ObjectMeta(name=name, namespace=namespace),
            spec=client.V1ScaleSpec(replicas=replicas),
        )

        # Try Deployment first
        try:
            result = apps_v1.patch_namespaced_deployment_scale(
                name=name, namespace=namespace, body=scale
            )
            return {
                "name": name,
                "namespace": namespace,
                "replicas": result.spec.replicas,
                "status": "Scaling",
            }
        except ApiException as e:
            if e.status != 404:
                raise Exception(f"Failed to scale: {e.reason}")

        # Try StatefulSet
        try:
            result = apps_v1.patch_namespaced_stateful_set_scale(
                name=name, namespace=namespace, body=scale
            )
            return {
                "name": name,
                "namespace": namespace,
                "replicas": result.spec.replicas,
                "status": "Scaling",
            }
        except ApiException as e:
            raise Exception(f"Failed to scale workload '{name}': {e.reason}")

    def _get_deployment_status(self, deployment) -> str:
        """Determine deployment status."""
        if deployment.status.available_replicas == deployment.spec.replicas:
            return "Running"
        elif deployment.status.available_replicas and deployment.status.available_replicas > 0:
            return "Partial"
        else:
            return "Pending"

    def _get_statefulset_status(self, statefulset) -> str:
        """Determine statefulset status."""
        if statefulset.status.ready_replicas == statefulset.spec.replicas:
            return "Running"
        elif statefulset.status.ready_replicas and statefulset.status.ready_replicas > 0:
            return "Partial"
        else:
            return "Pending"

    def _get_daemonset_status(self, daemonset) -> str:
        """Determine daemonset status."""
        if daemonset.status.number_ready == daemonset.status.desired_number_scheduled:
            return "Running"
        elif daemonset.status.number_ready and daemonset.status.number_ready > 0:
            return "Partial"
        else:
            return "Pending"

    def _get_pods_for_workload(self, core_v1, namespace: str, labels: dict) -> list[dict]:
        """Get pods matching workload labels."""
        label_selector = ",".join([f"{k}={v}" for k, v in labels.items()])
        try:
            pods = core_v1.list_namespaced_pod(namespace=namespace, label_selector=label_selector)
            return [
                {
                    "name": pod.metadata.name,
                    "status": pod.status.phase,
                    "node": pod.spec.node_name,
                    "ip": pod.status.pod_ip,
                    "restarts": sum(
                        cs.restart_count for cs in (pod.status.container_statuses or [])
                    ),
                    "created_at": str(pod.metadata.creation_timestamp),
                }
                for pod in pods.items
            ]
        except ApiException:
            return []

    def _get_events(self, core_v1, namespace: str, name: str) -> list[dict]:
        """Get events for a resource."""
        try:
            events = core_v1.list_namespaced_event(
                namespace=namespace,
                field_selector=f"involvedObject.name={name}",
            )
            return [
                {
                    "type": event.type,
                    "reason": event.reason,
                    "message": event.message,
                    "timestamp": str(event.last_timestamp),
                }
                for event in events.items[-10:]  # Last 10 events
            ]
        except ApiException:
            return []
