import { Component } from '@angular/core';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="material-icons logo-icon">cloud</span>
          <span class="logo-text">Edge Cloud</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a
          *ngFor="let item of navItems"
          [routerLink]="item.route"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="material-icons">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="version">v1.0.0</div>
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 260px;
        height: 100vh;
        background: #16213e;
        border-right: 1px solid #2a3a5e;
        display: flex;
        flex-direction: column;
        z-index: 100;
      }

      .sidebar-header {
        padding: 20px 24px;
        border-bottom: 1px solid #2a3a5e;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logo-icon {
        font-size: 28px;
        color: #42a5f5;
      }

      .logo-text {
        font-size: 18px;
        font-weight: 700;
        color: #ffffff;
      }

      .sidebar-nav {
        flex: 1;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
        color: #b0bec5;
        transition: all 0.2s ease;
        text-decoration: none;
      }

      .nav-item:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
      }

      .nav-item.active {
        background: rgba(25, 118, 210, 0.15);
        color: #42a5f5;
      }

      .nav-item .material-icons {
        font-size: 20px;
      }

      .nav-label {
        font-size: 14px;
        font-weight: 500;
      }

      .sidebar-footer {
        padding: 16px 24px;
        border-top: 1px solid #2a3a5e;
      }

      .version {
        font-size: 12px;
        color: #b0bec5;
      }
    `,
  ],
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Clusters', icon: 'dns', route: '/clusters' },
    { label: 'Workloads', icon: 'widgets', route: '/workloads' },
  ];
}
