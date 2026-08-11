import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkloadApiService, Workload } from '../../services/workload-api.service';

@Component({
  selector: 'workload-list',
  template: `
    <div class="workload-list-page">
      <div class="page-header">
        <button class="btn btn-outline" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back
        </button>
        <h2>Workloads - {{ namespace }}</h2>
        <button class="btn btn-primary" (click)="goToDeploy()">
          <span class="material-icons">rocket_launch</span>
          Deploy New
        </button>
      </div>

      <div class="card" *ngIf="!loading">
        <table class="table" *ngIf="workloads.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Replicas</th>
              <th>Images</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let w of workloads">
              <td>
                <a class="workload-link" (click)="viewDetail(w)">{{ w.name }}</a>
              </td>
              <td>
                <span class="kind-badge">{{ w.kind }}</span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="w.status.toLowerCase()">
                  {{ w.status }}
                </span>
              </td>
              <td>
                <span class="replica-info">
                  {{ w.ready_replicas || 0 }}/{{ w.replicas || 0 }}
                </span>
              </td>
              <td>
                <span class="image-tag" *ngFor="let img of w.images">
                  {{ shortenImage(img) }}
                </span>
              </td>
              <td>{{ w.created_at | date: 'short' }}</td>
              <td class="actions-cell">
                <button
                  class="btn btn-sm btn-outline"
                  (click)="scaleWorkload(w)"
                  title="Scale"
                >
                  <span class="material-icons">tune</span>
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  (click)="deleteWorkload(w)"
                  title="Delete"
                >
                  <span class="material-icons">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="empty-state" *ngIf="workloads.length === 0">
          <span class="material-icons">widgets</span>
          <p>No workloads found in this namespace.</p>
          <button class="btn btn-primary" (click)="goToDeploy()">
            Deploy First Workload
          </button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <span class="material-icons spinning">sync</span> Loading workloads...
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
        flex: 1;
        font-size: 24px;
        font-weight: 600;
      }

      .card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
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
        font-size: 11px;
        text-transform: uppercase;
      }

      .workload-link {
        color: var(--primary-light);
        cursor: pointer;
        font-weight: 500;
      }

      .workload-link:hover {
        text-decoration: underline;
      }

      .kind-badge {
        padding: 2px 8px;
        background: rgba(0, 188, 212, 0.1);
        color: var(--accent);
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      }

      .status-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .status-badge.running {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }
      .status-badge.running::before {
        background: #4caf50;
      }

      .status-badge.pending,
      .status-badge.partial {
        background: rgba(255, 152, 0, 0.15);
        color: #ff9800;
      }
      .status-badge.pending::before,
      .status-badge.partial::before {
        background: #ff9800;
      }

      .replica-info {
        font-family: monospace;
        font-size: 13px;
      }

      .image-tag {
        display: inline-block;
        padding: 2px 6px;
        background: var(--bg-dark);
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        color: var(--text-secondary);
        margin-right: 4px;
      }

      .actions-cell {
        display: flex;
        gap: 4px;
      }

      .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--text-secondary);
      }

      .empty-state .material-icons {
        font-size: 48px;
        color: var(--border-color);
        margin-bottom: 12px;
      }

      .empty-state p {
        margin-bottom: 16px;
      }

      .loading {
        text-align: center;
        padding: 40px;
        color: var(--text-secondary);
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

      .btn-sm {
        padding: 6px 10px;
        font-size: 12px;
      }

      .btn-primary {
        background: var(--primary);
        color: white;
      }

      .btn-outline {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }

      .btn-danger {
        background: rgba(244, 67, 54, 0.1);
        color: #f44336;
        border: none;
      }

      .spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class WorkloadListComponent implements OnInit {
  workloads: Workload[] = [];
  loading = true;
  clusterId!: number;
  namespace = 'default';

  constructor(
    private api: WorkloadApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clusterId = Number(this.route.snapshot.queryParamMap.get('cluster'));
    this.namespace = this.route.snapshot.queryParamMap.get('namespace') || 'default';
    this.loadWorkloads();
  }

  loadWorkloads(): void {
    this.loading = true;
    this.api.getWorkloads(this.clusterId, this.namespace).subscribe({
      next: (res) => {
        this.workloads = res.workloads;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  viewDetail(w: Workload): void {
    this.router.navigate(['/workloads', 'detail', w.name], {
      queryParams: {
        cluster: this.clusterId,
        namespace: this.namespace,
      },
    });
  }

  scaleWorkload(w: Workload): void {
    const replicas = prompt(`Scale "${w.name}" to how many replicas?`, String(w.replicas || 1));
    if (replicas !== null) {
      const count = parseInt(replicas, 10);
      if (!isNaN(count) && count >= 0) {
        this.api.scaleWorkload(this.clusterId, this.namespace, w.name, count).subscribe({
          next: () => {
            this.loadWorkloads();
          },
        });
      }
    }
  }

  deleteWorkload(w: Workload): void {
    if (confirm(`Delete workload "${w.name}"? This action cannot be undone.`)) {
      this.api.deleteWorkload(this.clusterId, this.namespace, w.name).subscribe({
        next: () => {
          this.workloads = this.workloads.filter((wl) => wl.name !== w.name);
        },
      });
    }
  }

  goToDeploy(): void {
    this.router.navigate(['/workloads', 'deploy'], {
      queryParams: { cluster: this.clusterId, namespace: this.namespace },
    });
  }

  goBack(): void {
    this.router.navigate(['/workloads'], {
      queryParams: { cluster: this.clusterId },
    });
  }

  shortenImage(image: string): string {
    const parts = image.split('/');
    return parts[parts.length - 1];
  }
}
