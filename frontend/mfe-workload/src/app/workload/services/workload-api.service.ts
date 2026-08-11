import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cluster {
  id: number;
  name: string;
  status: string;
}

export interface Namespace {
  name: string;
  status: string;
  labels: Record<string, string>;
  created_at: string | null;
}

export interface Workload {
  name: string;
  kind: string;
  namespace: string;
  replicas: number | null;
  available_replicas: number | null;
  ready_replicas: number | null;
  images: string[];
  status: string;
  created_at: string | null;
  labels: Record<string, string>;
}

export interface WorkloadDetail extends Workload {
  pods: PodInfo[];
  events: EventInfo[];
  conditions: ConditionInfo[];
}

export interface PodInfo {
  name: string;
  status: string;
  node: string;
  ip: string;
  restarts: number;
  created_at: string;
}

export interface EventInfo {
  type: string;
  reason: string;
  message: string;
  timestamp: string;
}

export interface ConditionInfo {
  type: string;
  status: string;
  reason: string;
  message: string;
}

export interface DeployRequest {
  name: string;
  namespace?: string;
  replicas: number;
  containers: ContainerSpec[];
  labels?: Record<string, string>;
  service_port?: number;
}

export interface ContainerSpec {
  name: string;
  image: string;
  ports: { containerPort: number }[];
  env: { name: string; value: string }[];
  resources?: {
    limits?: { cpu?: string; memory?: string };
    requests?: { cpu?: string; memory?: string };
  };
}

@Injectable({
  providedIn: 'root',
})
export class WorkloadApiService {
  private baseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api`;

  constructor(private http: HttpClient) {}

  // Clusters (for selection)
  getClusters(): Observable<{ clusters: Cluster[]; total: number }> {
    return this.http.get<{ clusters: Cluster[]; total: number }>(
      `${this.baseUrl}/clusters`
    );
  }

  // Namespaces
  getNamespaces(
    clusterId: number
  ): Observable<{ namespaces: Namespace[]; total: number }> {
    return this.http.get<{ namespaces: Namespace[]; total: number }>(
      `${this.baseUrl}/clusters/${clusterId}/namespaces`
    );
  }

  createNamespace(
    clusterId: number,
    name: string,
    labels?: Record<string, string>
  ): Observable<Namespace> {
    return this.http.post<Namespace>(
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
  ): Observable<{ workloads: Workload[]; total: number }> {
    return this.http.get<{ workloads: Workload[]; total: number }>(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${namespace}/workloads`
    );
  }

  getWorkloadDetail(
    clusterId: number,
    namespace: string,
    name: string
  ): Observable<WorkloadDetail> {
    return this.http.get<WorkloadDetail>(
      `${this.baseUrl}/clusters/${clusterId}/namespaces/${namespace}/workloads/${name}`
    );
  }

  deploy(
    clusterId: number,
    namespace: string,
    data: DeployRequest
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
