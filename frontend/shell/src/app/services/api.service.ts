import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cluster {
  id: number;
  name: string;
  description: string | null;
  api_server_url: string;
  status: string;
  version: string | null;
  nodes_count: number;
  created_at: string;
  updated_at: string;
  last_health_check: string | null;
}

export interface ClusterListResponse {
  clusters: Cluster[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api`;

  constructor(private http: HttpClient) {}

  // Clusters
  getClusters(): Observable<ClusterListResponse> {
    return this.http.get<ClusterListResponse>(`${this.baseUrl}/clusters`);
  }

  getCluster(id: number): Observable<Cluster> {
    return this.http.get<Cluster>(`${this.baseUrl}/clusters/${id}`);
  }

  addCluster(data: {
    name: string;
    description?: string;
    api_server_url: string;
    kubeconfig: string;
  }): Observable<Cluster> {
    return this.http.post<Cluster>(`${this.baseUrl}/clusters`, data);
  }

  deleteCluster(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clusters/${id}`);
  }

  healthCheck(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/clusters/${id}/health`);
  }

  // Namespaces
  getNamespaces(
    clusterId: number
  ): Observable<{ namespaces: any[]; total: number }> {
    return this.http.get<{ namespaces: any[]; total: number }>(
      `${this.baseUrl}/clusters/${clusterId}/namespaces`
    );
  }

  createNamespace(
    clusterId: number,
    name: string,
    labels?: Record<string, string>
  ): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/clusters/${clusterId}/namespaces`,
      { name, labels }
    );
  }

  deleteNamespace(clusterId: number, name: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${name}`
    );
  }

  // Workloads
  getWorkloads(
    clusterId: number,
    namespace: string
  ): Observable<{ workloads: any[]; total: number }> {
    return this.http.get<{ workloads: any[]; total: number }>(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${namespace}/workloads`
    );
  }

  getWorkloadDetail(
    clusterId: number,
    namespace: string,
    name: string
  ): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${namespace}/workloads/${name}`
    );
  }

  deployWorkload(
    clusterId: number,
    namespace: string,
    data: any
  ): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${namespace}/deployments`,
      data
    );
  }

  deleteWorkload(
    clusterId: number,
    namespace: string,
    name: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${namespace}/workloads/${name}`
    );
  }

  scaleWorkload(
    clusterId: number,
    namespace: string,
    name: string,
    replicas: number
  ): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${namespace}/workloads/${name}/scale`,
      { replicas }
    );
  }
}
