import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { WorkloadDashboardComponent } from './components/workload-dashboard/workload-dashboard.component';
import { NamespaceListComponent } from './components/namespace-list/namespace-list.component';
import { WorkloadListComponent } from './components/workload-list/workload-list.component';
import { DeployFormComponent } from './components/deploy-form/deploy-form.component';
import { WorkloadDetailComponent } from './components/workload-detail/workload-detail.component';

const routes: Routes = [
  { path: '', component: WorkloadDashboardComponent },
  { path: 'namespaces', component: NamespaceListComponent },
  { path: 'list', component: WorkloadListComponent },
  { path: 'deploy', component: DeployFormComponent },
  { path: 'detail/:name', component: WorkloadDetailComponent },
];

@NgModule({
  declarations: [
    WorkloadDashboardComponent,
    NamespaceListComponent,
    WorkloadListComponent,
    DeployFormComponent,
    WorkloadDetailComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
  ],
})
export class WorkloadModule {}
