import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([
      { path: '', loadChildren: () => import('./cluster/cluster.module').then(m => m.ClusterModule) }
    ]),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
