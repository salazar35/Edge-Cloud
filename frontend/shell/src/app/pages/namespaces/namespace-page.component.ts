import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Cluster { id: number; name: string; status: string; }
interface Namespace { name: string; status: string; labels: Record<string, string>; annotations: Record<string, string>; created_at: string | null; }
interface NsDetail { name: string; status: string; labels: Record<string, string>; annotations: Record<string, string>; resource_quota: any; role_bindings: any[]; }

@Component({
  selector: 'app-namespace-page',
  templateUrl: './namespace-page.component.html',
  styleUrls: ['./namespace-page.component.scss'],
})
export class NamespacePageComponent implements OnInit {
  clusters: Cluster[] = [];
  namespaces: Namespace[] = [];
  selectedClusterId: number | null = null;
  loading = false;
  apiBase = `${window.location.protocol}//${window.location.hostname}:8000/api`;

  // Create form
  showCreateForm = false;
  creating = false;
  createError = '';
  newNs = { name: '', labels: '', annotations: '' };

  // Edit form
  showEditForm = false;
  editNs: Namespace | null = null;
  editLabels = '';
  editAnnotations = '';
  editing = false;

  // Detail view
  detailNs: NsDetail | null = null;
  loadingDetail = false;

  // Resource quota
  showQuotaForm = false;
  quotaData = { cpu_requests: '', cpu_limits: '', memory_requests: '', memory_limits: '', pods: '', services: '' };
  settingQuota = false;

  // RBAC
  showRbacForm = false;
  rbacData = { name: '', role_name: '', role_kind: 'ClusterRole', subject_kind: 'ServiceAccount', subject_name: '', subject_namespace: '' };
  creatingRbac = false;

  protected protectedNs = ['default', 'kube-system', 'kube-public', 'kube-node-lease'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<{ clusters: Cluster[] }>(`${this.apiBase}/clusters`).subscribe({
      next: (r) => { this.clusters = r.clusters; },
    });
  }

  onClusterChange(): void {
    if (!this.selectedClusterId) { this.namespaces = []; return; }
    this.loadNamespaces();
  }

  loadNamespaces(): void {
    this.loading = true;
    this.http.get<{ namespaces: Namespace[] }>(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces`).subscribe({
      next: (r) => { this.namespaces = r.namespaces; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  createNamespace(): void {
    this.creating = true; this.createError = '';
    const labels = this.parseKV(this.newNs.labels);
    const annotations = this.parseKV(this.newNs.annotations);
    this.http.post(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces`, { name: this.newNs.name, labels, annotations }).subscribe({
      next: () => { this.creating = false; this.showCreateForm = false; this.newNs = { name: '', labels: '', annotations: '' }; this.loadNamespaces(); },
      error: (e) => { this.creating = false; this.createError = e.error?.detail || 'Failed'; },
    });
  }

  openEdit(ns: Namespace): void {
    this.editNs = ns;
    this.editLabels = this.formatKV(ns.labels);
    this.editAnnotations = this.formatKV(ns.annotations);
    this.showEditForm = true;
  }

  saveEdit(): void {
    if (!this.editNs) return;
    this.editing = true;
    const labels = this.parseKV(this.editLabels);
    const annotations = this.parseKV(this.editAnnotations);
    this.http.patch(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.editNs.name}`, { labels, annotations }).subscribe({
      next: () => { this.editing = false; this.showEditForm = false; this.loadNamespaces(); },
      error: () => { this.editing = false; },
    });
  }

  deleteNs(ns: Namespace): void {
    if (confirm(`Delete namespace "${ns.name}"? All resources inside will be deleted.`)) {
      this.http.delete(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${ns.name}`).subscribe({
        next: () => { this.namespaces = this.namespaces.filter(n => n.name !== ns.name); if (this.detailNs?.name === ns.name) this.detailNs = null; },
      });
    }
  }

  viewDetail(ns: Namespace): void {
    this.loadingDetail = true;
    this.http.get<NsDetail>(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${ns.name}`).subscribe({
      next: (d) => { this.detailNs = d; this.loadingDetail = false; },
      error: () => { this.loadingDetail = false; },
    });
  }

  closeDetail(): void { this.detailNs = null; }

  // Resource Quota
  openQuotaForm(): void { this.showQuotaForm = true; }
  saveQuota(): void {
    if (!this.detailNs) return;
    this.settingQuota = true;
    this.http.post(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.detailNs.name}/resource-quota`, this.quotaData).subscribe({
      next: () => { this.settingQuota = false; this.showQuotaForm = false; this.viewDetail({ name: this.detailNs!.name } as Namespace); },
      error: () => { this.settingQuota = false; },
    });
  }
  deleteQuota(): void {
    if (!this.detailNs || !confirm('Remove resource quota?')) return;
    this.http.delete(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.detailNs.name}/resource-quota`).subscribe({
      next: () => { this.viewDetail({ name: this.detailNs!.name } as Namespace); },
    });
  }

  // RBAC
  openRbacForm(): void { this.showRbacForm = true; this.rbacData = { name: '', role_name: '', role_kind: 'ClusterRole', subject_kind: 'ServiceAccount', subject_name: '', subject_namespace: this.detailNs?.name || '' }; }
  createRoleBinding(): void {
    if (!this.detailNs) return;
    this.creatingRbac = true;
    this.http.post(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.detailNs.name}/role-bindings`, this.rbacData).subscribe({
      next: () => { this.creatingRbac = false; this.showRbacForm = false; this.viewDetail({ name: this.detailNs!.name } as Namespace); },
      error: () => { this.creatingRbac = false; },
    });
  }
  deleteRoleBinding(name: string): void {
    if (!this.detailNs || !confirm(`Delete RoleBinding "${name}"?`)) return;
    this.http.delete(`${this.apiBase}/clusters/${this.selectedClusterId}/namespaces/${this.detailNs.name}/role-bindings/${name}`).subscribe({
      next: () => { this.viewDetail({ name: this.detailNs!.name } as Namespace); },
    });
  }

  // Helpers
  isProtected(name: string): boolean { return this.protectedNs.includes(name); }
  parseKV(s: string): Record<string, string> {
    const r: Record<string, string> = {};
    s.split('\n').forEach(line => { const [k, ...v] = line.split('='); if (k?.trim()) r[k.trim()] = v.join('=').trim(); });
    return r;
  }
  formatKV(obj: Record<string, string>): string {
    return Object.entries(obj || {}).map(([k, v]) => `${k}=${v}`).join('\n');
  }
  objectKeys(obj: any): string[] { return obj ? Object.keys(obj) : []; }
}
