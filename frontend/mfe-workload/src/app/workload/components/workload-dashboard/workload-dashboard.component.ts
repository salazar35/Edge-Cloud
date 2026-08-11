import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkloadApiService, Cluster, Namespace } from '../../services/workload-api.service';

@Component({
  selector: 'workload-dashboard',
  template: `
    <div class="workload-dashboard">
      <div class="page-header">
        <h2>Workload Management</h2>
      </div>

      <!-- Cluster Selector -->
      <div class="selector-bar">
        <div class="selector-group">
          <label>Cluster</label>
          <select
            [(ngModel)]="selectedClusterId"
            (ngModelChange)="onClusterChange()"
          >
            <option [ngValue]="null">Select a cluster...</option>
            <option *ngFor="let c of clusters" [ngValue]="c.id">
              {{ c.name }} ({{ c.status }})
            </option>
          </select>
        </div>

        <div class="selector-group" *ngIf="selectedClusterId">
          <label>Namespace</label>
          <select
            [(ngModel)]="selectedNamespace"
            (ngModelChange)="onNamespaceChange()"
          >
            <option value="">All namespaces</option>
            <option *ngFor="let ns of namespaces" [value]="ns.name">
              {{ ns.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="actions-bar" *ngIf="selectedClusterId">
        <button class="btn btn-primary" (click)="goToDeploy()">
          <span class="material-icons">rocket_launch</span>
          Deploy New Workload
        </button>
        <button class="btn btn-outline" (click)="goToNamespaces()">
          <span class="material-icons">folder</span>
          Manage Namespaces
        </button>
        <button class="btn btn-outline" (click)="goToWorkloads()">
          <span class="material-icons">list</span>
          View All Workloads
        </button>
      </div>

      <!-- No cluster selected -->
      <div class="empty-state" *ngIf="!selectedClusterId">
        <span class="material-icons">apps</span>
        <h3>Select a Cluster</h3>
        <p>Choose a cluster above to manage its workloads and namespaces.</p>
      </div>

      <!-- Workload Summary when cluster is selected -->
      <div class="summary" *ngIf="selectedClusterId && workloadSummary">
        <div class="summary-card">
          <span class="material-icons">folder</span>
          <div class="summary-info">
            <div class="summary-value">{{ namespaces.length }}</div>
            <div class="summary-label">Namespaces</div>
          </div>
        </div>
        <div class="summary-card">
          <span class="material-icons">widgets</span>
          <div class="summary-info">
            <div class="summary-value">{{ workloadSummary.total }}</div>
            <div class="summary-label">Workloads</div>
          </div>
        </div>
        <div class="summary-card running">
          <span class="material-icons">check_circle</span>
          <div class="summary-info">
            <div class="summary-value">{{ workloadSummary.running }}</div>
            <div class="summary-label">Running</div>
          </div>
        </div>
        <div class="summary-card pending">
          <span class="material-icons">schedule</span>
          <div class="summary-info">
            <div class="summary-value">{{ workloadSummary.pending }}</div>
            <div class="summary-label">Pending</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 24px;
      }

      .page-header h2 {
        font-size: 24px;
        font-weight: 600;
      }

      .selector-bar {
        display: flex;
        gap: 16px;
        margin-bottom: 20px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 16px 20px;
      }

      .selector-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 200px;
      }

      .selector-group label {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .selector-group select {
        padding: 8px 12px;
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 14px;
        cursor: pointer;
      }

      .selector-group select:focus {
        outline: none;
        border-color: var(--primary);
      }

      .actions-bar {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-top: 24px;
      }

      .summary-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .summary-card .material-icons {
        font-size: 28px;
        color: var(--primary-light);
      }

      .summary-card.running .material-icons {
        color: var(--success);
      }

      .summary-card.pending .material-icons {
        color: var(--warning);
      }

      .summary-value {
        font-size: 20px;
        font-weight: 700;
      }

      .summary-label {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
      }

      .empty-state .material-icons {
        font-size: 64px;
        color: var(--border-color);
        margin-bottom: 16px;
      }

      .empty-state h3 {
        color: var(--text-primary);
        margin-bottom: 8px;
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
    `,
  ],
})
export class WorkloadDashboardComponent implements OnInit {
  clusters: Cluster[] = [];
  namespaces: Namespace[] = [];
  selectedClusterId: number | null = null;
  selectedNamespace = '';
  workloadSummary: { total: number; running: number; pending: number } | null =
    null;

  constructor(
    private api: WorkloadApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadClusters();

    // Check for query params (coming from cluster detail page)
    const queryCluster = this.route.snapshot.queryParamMap.get('cluster');
    if (queryCluster) {
      this.selectedClusterId = Number(queryCluster);
      this.onClusterChange();
    }
  }

  loadClusters(): void {
    this.api.getClusters().subscribe({
      next: (res) => {
        this.clusters = res.clusters;
      },
    });
  }

  onClusterChange(): void {
    if (!this.selectedClusterId) {
      this.namespaces = [];
      this.workloadSummary = null;
      return;
    }

    this.api.getNamespaces(this.selectedClusterId).subscribe({
      next: (res) => {
        this.namespaces = res.namespaces;
      },
    });

    this.loadWorkloadSummary();
  }

  onNamespaceChange(): void {
    this.loadWorkloadSummary();
  }

  loadWorkloadSummary(): void {
    if (!this.selectedClusterId) return;

    const ns = this.selectedNamespace || 'default';
    this.api.getWorkloads(this.selectedClusterId, ns).subscribe({
      next: (res) => {
        this.workloadSummary = {
          total: res.total,
          running: res.workloads.filter((w) => w.status === 'Running').length,
          pending: res.workloads.filter((w) => w.status !== 'Running').length,
        };
      },
      error: () => {
        this.workloadSummary = { total: 0, running: 0, pending: 0 };
      },
    });
  }

  goToDeploy(): void {
    this.router.navigate(['/workloads', 'deploy'], {
      queryParams: {
        cluster: this.selectedClusterId,
        namespace: this.selectedNamespace,
      },
    });
  }

  goToNamespaces(): void {
    this.router.navigate(['/workloads', 'namespaces'], {
      queryParams: { cluster: this.selectedClusterId },
    });
  }

  goToWorkloads(): void {
    this.router.navigate(['/workloads', 'list'], {
      queryParams: {
        cluster: this.selectedClusterId,
        namespace: this.selectedNamespace,
      },
    });
  }
}
