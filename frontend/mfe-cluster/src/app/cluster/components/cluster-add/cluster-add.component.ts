import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClusterApiService } from '../../services/cluster-api.service';

@Component({
  selector: 'cluster-add',
  template: `
    <div class="cluster-add">
      <div class="page-header">
        <button class="btn btn-outline" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back
        </button>
        <h2>Add Kubernetes Cluster</h2>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="add-form">
        <div class="form-card">
          <h3>Cluster Information</h3>

          <div class="form-group">
            <label for="name">Cluster Name *</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              placeholder="e.g., production-cluster"
            />
            <div class="error" *ngIf="form.get('name')?.touched && form.get('name')?.errors?.['required']">
              Cluster name is required
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <input
              id="description"
              type="text"
              formControlName="description"
              placeholder="e.g., Production cluster in us-east-1"
            />
          </div>

          <div class="form-group">
            <label for="api_server_url">API Server URL *</label>
            <input
              id="api_server_url"
              type="url"
              formControlName="api_server_url"
              placeholder="https://k8s-api.example.com:6443"
            />
            <div class="error" *ngIf="form.get('api_server_url')?.touched && form.get('api_server_url')?.errors?.['required']">
              API Server URL is required
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Authentication</h3>
          <p class="hint">Paste your kubeconfig file content below. This will be used to authenticate with the cluster.</p>

          <div class="form-group">
            <label for="kubeconfig">Kubeconfig *</label>
            <textarea
              id="kubeconfig"
              formControlName="kubeconfig"
              rows="12"
              placeholder="apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://...
    certificate-authority-data: ...
  name: my-cluster
..."
            ></textarea>
            <div class="error" *ngIf="form.get('kubeconfig')?.touched && form.get('kubeconfig')?.errors?.['required']">
              Kubeconfig is required
            </div>
          </div>

          <div class="form-group">
            <label class="file-upload">
              <span class="material-icons">upload_file</span>
              Or upload kubeconfig file
              <input
                type="file"
                accept=".yaml,.yml,.conf"
                (change)="onFileSelected($event)"
                hidden
              />
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" (click)="goBack()">
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="form.invalid || submitting"
          >
            <span class="material-icons" *ngIf="!submitting">add</span>
            <span class="material-icons spinning" *ngIf="submitting">sync</span>
            {{ submitting ? 'Connecting...' : 'Add Cluster' }}
          </button>
        </div>

        <div class="error-banner" *ngIf="errorMessage">
          <span class="material-icons">error</span>
          {{ errorMessage }}
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .page-header h2 {
        font-size: 24px;
        font-weight: 600;
      }

      .add-form {
        max-width: 700px;
      }

      .form-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 16px;
      }

      .form-card h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .hint {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 16px;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }

      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 10px 14px;
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 14px;
        transition: border-color 0.2s;
      }

      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--primary);
      }

      .form-group textarea {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        resize: vertical;
      }

      .error {
        color: var(--warn);
        font-size: 12px;
        margin-top: 4px;
      }

      .file-upload {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border: 1px dashed var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 13px;
        transition: all 0.2s;
      }

      .file-upload:hover {
        border-color: var(--primary);
        color: var(--primary-light);
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: 8px;
        color: var(--warn);
        margin-top: 16px;
        font-size: 14px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-primary {
        background: var(--primary);
        color: white;
      }
      .btn-primary:hover {
        background: var(--primary-dark);
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-outline {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }
      .btn-outline:hover {
        border-color: var(--primary);
      }

      .spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class ClusterAddComponent {
  form: FormGroup;
  submitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private clusterApi: ClusterApiService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      api_server_url: ['', [Validators.required]],
      kubeconfig: ['', [Validators.required]],
    });
  }

  goBack(): void {
    this.router.navigate(['/clusters']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.form.patchValue({ kubeconfig: reader.result as string });
      };
      reader.readAsText(file);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    this.errorMessage = '';

    this.clusterApi.addCluster(this.form.value).subscribe({
      next: () => {
        this.router.navigate(['/clusters']);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage =
          err.error?.detail || 'Failed to add cluster. Please check your configuration.';
      },
    });
  }
}
