import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ClusterSummary {
  id: number;
  name: string;
  status: string;
  nodes_count: number;
  version: string | null;
}

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <span class="material-icons">dns</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ clusters.length }}</div>
            <div class="stat-label">Total Clusters</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon connected">
            <span class="material-icons">check_circle</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ connectedCount }}</div>
            <div class="stat-label">Connected</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon error">
            <span class="material-icons">error</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ errorCount }}</div>
            <div class="stat-label">Errors</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <span class="material-icons">memory</span>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ totalNodes }}</div>
            <div class="stat-label">Total Nodes</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Cluster Overview</h3>
        <table class="table" *ngIf="clusters.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Version</th>
              <th>Nodes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cluster of clusters">
              <td>
                <a [routerLink]="['/clusters', cluster.id]">{{
                  cluster.name
                }}</a>
              </td>
              <td>
                <span class="status-badge" [ngClass]="cluster.status">
                  {{ cluster.status }}
                </span>
              </td>
              <td>{{ cluster.version || 'N/A' }}</td>
              <td>{{ cluster.nodes_count }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" *ngIf="clusters.length === 0">
          <span class="material-icons">cloud_off</span>
          <p>No clusters registered yet.</p>
          <a routerLink="/clusters" class="btn btn-primary">Add Cluster</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-card {
        background: #16213e;
        border: 1px solid #2a3a5e;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(25, 118, 210, 0.15);
        color: #42a5f5;
      }

      .stat-icon.connected {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }

      .stat-icon.error {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
      }

      .stat-label {
        font-size: 13px;
        color: #b0bec5;
      }

      .card {
        background: #16213e;
        border: 1px solid #2a3a5e;
        border-radius: 12px;
        padding: 24px;
      }

      .card-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
      }

      .table th,
      .table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #2a3a5e;
      }

      .table th {
        font-weight: 600;
        color: #b0bec5;
        font-size: 12px;
        text-transform: uppercase;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }

      .status-badge.connected {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }

      .status-badge.error,
      .status-badge.disconnected {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
      }

      .empty-state {
        text-align: center;
        padding: 48px;
        color: #b0bec5;
      }

      .empty-state .material-icons {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .empty-state p {
        margin-bottom: 16px;
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        padding: 10px 20px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 8px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
      }

      a {
        color: #42a5f5;
        text-decoration: none;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  clusters: ClusterSummary[] = [];

  get connectedCount(): number {
    return this.clusters.filter((c) => c.status === 'connected').length;
  }

  get errorCount(): number {
    return this.clusters.filter(
      (c) => c.status === 'error' || c.status === 'disconnected'
    ).length;
  }

  get totalNodes(): number {
    return this.clusters.reduce((sum, c) => sum + c.nodes_count, 0);
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadClusters();
  }

  loadClusters(): void {
    const apiBase = `${window.location.protocol}//${window.location.hostname}:8000`;
    this.http
      .get<{ clusters: ClusterSummary[]; total: number }>(
        `${apiBase}/api/clusters`
      )
      .subscribe({
        next: (res) => {
          this.clusters = res.clusters;
        },
        error: (err) => {
          console.error('Failed to load clusters:', err);
        },
      });
  }
}
