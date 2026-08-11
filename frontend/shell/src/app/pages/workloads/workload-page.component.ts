import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Cluster { id: number; name: string; status: string; }
interface Namespace { name: string; status: string; }
interface Workload { name: string; kind: string; status: string; replicas: number; ready_replicas: number; images: string[]; }

@Component({
  selector: 'app-workload-page',
  template: `
    <div class="page-header">
      <h2>Workload Management</h2>
    </div>

    <!-- Selectors -->
    <div class="selector-bar">
      <div class="selector-group">
        <label>Cluster</label>
        <select [(ngModel)]="selectedClusterId" (ngModelChange)="onClusterChange()">
          <option [ngValue]="null">Select cluster...</option>
          <option *ngFor="let c of clusters" [ngValue]="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="selector-group" *ngIf="selectedClusterId">
        <label>Namespace</label>
        <select [(ngModel)]="selectedNamespace" (ngModelChange)="loadWorkloads()">
          <option *ngFor="let ns of namespaces" [value]="ns.name">{{ ns.name }}</option>
        </select>
      </div>
      <button class="btn btn-primary" *ngIf="selectedClusterId && selectedNamespace" (click)="showDeployForm = !showDeployForm">
        <span class="material-icons">rocket_launch</span> Deploy
      </button>
    </div>

    <!-- Deploy Form -->
    <div class="card" *ngIf="showDeployForm" style="margin-bottom: 16px;">
      <h3 style="margin-bottom: 16px;">Deploy New Workload</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" [(ngModel)]="deploy.name" placeholder="my-app" />
        </div>
        <div class="form-group">
          <label>Image *</label>
          <input type="text" [(ngModel)]="deploy.image" placeholder="nginx:latest" />
        </div>
        <div class="form-group">
          <label>Replicas</label>
          <input type="number" [(ngModel)]="deploy.replicas" min="1" max="10" />
        </div>
        <div class="form-group">
          <label>Port</label>
          <input type="number" [(ngModel)]="deploy.port" placeholder="80" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" (click)="showDeployForm = false">Cancel</button>
        <button class="btn btn-primary" (click)="deployWorkload()" [disabled]="!deploy.name || !deploy.image || deploying">
          {{ deploying ? 'Deploying...' : 'Deploy' }}
        </button>
      </div>
      <div class="success-msg" *ngIf="deploySuccess">Deployment created!</div>
      <div class="error-msg" *ngIf="deployError">{{ deployError }}</div>
    </div>

    <!-- Workloads Table -->
    <div class="card" *ngIf="selectedClusterId && selectedNamespace">
      <h3 style="margin-bottom: 16px;">Workloads in {{ selectedNamespace }}</h3>
      <table class="table" *ngIf="workloads.length > 0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Status</th>
            <th>Replicas</th>
            <th>Image</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let w of workloads">
            <td>{{ w.name }}</td>
            <td><span class="kind-badge">{{ w.kind }}</span></td>
            <td><span class="status-badge" [ngClass]="w.status.toLowerCase()">{{ w.status }}</span></td>
            <td>{{ w.ready_replicas || 0 }}/{{ w.replicas || 0 }}</td>
            <td class="mono">{{ w.images[0] | slice:0:30 }}</td>
            <td>
              <button class="btn btn-sm btn-danger" (click)="deleteWorkload(w)">
                <span class="material-icons">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state-sm" *ngIf="workloads.length === 0 && !loadingWorkloads">
        No workloads in this namespace.
      </div>
      <div class="loading" *ngIf="loadingWorkloads">Loading workloads...</div>
    </div>

    <!-- No cluster selected -->
    <div class="empty-state" *ngIf="!selectedClusterId">
      <span class="material-icons">apps</span>
      <h3>Select a Cluster</h3>
      <p>Choose a cluster above to manage workloads.</p>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: 24px; font-weight: 600; }
    .selector-bar {
      display: flex; gap: 16px; align-items: flex-end; margin-bottom: 20px;
      background: #16213e; border: 1px solid #2a3a5e; border-radius: 12px; padding: 16px 20px;
    }
    .selector-group { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
    .selector-group label { font-size: 11px; color: #b0bec5; text-transform: uppercase; letter-spacing: 0.5px; }
    .selector-group select {
      padding: 8px 12px; background: #1a1a2e; border: 1px solid #2a3a5e;
      border-radius: 8px; color: #fff; font-size: 14px;
    }
    .selector-group select:focus { outline: none; border-color: #1976d2; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; color: #b0bec5; }
    .form-group input {
      padding: 8px 12px; background: #1a1a2e; border: 1px solid #2a3a5e;
      border-radius: 8px; color: #fff; font-size: 14px;
    }
    .form-group input:focus { outline: none; border-color: #1976d2; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    .card { background: #16213e; border: 1px solid #2a3a5e; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #2a3a5e; font-size: 13px; }
    .table th { font-weight: 600; color: #b0bec5; font-size: 11px; text-transform: uppercase; }
    .mono { font-family: monospace; font-size: 12px; }
    .kind-badge { padding: 2px 8px; background: rgba(0,188,212,0.1); color: #00bcd4; border-radius: 4px; font-size: 11px; }
    .status-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
    .status-badge.running { background: rgba(76,175,80,0.15); color: #4caf50; }
    .status-badge.pending, .status-badge.partial { background: rgba(255,152,0,0.15); color: #ff9800; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-primary { background: #1976d2; color: white; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline { background: transparent; border: 1px solid #2a3a5e; color: #fff; }
    .btn-danger { background: rgba(244,67,54,0.15); color: #f44336; border: none; }
    .btn-sm { padding: 6px 10px; font-size: 12px; }
    .empty-state { text-align: center; padding: 60px; color: #b0bec5; }
    .empty-state .material-icons { font-size: 64px; color: #2a3a5e; margin-bottom: 16px; }
    .empty-state h3 { color: #fff; margin-bottom: 8px; }
    .empty-state-sm { text-align: center; padding: 24px; color: #b0bec5; }
    .loading { text-align: center; padding: 20px; color: #b0bec5; }
    .error-msg { margin-top: 12px; padding: 10px; background: rgba(244,67,54,0.1); border-radius: 6px; color: #f44336; font-size: 13px; }
    .success-msg { margin-top: 12px; padding: 10px; background: rgba(76,175,80,0.1); border-radius: 6px; color: #4caf50; font-size: 13px; }
  `],
})
export class WorkloadPageComponent implements OnInit {
  clusters: Cluster[] = [];
  namespaces: Namespace[] = [];
  workloads: Workload[] = [];
  selectedClusterId: number | null = null;
  selectedNamespace = '';
  loading = false;
  loadingWorkloads = false;
  showDeployForm = false;
  deploying = false;
  deployError = '';
  deploySuccess = false;
  deploy = { name: '', image: '', replicas: 1, port: 80 };

