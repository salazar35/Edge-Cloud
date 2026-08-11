import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  template: `
    <header class="header">
      <div class="header-left">
        <h1 class="page-title">Edge Cloud Dashboard</h1>
      </div>
      <div class="header-right">
        <div class="user-avatar">
          <span class="material-icons">account_circle</span>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: #16213e;
        border-bottom: 1px solid #2a3a5e;
      }

      .page-title {
        font-size: 20px;
        font-weight: 600;
        color: #ffffff;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .user-avatar .material-icons {
        font-size: 32px;
        color: #b0bec5;
        cursor: pointer;
      }
    `,
  ],
})
export class HeaderComponent {}
