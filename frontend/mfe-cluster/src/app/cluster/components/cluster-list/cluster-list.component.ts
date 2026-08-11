import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  ClusterApiService,
  Cluster,
} from '../../services/cluster-api.service';

@Component({
  selector: 'cluster-list',
  template: `
    <div class="cluster-list">
      <div class="page-header">
        <h2>Kubernetes Clusters</h2>
        <button class="btn btn-primary" (click)="goToAdd()">
          <span class="material-icons">add</span>
          Add Cluster
        </button>
      </div>

      <div class="clusters-grid" *ngIf="clusters.length > 0">
        <div
          class="cluster-card"
          *ngFor="let cluster of clusters"
          (click)="goToDetail(cluster.id)"
        >
          <div class="cluster-card-header">
            <div class="cluster-icon">
              <span class="material-icons">dns</span>
            </div>
            <span class="status-badge" [ngClass]="cluster.status">
              {{ cluster.status }}
            </span>
          </div>

          <h3 class="cluster-name">{{ cluster.name }}</h3>
          <p class="cluster-desc" *ngIf="cluster.description">
            {{ cluster.description }}
          </p>

          <div class="cluster-meta">
            <div class="meta-item">
              <span class="material-icons">memory</span>
              <span>{{ cluster.nodes_count }} nodes</span>
            </div>
            <div class="meta-item" *ngIf="cluster.version">
              <span class="material-icons">info</span>
              <span>v{{ cluster.version }}</span>
            </div>
          </div>

          <div class="cluster-actions">
            <button
              class="btn btn-outline btn-sm"
              (click)="runHealthCheck(cluster, $event)"
              [disabled]="loadingHealth[cluster.id]"
            >
              <span class="material-icons">monitor_heart</span>
              Health Check
            </button>
            <button
              class="btn btn-danger btn-sm"
              (click)="deleteCluster(cluster, $event)"
            >
              <span class="material-icons">delete</span>
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="clusters.length === 0 && !loading">
        <span class="material-icons">cloud_off</span>
        <h3>No clusters registered</h3>
        <p>Add your first Kubernetes cluster to get started.</p>
        <button class="btn btn-primary" (click)="goToAdd()">
          <span class="material-icons">add</span>
          Add First Cluster
        </button>
      </div>

      <div class="loading" *ngIf="loading">
        <span class="material-icons spinning">sync</span>
        <p>Loading clusters...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .page-header h2 {
        font-size: 24px;
        font-weight: 600;
      }

      .clusters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
      }

      .cluster-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .cluster-card:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
      }

      .cluster-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .cluster-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: rgba(25, 118, 210, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-light);
      }

      .cluster-name {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .cluster-desc {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 12px;
      }

      .cluster-meta {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: var(--text-secondary);
      }

      .meta-item .material-icons {
        font-size: 16px;
      }

      .cluster-actions {
        display: flex;
        gap: 8px;
        border-top: 1px solid var(--border-color);
        padding-top: 12px;
      }

      .btn-sm {
        padding: 6px 12px;
        font-size: 12px;
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
      }

      .empty-state .material-icons {
        font-size: 64px;
        margin-bottom: 16px;
        color: var(--border-color);
      }

      .empty-state h3 {
        margin-bottom: 8px;
        color: var(--text-primary);
      }

      .empty-state p {
        margin-bottom: 20px;
      }

      .loading {
        text-align: center;
        padding: 40px;
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

      .status-badge.disconnected,
      .status-badge.error {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
      }
      .status-badge.disconnected::before,
      .status-badge.error::before {
        background: #f44336;
      }

      .status-badge.unknown {
        background: rgba(255, 152, 0, 0.15);
        color: #ff9800;
      }
      .status-badge.unknown::before {
        background: #ff9800;
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
    `,
  ],
})
export class ClusterListComponent implements OnInit {
  clusters: Cluster[] = [];
  loading = true;
  loadingHealth: Record<number, boolean> = {};

  constructor(
    private clusterApi: ClusterApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClusters();
  }

  loadClusters(): void {
    this.loading = true;
    this.clusterApi.getClusters().subscribe({
      next: (res) => {
        this.clusters = res.clusters;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  goToAdd(): void {
    this.router.navigate(['/clusters', 'add']);
  }

  goToDetail(id: number): void {
    this.router.navigate(['/clusters', id]);
  }

  runHealthCheck(cluster: Cluster, event: Event): void {
    event.stopPropagation();
    this.loadingHealth[cluster.id] = true;

    this.clusterApi.healthCheck(cluster.id).subscribe({
      next: (health) => {
        cluster.status = health.status;
        cluster.nodes_count = health.nodes_count;
        cluster.version = health.version;
        this.loadingHealth[cluster.id] = false;
      },
      error: () => {
        this.loadingHealth[cluster.id] = false;
      },
    });
  }

  deleteCluster(cluster: Cluster, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to remove cluster "${cluster.name}"?`)) {
      this.clusterApi.deleteCluster(cluster.id).subscribe({
        next: () => {
          this.clusters = this.clusters.filter((c) => c.id !== cluster.id);
        },
      });
    }
  }
}
