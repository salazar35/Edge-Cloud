import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Cluster {
  id: number;
  name: string;
  description: string | null;
  api_server_url: string;
  status: string;
  version: string | null;
  nodes_count: number;
  created_at: string;
  last_health_check: string | null;
}

interface HealthResult {
  cluster_id: number;
  cluster_name: string;
  status: string;
  version: string | null;
  nodes_count: number;
  nodes: NodeInfo[];
  components: ComponentInfo[];
  last_check: string;
}

interface NodeInfo {
  name: string;
  status: string;
  roles: string[];
  version: string;
  os: string;
  cpu: string;
  memory: string;
}

interface ComponentInfo {
  name: string;
  status: string;
}

@Component({
  selector: 'app-cluster-list',
  template: `
    <div class="page-header">
      <h2>Kubernetes Clusters</h2>
      <button class="btn btn-primary" (click)="openAddForm()">
        <span class="material-icons">add</span> Add Cluster
      </button>
    </div>

    <!-- ==================== ADD / EDIT FORM ==================== -->
    <div class="card form-card" *ngIf="showForm">
      <h3>{{ editingCluster ? 'Edit Cluster' : 'Add New Cluster' }}</h3>
      <div class="form-group">
        <label>Cluster Name *</label>
        <input type="text" [(ngModel)]="formData.name" placeholder="e.g., production-cluster" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" [(ngModel)]="formData.description" placeholder="Optional description" />
      </div>
      <div class="form-group">
        <label>API Server URL *</label>
        <input type="text" [(ngModel)]="formData.api_server_url" placeholder="https://k8s-api.example.com:6443" />
      </div>
      <div class="form-group">
        <label>Kubeconfig *</label>
        <textarea [(ngModel)]="formData.kubeconfig" rows="8" placeholder="Paste kubeconfig YAML..."></textarea>
        <label class="file-upload">
          <span class="material-icons">upload_file</span> Upload kubeconfig file
          <input type="file" accept=".yaml,.yml,.conf" (change)="onFileSelected($event)" hidden />
        </label>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" (click)="closeForm()">Cancel</button>
        <button class="btn btn-primary" (click)="submitForm()" [disabled]="!formData.name || !formData.api_server_url || !formData.kubeconfig || submitting">
          <span class="material-icons spinning" *ngIf="submitting">sync</span>
          {{ submitting ? 'Saving...' : (editingCluster ? 'Save Changes' : 'Add Cluster') }}
        </button>
      </div>
      <div class="error-msg" *ngIf="formError">{{ formError }}</div>
    </div>

    <!-- ==================== CLUSTER CARDS ==================== -->
    <div class="clusters-grid" *ngIf="clusters.length > 0 && !detailCluster">
      <div class="cluster-card" *ngFor="let cluster of clusters">
        <div class="cluster-card-header">
          <div class="cluster-icon"><span class="material-icons">dns</span></div>
          <span class="status-badge" [ngClass]="cluster.status">{{ cluster.status }}</span>
        </div>
        <h3>{{ cluster.name }}</h3>
        <p class="cluster-desc" *ngIf="cluster.description">{{ cluster.description }}</p>
        <div class="cluster-meta">
          <span><span class="material-icons">memory</span> {{ cluster.nodes_count }} nodes</span>
          <span *ngIf="cluster.version"><span class="material-icons">info</span> v{{ cluster.version }}</span>
        </div>
        <div class="cluster-actions">
          <button class="btn btn-sm btn-health" (click)="runHealthCheck(cluster)" [disabled]="healthChecking[cluster.id]"
                  [ngClass]="{'checking': healthChecking[cluster.id], 'done': healthDone[cluster.id]}">
            <span class="material-icons" [ngClass]="{'spin-pulse': healthChecking[cluster.id]}">
              {{ healthChecking[cluster.id] ? 'sync' : (healthDone[cluster.id] ? 'check_circle' : 'monitor_heart') }}
            </span>
            {{ healthChecking[cluster.id] ? 'Checking...' : (healthDone[cluster.id] ? 'Healthy' : 'Health Check') }}
          </button>
          <button class="btn btn-sm btn-outline" (click)="viewDetail(cluster)" title="View Details">
            <span class="material-icons">visibility</span>
          </button>
          <button class="btn btn-sm btn-outline" (click)="openEditForm(cluster)" title="Edit">
            <span class="material-icons">edit</span>
          </button>
          <button class="btn btn-sm btn-danger" (click)="deleteCluster(cluster)" title="Delete">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== CLUSTER DETAIL VIEW ==================== -->
    <div class="detail-view" *ngIf="detailCluster">
      <div class="detail-header">
        <button class="btn btn-outline" (click)="closeDetail()">
          <span class="material-icons">arrow_back</span> Back
        </button>
        <h2>{{ detailCluster.name }}</h2>
        <span class="status-badge" [ngClass]="detailCluster.status">{{ detailCluster.status }}</span>
      </div>

      <!-- Cluster Info -->
      <div class="detail-grid">
        <div class="info-card">
          <h3>Cluster Information</h3>
          <div class="info-row"><span class="label">Name</span><span>{{ detailCluster.name }}</span></div>
          <div class="info-row"><span class="label">Description</span><span>{{ detailCluster.description || 'N/A' }}</span></div>
          <div class="info-row"><span class="label">API Server</span><span class="mono">{{ detailCluster.api_server_url }}</span></div>
          <div class="info-row"><span class="label">Version</span><span>{{ detailCluster.version || 'Unknown' }}</span></div>
          <div class="info-row"><span class="label">Nodes</span><span>{{ detailCluster.nodes_count }}</span></div>
          <div class="info-row"><span class="label">Last Check</span><span>{{ detailCluster.last_health_check || 'Never' }}</span></div>
        </div>
        <div class="actions-card">
          <h3>Actions</h3>
          <button class="btn btn-health action-btn" (click)="runHealthCheckDetail()" [disabled]="detailHealthChecking"
                  [ngClass]="{'checking': detailHealthChecking, 'done': detailHealthDone}">
            <span class="material-icons" [ngClass]="{'spin-pulse': detailHealthChecking}">
              {{ detailHealthChecking ? 'sync' : (detailHealthDone ? 'check_circle' : 'monitor_heart') }}
            </span>
            {{ detailHealthChecking ? 'Checking...' : (detailHealthDone ? 'Done!' : 'Run Health Check') }}
          </button>
          <button class="btn btn-outline action-btn" (click)="openEditForm(detailCluster)">
            <span class="material-icons">edit</span> Edit Cluster
          </button>
          <button class="btn btn-danger action-btn" (click)="deleteCluster(detailCluster)">
            <span class="material-icons">delete</span> Remove Cluster
          </button>
        </div>
      </div>

      <!-- Health Check Animation -->
      <div class="health-progress" *ngIf="detailHealthChecking">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <p>Running health check... Connecting to {{ detailCluster.api_server_url }}</p>
      </div>

      <!-- Nodes Section -->
      <div class="section-card" *ngIf="detailNodes.length > 0">
        <h3><span class="material-icons">computer</span> Nodes ({{ detailNodes.length }})</h3>
        <div class="nodes-grid">
          <div class="node-card" *ngFor="let node of detailNodes" [ngClass]="node.status === 'Ready' ? 'healthy' : 'unhealthy'">
            <div class="node-header">
              <span class="material-icons">{{ node.status === 'Ready' ? 'check_circle' : 'error' }}</span>
              <span class="node-name">{{ node.name }}</span>
            </div>
            <div class="node-details">
              <div class="node-row"><span>Status</span><span [ngClass]="node.status === 'Ready' ? 'text-green' : 'text-red'">{{ node.status }}</span></div>
              <div class="node-row"><span>Roles</span><span>{{ node.roles.join(', ') }}</span></div>
              <div class="node-row"><span>Kubelet</span><span>{{ node.version }}</span></div>
              <div class="node-row"><span>OS</span><span>{{ node.os }}</span></div>
              <div class="node-row"><span>CPU</span><span>{{ node.cpu }}</span></div>
              <div class="node-row"><span>Memory</span><span>{{ node.memory }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Components Section -->
      <div class="section-card" *ngIf="detailComponents.length > 0">
        <h3><span class="material-icons">settings</span> Components</h3>
        <div class="components-grid">
          <div class="comp-item" *ngFor="let comp of detailComponents" [ngClass]="comp.status === 'Healthy' ? 'healthy' : 'unhealthy'">
            <span class="material-icons">{{ comp.status === 'Healthy' ? 'check_circle' : 'cancel' }}</span>
            {{ comp.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" *ngIf="clusters.length === 0 && !loading">
      <span class="material-icons">cloud_off</span>
      <h3>No clusters registered</h3>
      <p>Add your first Kubernetes cluster to get started.</p>
    </div>

    <div class="loading" *ngIf="loading">Loading clusters...</div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h2 { font-size: 24px; font-weight: 600; }

    /* Form */
    .form-card { margin-bottom: 24px; }
    .form-card h3 { margin-bottom: 16px; font-size: 16px; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 12px; color: #b0bec5; margin-bottom: 4px; }
    .form-group input, .form-group textarea {
      width: 100%; padding: 10px 14px; background: #1a1a2e; border: 1px solid #2a3a5e;
      border-radius: 8px; color: #fff; font-size: 14px; font-family: inherit;
    }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #1976d2; }
    .form-group textarea { font-family: monospace; font-size: 12px; resize: vertical; }
    .file-upload {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
      padding: 6px 12px; border: 1px dashed #2a3a5e; border-radius: 6px;
      cursor: pointer; font-size: 12px; color: #b0bec5;
    }
    .file-upload:hover { border-color: #1976d2; color: #42a5f5; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    .error-msg { margin-top: 12px; padding: 10px; background: rgba(244,67,54,0.1); border-radius: 6px; color: #f44336; font-size: 13px; }

    /* Cluster Grid */
    .clusters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .cluster-card { background: #16213e; border: 1px solid #2a3a5e; border-radius: 12px; padding: 20px; transition: border-color 0.2s; }
    .cluster-card:hover { border-color: #1976d2; }
    .cluster-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .cluster-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(25,118,210,0.15); display: flex; align-items: center; justify-content: center; color: #42a5f5; }
    .cluster-card h3 { font-size: 16px; margin-bottom: 4px; }
    .cluster-desc { font-size: 13px; color: #b0bec5; margin-bottom: 12px; }
    .cluster-meta { display: flex; gap: 16px; font-size: 13px; color: #b0bec5; margin-bottom: 16px; }
    .cluster-meta span { display: flex; align-items: center; gap: 4px; }
    .cluster-meta .material-icons { font-size: 16px; }
    .cluster-actions { display: flex; gap: 8px; border-top: 1px solid #2a3a5e; padding-top: 12px; flex-wrap: wrap; }

    /* Health Check Button Animation */
    .btn-health { background: rgba(25,118,210,0.1); color: #42a5f5; border: 1px solid rgba(25,118,210,0.3); transition: all 0.3s ease; }
    .btn-health.checking { background: rgba(255,152,0,0.15); color: #ff9800; border-color: rgba(255,152,0,0.4); }
    .btn-health.done { background: rgba(76,175,80,0.15); color: #4caf50; border-color: rgba(76,175,80,0.4); }
    .spin-pulse { animation: spinPulse 1s ease-in-out infinite; }
    @keyframes spinPulse { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Detail View */
    .detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .detail-header h2 { font-size: 22px; flex: 1; }
    .detail-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
    .info-card, .actions-card, .section-card { background: #16213e; border: 1px solid #2a3a5e; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .info-card h3, .actions-card h3, .section-card h3 { display: flex; align-items: center; gap: 8px; font-size: 15px; margin-bottom: 16px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2a3a5e; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-row .label { color: #b0bec5; }
    .mono { font-family: monospace; font-size: 12px; }
    .action-btn { width: 100%; justify-content: center; margin-bottom: 8px; }

    /* Health Progress Animation */
    .health-progress { background: #16213e; border: 1px solid #2a3a5e; border-radius: 12px; padding: 20px; margin-bottom: 16px; text-align: center; }
    .health-progress p { color: #b0bec5; font-size: 13px; margin-top: 12px; }
    .progress-bar { height: 4px; background: #2a3a5e; border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; width: 30%; background: linear-gradient(90deg, #1976d2, #00bcd4, #1976d2); border-radius: 2px; animation: progressSlide 1.5s ease-in-out infinite; }
    @keyframes progressSlide { 0% { transform: translateX(-100%); width: 30%; } 50% { width: 60%; } 100% { transform: translateX(350%); width: 30%; } }

    /* Nodes Grid */
    .nodes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .node-card { border: 1px solid #2a3a5e; border-radius: 10px; padding: 16px; transition: border-color 0.2s; }
    .node-card.healthy { border-left: 3px solid #4caf50; }
    .node-card.unhealthy { border-left: 3px solid #f44336; }
    .node-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .node-header .material-icons { font-size: 18px; }
    .node-card.healthy .node-header .material-icons { color: #4caf50; }
    .node-card.unhealthy .node-header .material-icons { color: #f44336; }
    .node-name { font-weight: 600; font-size: 14px; }
    .node-details { font-size: 12px; }
    .node-row { display: flex; justify-content: space-between; padding: 4px 0; color: #b0bec5; }
    .node-row span:last-child { color: #fff; }
    .text-green { color: #4caf50 !important; }
    .text-red { color: #f44336 !important; }

    /* Components */
    .components-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
    .comp-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; }
    .comp-item.healthy { background: rgba(76,175,80,0.1); color: #4caf50; }
    .comp-item.unhealthy { background: rgba(244,67,54,0.1); color: #f44336; }
    .comp-item .material-icons { font-size: 18px; }

    /* Common */
    .card { background: #16213e; border: 1px solid #2a3a5e; border-radius: 12px; padding: 24px; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; }
    .status-badge.connected { background: rgba(76,175,80,0.15); color: #4caf50; }
    .status-badge.error, .status-badge.disconnected { background: rgba(244,67,54,0.15); color: #f44336; }
    .status-badge.unknown { background: rgba(255,152,0,0.15); color: #ff9800; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #1976d2; color: white; }
    .btn-primary:hover { background: #1565c0; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline { background: transparent; border: 1px solid #2a3a5e; color: #fff; }
    .btn-outline:hover { border-color: #1976d2; }
    .btn-danger { background: rgba(244,67,54,0.15); color: #f44336; border: none; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .spinning { animation: spinPulse 1s linear infinite; }
    .empty-state { text-align: center; padding: 60px; color: #b0bec5; }
    .empty-state .material-icons { font-size: 64px; color: #2a3a5e; margin-bottom: 16px; }
    .empty-state h3 { color: #fff; margin-bottom: 8px; }
    .loading { text-align: center; padding: 40px; color: #b0bec5; }

    @media (max-width: 768px) {
      .detail-grid { grid-template-columns: 1fr; }
      .clusters-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ClusterListComponent implements OnInit {
  clusters: Cluster[] = [];
  loading = true;

  // Form state
  showForm = false;
  editingCluster: Cluster | null = null;
  submitting = false;
  formError = '';
  formData = { name: '', description: '', api_server_url: '', kubeconfig: '' };

  // Health check animation state
  healthChecking: Record<number, boolean> = {};
  healthDone: Record<number, boolean> = {};

  // Detail view
  detailCluster: Cluster | null = null;
  detailNodes: NodeInfo[] = [];
  detailComponents: ComponentInfo[] = [];
  detailHealthChecking = false;
  detailHealthDone = false;

  private apiBase = `${window.location.protocol}//${window.location.hostname}:8000/api`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadClusters(); }

  loadClusters(): void {
    this.loading = true;
    this.http.get<{ clusters: Cluster[] }>(`${this.apiBase}/clusters`).subscribe({
      next: (res) => { this.clusters = res.clusters; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  // === Form ===

  openAddForm(): void {
    this.editingCluster = null;
    this.formData = { name: '', description: '', api_server_url: '', kubeconfig: '' };
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(cluster: Cluster): void {
    this.editingCluster = cluster;
    this.formData = {
      name: cluster.name,
      description: cluster.description || '',
      api_server_url: cluster.api_server_url,
      kubeconfig: '', // Don't pre-fill for security, user can re-paste
    };
    this.formError = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingCluster = null;
    this.formError = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => { this.formData.kubeconfig = reader.result as string; };
      reader.readAsText(input.files[0]);
    }
  }

  submitForm(): void {
    this.submitting = true;
    this.formError = '';

    if (this.editingCluster) {
      // Edit existing
      this.http.patch<Cluster>(`${this.apiBase}/clusters/${this.editingCluster.id}`, this.formData).subscribe({
        next: (updated) => {
          const idx = this.clusters.findIndex(c => c.id === updated.id);
          if (idx >= 0) this.clusters[idx] = updated;
          if (this.detailCluster && this.detailCluster.id === updated.id) this.detailCluster = updated;
          this.closeForm();
          this.submitting = false;
        },
        error: (err) => { this.formError = err.error?.detail || 'Failed to update'; this.submitting = false; },
      });
    } else {
      // Add new
      this.http.post<Cluster>(`${this.apiBase}/clusters`, this.formData).subscribe({
        next: (cluster) => { this.clusters.unshift(cluster); this.closeForm(); this.submitting = false; },
        error: (err) => { this.formError = err.error?.detail || 'Failed to add cluster'; this.submitting = false; },
      });
    }
  }

  // === Health Check with Animation ===

  runHealthCheck(cluster: Cluster): void {
    this.healthChecking[cluster.id] = true;
    this.healthDone[cluster.id] = false;

    this.http.get<HealthResult>(`${this.apiBase}/clusters/${cluster.id}/health`).subscribe({
      next: (health) => {
        cluster.status = health.status;
        cluster.nodes_count = health.nodes_count;
        cluster.version = health.version;
        this.healthChecking[cluster.id] = false;
        this.healthDone[cluster.id] = true;
        // Reset "done" state after 3 seconds
        setTimeout(() => { this.healthDone[cluster.id] = false; }, 3000);
      },
      error: () => {
        this.healthChecking[cluster.id] = false;
        cluster.status = 'error';
      },
    });
  }

  // === Detail View ===

  viewDetail(cluster: Cluster): void {
    this.detailCluster = cluster;
    this.detailNodes = [];
    this.detailComponents = [];
    this.detailHealthDone = false;
    // Auto run health check to get node info
    this.runHealthCheckDetail();
  }

  closeDetail(): void {
    this.detailCluster = null;
    this.detailNodes = [];
    this.detailComponents = [];
  }

  runHealthCheckDetail(): void {
    if (!this.detailCluster) return;
    this.detailHealthChecking = true;
    this.detailHealthDone = false;

    this.http.get<HealthResult>(`${this.apiBase}/clusters/${this.detailCluster.id}/health`).subscribe({
      next: (health) => {
        this.detailCluster!.status = health.status;
        this.detailCluster!.nodes_count = health.nodes_count;
        this.detailCluster!.version = health.version;
        this.detailNodes = health.nodes;
        this.detailComponents = health.components;
        this.detailHealthChecking = false;
        this.detailHealthDone = true;
        setTimeout(() => { this.detailHealthDone = false; }, 3000);
      },
      error: () => {
        this.detailHealthChecking = false;
        this.detailCluster!.status = 'error';
      },
    });
  }

  // === Delete ===

  deleteCluster(cluster: Cluster): void {
    if (confirm(`Remove cluster "${cluster.name}"? This cannot be undone.`)) {
      this.http.delete(`${this.apiBase}/clusters/${cluster.id}`).subscribe({
        next: () => {
          this.clusters = this.clusters.filter(c => c.id !== cluster.id);
          if (this.detailCluster?.id === cluster.id) this.closeDetail();
        },
      });
    }
  }
}
