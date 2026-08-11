import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ClusterApiService,
  Cluster,
} from '../../services/cluster-api.service';

@Component({
  selector: 'cluster-detail',
  template: `
    <div class="cluster-detail" *ngIf="cluster">
      <div class="page-header">
        <button class="btn btn-outline" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back
        </button>
        <h2>{{ cluster.name }}</h2>
        <span class="status-badge" [ngClass]="cluster.status">
          {{ cluster.status }}
        </span>
      </div>

      <div class="detail-grid">
        <div class="info-card">
          <h3>Cluster Information</h3>
          <div class="info-row">
            <span class="info-label">Name</span>
            <span class="info-value">{{ cluster.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Description</span>
            <span class="info-value">{{ cluster.description || 'N/A' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">API Server</span>
            <span class="info-value mono">{{ cluster.api_server_url }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Version</span>
            <span class="info-value">{{ cluster.version || 'Unknown' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nodes</span>
            <span class="info-value">{{ cluster.nodes_count }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Registered</span>
            <span class="info-value">{{ cluster.created_at | date: 'medium' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Last Health Check</span>
            <span class="info-value">{{
              cluster.last_health_check
                ? (cluster.last_health_check | date: 'medium')
                : 'Never'
            }}</span>
          </div>
        </div>

        <div class="actions-card">
          <h3>Actions</h3>
          <button class="btn btn-primary action-btn" (click)="goToHealth()">
            <span class="material-icons">monitor_heart</span>
            Run Health Check
          </button>
          <button class="btn btn-outline action-btn" (click)="goToNamespaces()">
            <span class="material-icons">folder</span>
            View Namespaces
          </button>
          <button class="btn btn-outline action-btn" (click)="goToWorkloads()">
            <span class="material-icons">widgets</span>
            View Workloads
          </button>
          <button class="btn btn-danger action-btn" (click)="deleteCluster()">
            <span class="material-icons">delete</span>
            Remove Cluster
          </button>
        </div>
      </div>
    </div>

    <div class="loading" *ngIf="!cluster && !error">
      <span class="material-icons spinning">sync</span>
      <p>Loading cluster details...</p>
    </div>

    <div class="error-state" *ngIf="error">
      <span class="material-icons">error</span>
      <p>{{ error }}</p>
      <button class="btn btn-outline" (click)="goBack()">Go Back</button>
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
      }

      .detail-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 16px;
      }

      .info-card,
      .actions-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 24px;
      }

      .info-card h3,
      .actions-card h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-color);
      }

      .info-row:last-child {
        border-bottom: none;
      }

      .info-label {
        color: var(--text-secondary);
        font-size: 13px;
      }

      .info-value {
        font-size: 14px;
        font-weight: 500;
      }

      .info-value.mono {
        font-family: monospace;
        font-size: 12px;
      }

      .action-btn {
        width: 100%;
        justify-content: center;
        margin-bottom: 8px;
      }

      .loading,
      .error-state {
        text-align: center;
        padding: 60px;
        color: var(--text-secondary);
      }

      .loading .material-icons,
      .error-state .material-icons {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 500;
      }

      .status-badge::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      .status-badge.connected {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }
      .status-badge.connected::before {
        background: #4caf50;
      }

      .status-badge.error,
      .status-badge.disconnected {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
      }
      .status-badge.error::before,
      .status-badge.disconnected::before {
        background: #f44336;
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

      .btn-outline {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }
      .btn-outline:hover {
        border-color: var(--primary);
      }

      .btn-danger {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
        border: none;
      }
      .btn-danger:hover {
        background: rgba(244, 67, 54, 0.3);
      }

      @media (max-width: 768px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ClusterDetailComponent implements OnInit {
  cluster: Cluster | null = null;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clusterApi: ClusterApiService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCluster(id);
  }

  loadCluster(id: number): void {
    this.clusterApi.getCluster(id).subscribe({
      next: (cluster) => {
        this.cluster = cluster;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Failed to load cluster';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/clusters']);
  }

  goToHealth(): void {
    this.router.navigate(['/clusters', this.cluster!.id, 'health']);
  }

  goToNamespaces(): void {
    this.router.navigate(['/workloads'], {
      queryParams: { cluster: this.cluster!.id },
    });
  }

  goToWorkloads(): void {
    this.router.navigate(['/workloads'], {
      queryParams: { cluster: this.cluster!.id },
    });
  }

  deleteCluster(): void {
    if (
      confirm(
        `Are you sure you want to remove cluster "${this.cluster!.name}"?`
      )
    ) {
      this.clusterApi.deleteCluster(this.cluster!.id).subscribe({
        next: () => {
          this.router.navigate(['/clusters']);
        },
      });
    }
  }
}
