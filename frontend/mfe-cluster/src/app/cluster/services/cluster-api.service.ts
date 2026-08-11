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

export interface ClusterHealth {
  cluster_id: number;
  cluster_name: string;
  status: string;
  version: string | null;
  nodes_count: number;
  nodes: NodeInfo[];
  components: ComponentInfo[];
  last_check: string;
}

export interface NodeInfo {
  name: string;
  status: string;
  roles: string[];
  version: string;
  os: string;
  cpu: string;
  memory: string;
}

export interface ComponentInfo {
  name: string;
  status: string;
}

export interface ClusterCreateRequest {
  name: string;
  description?: string;
  api_server_url: string;
  kubeconfig: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClusterApiService {
  private baseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api`;

  constructor(private http: HttpClient) {}

  getClusters(): Observable<{ clusters: Cluster[]; total: number }> {
    return this.http.get<{ clusters: Cluster[]; total: number }>(
      `${this.baseUrl}/clusters`
    );
  }

  getCluster(id: number): Observable<Cluster> {
    return this.http.get<Cluster>(`${this.baseUrl}/clusters/${id}`);
  }

  addCluster(data: ClusterCreateRequest): Observable<Cluster> {
    return this.http.post<Cluster>(`${this.baseUrl}/clusters`, data);
  }

  deleteCluster(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clusters/${id}`);
  }

  healthCheck(id: number): Observable<ClusterHealth> {
    return this.http.get<ClusterHealth>(
      `${this.baseUrl}/clusters/${id}/health`
    );
  }
}