  private apiBase = `${window.location.protocol}//${window.location.hostname}:8000/api`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<{ clusters: Cluster[] }>(`${this.apiBase}/clusters`).subscribe({
      next: (res) => { this.clusters = res.clusters; },
    });
  }

  onClusterChange(): void {
    if (!this.selectedClusterId) { this.namespaces = []; this.workloads = []; return; }
    this.http.get<{ namespaces: Namespace[] }>(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces`).subscribe({
      next: (res) => {
        this.namespaces = res.namespaces;
        if (this.namespaces.length > 0) {
          this.selectedNamespace = this.namespaces[0].name;
          this.loadWorkloads();
        }
      },
    });
  }

  loadWorkloads(): void {
    if (!this.selectedClusterId || !this.selectedNamespace) return;
    this.loadingWorkloads = true;
    this.http.get<{ workloads: Workload[] }>(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.selectedNamespace}/workloads`).subscribe({
      next: (res) => { this.workloads = res.workloads; this.loadingWorkloads = false; },
      error: () => { this.workloads = []; this.loadingWorkloads = false; },
    });
  }

  deployWorkload(): void {
    this.deploying = true; this.deployError = ''; this.deploySuccess = false;
    const payload = {
      name: this.deploy.name,
      namespace: this.selectedNamespace,
      replicas: this.deploy.replicas,
      containers: [{ name: this.deploy.name, image: this.deploy.image, ports: this.deploy.port ? [{ containerPort: this.deploy.port }] : [] }],
    };
    this.http.post(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.selectedNamespace}/deployments`, payload).subscribe({
      next: () => { this.deploying = false; this.deploySuccess = true; this.showDeployForm = false; this.loadWorkloads(); },
      error: (err) => { this.deploying = false; this.deployError = err.error?.detail || 'Deploy failed'; },
    });
  }

  deleteWorkload(w: Workload): void {
    if (confirm(`Delete "${w.name}"?`)) {
      this.http.delete(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.selectedNamespace}/workloads/${w.name}`).subscribe({
        next: () => { this.workloads = this.workloads.filter(x => x.name !== w.name); },
      });
    }
  }
}
