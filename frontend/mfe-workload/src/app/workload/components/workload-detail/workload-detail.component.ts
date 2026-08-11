import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkloadApiService, WorkloadDetail } from '../../services/workload-api.service';

@Component({
  selector: 'workload-detail',
  template: `
    <div class="detail-page">
      <div class="page-header">
        <button class="btn btn-outline" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back
        </button>
        <h2>{{ workload?.name || 'Loading...' }}</h2>
        <span class="kind-badge" *ngIf="workload">{{ workload.kind }}</span>
        <span class="status-badge" *ngIf="workload" [ngClass]="workload.status.toLowerCase()">
          {{ workload.status }}
        </span>
      </div>

      <div *ngIf="workload" class="detail-content">
        <!-- Overview -->
        <div class="detail-grid">
          <div class="info-card">
            <h3>Overview</h3>
            <div class="info-row">
              <span class="label">Kind</span>
              <span>{{ workload.kind }}</span>
            </div>
            <div class="info-row">
              <span class="label">Namespace</span>
              <span class="mono">{{ workload.namespace }}</span>
            </div>
            <div class="info-row">
              <span class="label">Replicas</span>
              <span>{{ workload.ready_replicas || 0 }}/{{ workload.replicas || 0 }} ready</span>
            </div>
            <div class="info-row">
              <span class="label">Images</span>
              <span class="mono">{{ workload.images.join(', ') }}</span>
            </div>
            <div class="info-row">
              <span class="label">Created</span>
              <span>{{ workload.created_at | date: 'medium' }}</span>
            </div>
          </div>

          <div class="actions-card">
            <h3>Actions</h3>
            <button class="btn btn-outline action-btn" (click)="scale()">
              <span class="material-icons">tune</span>
              Scale
            </button>
            <button class="btn btn-danger action-btn" (click)="delete()">
              <span class="material-icons">delete</span>
              Delete Workload
            </button>
          </div>
        </div>

        <!-- Pods -->
        <div class="section-card">
          <h3>
            <span class="material-icons">view_in_ar</span>
            Pods ({{ workload.pods.length }})
          </h3>
          <table class="table" *ngIf="workload.pods.length > 0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Node</th>
                <th>IP</th>
                <th>Restarts</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pod of workload.pods">
                <td class="mono">{{ pod.name }}</td>
                <td>
                  <span
                    class="status-badge"
                    [ngClass]="pod.status === 'Running' ? 'running' : 'pending'"
                  >
                    {{ pod.status }}
                  </span>
                </td>
                <td>{{ pod.node || 'Pending' }}</td>
                <td class="mono">{{ pod.ip || '-' }}</td>
                <td>{{ pod.restarts }}</td>
              </tr>
            </tbody>
          </table>
          <p class="no-data" *ngIf="workload.pods.length === 0">No pods found</p>
        </div>

        <!-- Conditions -->
        <div class="section-card" *ngIf="workload.conditions.length > 0">
          <h3>
            <span class="material-icons">rule</span>
            Conditions
          </h3>
          <table class="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cond of workload.conditions">
                <td>{{ cond.type }}</td>
                <td>
                  <span
                    class="status-badge"
                    [ngClass]="cond.status === 'True' ? 'running' : 'pending'"
                  >
                    {{ cond.status }}
                  </span>
                </td>
                <td>{{ cond.reason }}</td>
                <td>{{ cond.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Events -->
        <div class="section-card" *ngIf="workload.events.length > 0">
          <h3>
            <span class="material-icons">event_note</span>
            Recent Events
          </h3>
          <div class="event-list">
            <div
              *ngFor="let event of workload.events"
              class="event-item"
              [ngClass]="event.type === 'Warning' ? 'warning' : 'normal'"
            >
              <span class="material-icons">{{
                event.type === 'Warning' ? 'warning' : 'info'
              }}</span>
              <div class="event-content">
                <div class="event-reason">{{ event.reason }}</div>
                <div class="event-message">{{ event.message }}</div>
                <div class="event-time">{{ event.timestamp }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="!workload && !error">
        <span class="material-icons spinning">sync</span> Loading...
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
        gap: 12px;
        margin-bottom: 24px;
      }

      .page-header h2 {
        font-size: 22px;
        font-weight: 600;
      }

      .kind-badge {
        padding: 3px 10px;
        background: rgba(0, 188, 212, 0.1);
        color: var(--accent);
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }

      .info-card,
      .actions-card,
      .section-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
      }

      .section-card {
        margin-bottom: 16px;
      }

      .info-card h3,
      .actions-card h3,
      .section-card h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
      }

      .info-row:last-child {
        border-bottom: none;
      }

      .info-row .label {
        color: var(--text-secondary);
      }

      .mono {
        font-family: monospace;
        font-size: 12px;
      }

      .action-btn {
        width: 100%;
        justify-content: center;
        margin-bottom: 8px;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
      }

      .table th,
      .table td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
        font-size: 12px;
      }

      .table th {
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        font-size: 11px;
      }

      .event-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .event-item {
        display: flex;
        gap: 10px;
        padding: 10px;
        border-radius: 8px;
        background: rgba(25, 118, 210, 0.05);
      }

      .event-item.warning {
        background: rgba(255, 152, 0, 0.08);
      }

      .event-item .material-icons {
        font-size: 18px;
        color: var(--primary-light);
      }

      .event-item.warning .material-icons {
        color: var(--warning);
      }

      .event-reason {
        font-weight: 500;
        font-size: 13px;
      }

      .event-message {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .event-time {
        font-size: 11px;
        color: var(--text-secondary);
        margin-top: 2px;
      }

      .no-data {
        text-align: center;
        color: var(--text-secondary);
        padding: 16px;
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

      .loading,
      .error-state {
        text-align: center;
        padding: 60px;
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

      @media (max-width: 768px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class WorkloadDetailComponent implements OnInit {
  workload: WorkloadDetail | null = null;
  error = '';
  clusterId!: number;
  namespace = 'default';
  workloadName = '';

  constructor(
    private api: WorkloadApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clusterId = Number(this.route.snapshot.queryParamMap.get('cluster'));
    this.namespace = this.route.snapshot.queryParamMap.get('namespace') || 'default';
    this.workloadName = this.route.snapshot.paramMap.get('name') || '';
    this.loadDetail();
  }

  loadDetail(): void {
    this.api
      .getWorkloadDetail(this.clusterId, this.namespace, this.workloadName)
      .subscribe({
        next: (detail) => {
          this.workload = detail;
        },
        error: (err) => {
          this.error = err.error?.detail || 'Failed to load workload details';
        },
      });
  }

  scale(): void {
    const replicas = prompt(
      `Scale "${this.workloadName}" to how many replicas?`,
      String(this.workload?.replicas || 1)
    );
    if (replicas !== null) {
      const count = parseInt(replicas, 10);
      if (!isNaN(count) && count >= 0) {
        this.api
          .scaleWorkload(this.clusterId, this.namespace, this.workloadName, count)
          .subscribe({
            next: () => {
              this.loadDetail();
            },
          });
      }
    }
  }

  delete(): void {
    if (
      confirm(`Delete workload "${this.workloadName}"? This cannot be undone.`)
    ) {
      this.api
        .deleteWorkload(this.clusterId, this.namespace, this.workloadName)
        .subscribe({
          next: () => {
            this.goBack();
          },
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/workloads', 'list'], {
      queryParams: { cluster: this.clusterId, namespace: this.namespace },
    });
  }
}
