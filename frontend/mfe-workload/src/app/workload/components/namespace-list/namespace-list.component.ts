import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WorkloadApiService, Namespace } from '../../services/workload-api.service';

@Component({
  selector: 'namespace-list',
  template: `
    <div class="namespace-page">
      <div class="page-header">
        <button class="btn btn-outline" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back
        </button>
        <h2>Namespaces</h2>
        <button class="btn btn-primary" (click)="showCreateForm = !showCreateForm">
          <span class="material-icons">add</span>
          Create Namespace
        </button>
      </div>

      <!-- Create Form -->
      <div class="create-form card" *ngIf="showCreateForm">
        <h3>Create New Namespace</h3>
        <form [formGroup]="form" (ngSubmit)="onCreate()">
          <div class="form-row">
            <div class="form-group">
              <label>Namespace Name</label>
              <input
                type="text"
                formControlName="name"
                placeholder="e.g., staging"
              />
              <div class="error" *ngIf="form.get('name')?.touched && form.get('name')?.errors?.['required']">
                Name is required
              </div>
              <div class="error" *ngIf="form.get('name')?.touched && form.get('name')?.errors?.['pattern']">
                Must be lowercase alphanumeric with dashes
              </div>
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || creating">
              {{ creating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
        <div class="error-banner" *ngIf="createError">{{ createError }}</div>
      </div>

      <!-- Namespace List -->
      <div class="card">
        <table class="table" *ngIf="namespaces.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Labels</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let ns of namespaces">
              <td class="mono">{{ ns.name }}</td>
              <td>
                <span class="status-badge" [ngClass]="ns.status === 'Active' ? 'active' : 'terminating'">
                  {{ ns.status }}
                </span>
              </td>
              <td>
                <span class="label-tag" *ngFor="let label of getLabels(ns.labels)">
                  {{ label }}
                </span>
                <span *ngIf="getLabels(ns.labels).length === 0" class="muted">-</span>
              </td>
              <td>{{ ns.created_at | date: 'short' }}</td>
              <td>
                <button
                  class="btn btn-sm btn-outline"
                  (click)="viewWorkloads(ns.name)"
                  title="View workloads"
                >
                  <span class="material-icons">widgets</span>
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  (click)="deleteNamespace(ns)"
                  [disabled]="isProtected(ns.name)"
                  title="Delete namespace"
                >
                  <span class="material-icons">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="loading" *ngIf="loading">
          <span class="material-icons spinning">sync</span> Loading...
        </div>
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
        margin-bottom: 16px;
      }

      .create-form h3 {
        font-size: 16px;
        margin-bottom: 12px;
      }

      .form-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }

      .form-group {
        flex: 1;
      }

      .form-group label {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }

      .form-group input {
        width: 100%;
        padding: 8px 12px;
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 14px;
      }

      .form-group input:focus {
        outline: none;
        border-color: var(--primary);
      }

      .error {
        color: var(--warn);
        font-size: 11px;
        margin-top: 4px;
      }

      .error-banner {
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(244, 67, 54, 0.1);
        border-radius: 6px;
        color: var(--warn);
        font-size: 13px;
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
        letter-spacing: 0.5px;
      }

      .mono {
        font-family: monospace;
      }

      .muted {
        color: var(--text-secondary);
      }

      .label-tag {
        display: inline-block;
        padding: 2px 8px;
        background: rgba(25, 118, 210, 0.1);
        border-radius: 4px;
        font-size: 11px;
        color: var(--primary-light);
        margin-right: 4px;
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

      .status-badge.active {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }

      .status-badge.terminating {
        background: rgba(255, 152, 0, 0.15);
        color: #ff9800;
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
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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
      .btn-danger:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .loading {
        text-align: center;
        padding: 20px;
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
    `,
  ],
})
export class NamespaceListComponent implements OnInit {
  namespaces: Namespace[] = [];
  loading = true;
  showCreateForm = false;
  creating = false;
  createError = '';
  form: FormGroup;
  clusterId!: number;

  private protectedNs = ['default', 'kube-system', 'kube-public', 'kube-node-lease'];

  constructor(
    private api: WorkloadApiService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)]],
    });
  }

  ngOnInit(): void {
    this.clusterId = Number(this.route.snapshot.queryParamMap.get('cluster'));
    if (this.clusterId) {
      this.loadNamespaces();
    }
  }

  loadNamespaces(): void {
    this.loading = true;
    this.api.getNamespaces(this.clusterId).subscribe({
      next: (res) => {
        this.namespaces = res.namespaces;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onCreate(): void {
    if (this.form.invalid) return;
    this.creating = true;
    this.createError = '';

    this.api.createNamespace(this.clusterId, this.form.value.name).subscribe({
      next: (ns) => {
        this.namespaces.push(ns);
        this.form.reset();
        this.showCreateForm = false;
        this.creating = false;
      },
      error: (err) => {
        this.createError = err.error?.detail || 'Failed to create namespace';
        this.creating = false;
      },
    });
  }

  deleteNamespace(ns: Namespace): void {
    if (confirm(`Delete namespace "${ns.name}"? This will remove all resources within it.`)) {
      this.api.deleteNamespace(this.clusterId, ns.name).subscribe({
        next: () => {
          this.namespaces = this.namespaces.filter((n) => n.name !== ns.name);
        },
      });
    }
  }

  viewWorkloads(namespace: string): void {
    this.router.navigate(['/workloads', 'list'], {
      queryParams: { cluster: this.clusterId, namespace },
    });
  }

  isProtected(name: string): boolean {
    return this.protectedNs.includes(name);
  }

  getLabels(labels: Record<string, string>): string[] {
    return Object.entries(labels || {})
      .filter(([k]) => !k.startsWith('kubernetes.io'))
      .map(([k, v]) => `${k}=${v}`)
      .slice(0, 3);
  }

  goBack(): void {
    this.router.navigate(['/workloads'], {
      queryParams: { cluster: this.clusterId },
    });
  }
}
