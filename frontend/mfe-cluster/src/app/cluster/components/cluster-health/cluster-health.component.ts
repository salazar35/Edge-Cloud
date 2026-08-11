import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ClusterApiService,
  ClusterHealth,
  NodeInfo,
} from '../../services/cluster-api.service';

@Component({
  selector: 'cluster-health',
  template: `
    <div class="health-page">
      <div class="page-header">
        <button class="btn btn-outline" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back
        </button>
        <h2>Health Check: {{ health?.cluster_name || 'Loading...' }}</h2>
        <button class="btn btn-primary" (click)="refresh()" [disabled]="loading">
          <span class="material-icons" [class.spinning]="loading">refresh</span>
          Refresh
        </button>
      </div>

      <div *ngIf="health" class="health-content">
        <!-- Overview -->
        <div class="health-overview">
          <div class="overview-card" [ngClass]="health.status">
            <span class="material-icons">{{
              health.status === 'connected' ? 'check_circle' : 'error'
            }}</span>
            <div>
              <div class="overview-status">{{ health.status | titlecase }}</div>
              <div class="overview-label">Cluster Status</div>
            </div>
          </div>
          <div class="overview-card">
            <span class="material-icons">info</span>
            <div>
              <div class="overview-status">v{{ health.version || 'N/A' }}</div>
              <div class="overview-label">K8s Version</div>
            </div>
          </div>
          <div class="overview-card">
            <span class="material-icons">memory</span>
            <div>
              <div class="overview-status">{{ health.nodes_count }}</div>
              <div class="overview-label">Total Nodes</div>
            </div>
          </div>
          <div class="overview-card">
            <span class="material-icons">schedule</span>
            <div>
              <div class="overview-status">{{ health.last_check | date: 'short' }}</div>
              <div class="overview-label">Last Check</div>
            </div>
          </div>
        </div>

        <!-- Nodes -->
        <div class="section-card">
          <h3>
            <span class="material-icons">computer</span>
            Nodes
          </h3>
          <table class="table" *ngIf="health.nodes.length > 0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Roles</th>
                <th>Version</th>
                <th>OS</th>
                <th>CPU</th>
                <th>Memory</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let node of health.nodes">
                <td class="mono">{{ node.name }}</td>
                <td>
                  <span
                    class="status-badge"
                    [ngClass]="node.status === 'Ready' ? 'connected' : 'error'"
                  >
                    {{ node.status }}
                  </span>
                </td>
                <td>{{ node.roles.join(', ') }}</td>
                <td>{{ node.version }}</td>
                <td>{{ node.os }}</td>
                <td>{{ node.cpu }}</td>
                <td>{{ node.memory }}</td>
              </tr>
            </tbody>
          </table>
          <p class="no-data" *ngIf="health.nodes.length === 0">
            No node information available
          </p>
        </div>

        <!-- Components -->
        <div class="section-card" *ngIf="health.components.length > 0">
          <h3>
            <span class="material-icons">settings</span>
            Components
          </h3>
          <div class="components-grid">
            <div
              class="component-item"
              *ngFor="let comp of health.components"
              [ngClass]="comp.status === 'Healthy' ? 'healthy' : 'unhealthy'"
            >
              <span class="material-icons">{{
                comp.status === 'Healthy' ? 'check_circle' : 'cancel'
              }}</span>
              <span>{{ comp.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading && !health">
        <span class="material-icons spinning">sync</span>
        <p>Running health check...</p>
      </div>

      <div class="error-state" *ngIf="error">
        <span class="material-icons">error</span>
        <p>{{ error }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .page-header h2 {
        font-size: 24px;
        font-weight: 600;
        flex: 1;
      }

      .health-overview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }

      .overview-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .overview-card .material-icons {
        font-size: 28px;
        color: var(--primary-light);
      }

      .overview-card.connected .material-icons {
        color: #4caf50;
      }

      .overview-card.error .material-icons,
      .overview-card.disconnected .material-icons {
        color: #f44336;
      }

      .overview-status {
        font-size: 16px;
        font-weight: 600;
      }

      .overview-label {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .section-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
      }

      .section-card h3 {
        display: flex;
        align-items: center;
        gap: 8px;
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
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
      }

      .table th {
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.5px;
      }

      .mono {
        font-family: monospace;
      }

      .components-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 8px;
      }

      .component-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 13px;
      }

      .component-item.healthy {
        background: rgba(76, 175, 80, 0.1);
        color: #4caf50;
      }

      .component-item.unhealthy {
        background: rgba(244, 67, 54, 0.1);
        color: #f44336;
      }

      .component-item .material-icons {
        font-size: 18px;
      }

      .no-data {
        color: var(--text-secondary);
        text-align: center;
        padding: 20px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 500;
      }

      .status-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .status-badge.connected {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }
      .status-badge.connected::before {
        background: #4caf50;
      }

      .status-badge.error {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
      }
      .status-badge.error::before {
        background: #f44336;
      }

      .loading,
      .error-state {
        text-align: center;
        padding: 60px;
        color: var(--text-secondary);
      }

      .spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-primary {
        background: var(--primary);
        color: white;
      }
      .btn-primary:hover {
        background: var(--primary-dark);
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-outline {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }
      .btn-outline:hover {
        border-color: var(--primary);
      }
    `,
  ],
})
export class ClusterHealthComponent implements OnInit {
  health: ClusterHealth | null = null;
  loading = false;
  error = '';
  private clusterId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clusterApi: ClusterApiService
  ) {}

  ngOnInit(): void {
    this.clusterId = Number(this.route.snapshot.paramMap.get('id'));
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';

    this.clusterApi.healthCheck(this.clusterId).subscribe({
      next: (health) => {
        this.health = health;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Health check failed';
        this.loading = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/clusters', this.clusterId]);
  }
}
