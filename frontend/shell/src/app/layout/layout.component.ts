import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  template: `
    <div class="app-layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-header></app-header>
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        min-height: 100vh;
      }

      .main-content {
        flex: 1;
        margin-left: 260px;
        display: flex;
        flex-direction: column;
      }

      .page-content {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
      }
    `,
  ],
})
export class LayoutComponent {}
