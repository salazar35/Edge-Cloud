import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { ClusterListComponent } from './components/cluster-list/cluster-list.component';
import { ClusterAddComponent } from './components/cluster-add/cluster-add.component';
import { ClusterDetailComponent } from './components/cluster-detail/cluster-detail.component';
import { ClusterHealthComponent } from './components/cluster-health/cluster-health.component';

const routes: Routes = [
  { path: '', component: ClusterListComponent },
  { path: 'add', component: ClusterAddComponent },
  { path: ':id', component: ClusterDetailComponent },
  { path: ':id/health', component: ClusterHealthComponent },
];

@NgModule({
  declarations: [
    ClusterListComponent,
    ClusterAddComponent,
    ClusterDetailComponent,
    ClusterHealthComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class ClusterModule {}
