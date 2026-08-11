"""Kubernetes client wrapper for multi-cluster management."""

import tempfile
import os
import yaml
from typing import Optional
from kubernetes import client, config
from kubernetes.client.rest import ApiException


class K8sClientManager:
    """Manages Kubernetes client connections for multiple clusters."""

    def __init__(self):
        self._clients: dict[int, dict] = {}
        self._kubeconfig_files: dict[int, str] = {}  # Keep temp files alive

    def get_client(self, cluster_id: int, kubeconfig_content: str) -> dict:
        """Get or create a Kubernetes client for a cluster.

        Returns a dict with api_client, core_v1, apps_v1, etc.
        """
        if cluster_id in self._clients:
            return self._clients[cluster_id]

        api_client = self._create_api_client(cluster_id, kubeconfig_content)
        clients = {
            "api_client": api_client,
            "core_v1": client.CoreV1Api(api_client),
            "apps_v1": client.AppsV1Api(api_client),
            "version": client.VersionApi(api_client),
        }
        self._clients[cluster_id] = clients
        return clients

    def remove_client(self, cluster_id: int):
        """Remove cached client for a cluster."""
        if cluster_id in self._clients:
            del self._clients[cluster_id]
        # Clean up temp kubeconfig file
        if cluster_id in self._kubeconfig_files:
            try:
                os.unlink(self._kubeconfig_files[cluster_id])
            except OSError:
                pass
            del self._kubeconfig_files[cluster_id]

    def _create_api_client(self, cluster_id: int, kubeconfig_content: str) -> client.ApiClient:
        """Create an API client from kubeconfig content.

        Uses new_client_from_config to create an isolated client
        without modifying global kubernetes config state.
        """
        # Write kubeconfig to a temp file that persists while client is alive
        tmp_path = os.path.join(tempfile.gettempdir(), f"edge_cloud_kubeconfig_{cluster_id}")
        with open(tmp_path, "w") as f:
            f.write(kubeconfig_content)

        self._kubeconfig_files[cluster_id] = tmp_path

        try:
            # new_client_from_config returns an ApiClient without modifying globals
            api_client = config.new_client_from_config(config_file=tmp_path)
            return api_client
        except Exception as e:
            # If new_client_from_config fails, try loading with context detection
            try:
                kubeconfig_dict = yaml.safe_load(kubeconfig_content)
                contexts = kubeconfig_dict.get("contexts", [])
                context_name = None
                if contexts:
                    context_name = contexts[0].get("name")

                api_client = config.new_client_from_config(
                    config_file=tmp_path,
                    context=context_name,
                )
                return api_client
            except Exception as e2:
                raise Exception(
                    f"Failed to create K8s client: {str(e2)}. "
                    f"Original error: {str(e)}"
                )

    async def check_connection(self, kubeconfig_content: str) -> dict:
        """Test connection to a cluster and return version info."""
        tmp_path = None
        try:
            # Write temp file for connection test
            tmp_path = os.path.join(tempfile.gettempdir(), "edge_cloud_kubeconfig_test")
            with open(tmp_path, "w") as f:
                f.write(kubeconfig_content)

            api_client = config.new_client_from_config(config_file=tmp_path)
            version_api = client.VersionApi(api_client)
            version_info = version_api.get_code()

            return {
                "connected": True,
                "version": f"{version_info.major}.{version_info.minor}",
                "platform": version_info.platform,
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
            }
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Singleton instance
k8s_manager = K8sClientManager()
