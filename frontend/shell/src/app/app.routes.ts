import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ClusterListComponent } from './pages/clusters/cluster-list.component';
import { WorkloadPageComponent } from './pages/workloads/workload-page.component';
import { NamespacePageComponent } from './pages/namespaces/namespace-page.component';

export const APP_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'clusters', component: ClusterListComponent },
  { path: 'namespaces', component: NamespacePageComponent },
  { path: 'workloads', component: WorkloadPageComponent },
  { path: '**', redirectTo: 'dashboard' },
];
