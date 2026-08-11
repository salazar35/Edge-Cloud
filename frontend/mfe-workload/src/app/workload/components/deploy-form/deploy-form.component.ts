import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkloadApiService } from '../../services/workload-api.service';

@Component({
  selector: 'deploy-form',
  template: `
    <div class="deploy-page">
      <div class="page-header">
        <button class="btn btn-outline" (click)="goBack()">
          <span class="material-icons">arrow_back</span>
          Back
        </button>
        <h2>Deploy New Workload</h2>
      </div>

      <form [formGroup]="form" (ngSubmit)="onDeploy()" class="deploy-form">
        <!-- Basic Info -->
        <div class="form-card">
          <h3>
            <span class="material-icons">info</span>
            Basic Information
          </h3>

          <div class="form-grid">
            <div class="form-group">
              <label>Deployment Name *</label>
              <input type="text" formControlName="name" placeholder="my-app" />
              <div class="error" *ngIf="form.get('name')?.touched && form.get('name')?.errors?.['required']">
                Required
              </div>
            </div>

            <div class="form-group">
              <label>Replicas</label>
              <input type="number" formControlName="replicas" min="1" max="100" />
            </div>

            <div class="form-group">
              <label>Service Port (optional)</label>
              <input type="number" formControlName="service_port" placeholder="80" />
              <span class="hint">Expose a ClusterIP service on this port</span>
            </div>
          </div>
        </div>

        <!-- Containers -->
        <div class="form-card">
          <div class="card-header">
            <h3>
              <span class="material-icons">layers</span>
              Containers
            </h3>
            <button type="button" class="btn btn-sm btn-outline" (click)="addContainer()">
              <span class="material-icons">add</span>
              Add Container
            </button>
          </div>

          <div
            formArrayName="containers"
            *ngFor="let container of containers.controls; let i = index"
          >
            <div [formGroupName]="i" class="container-block">
              <div class="container-header">
                <span class="container-num">Container #{{ i + 1 }}</span>
                <button
                  type="button"
                  class="btn btn-sm btn-danger"
                  *ngIf="containers.length > 1"
                  (click)="removeContainer(i)"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Container Name *</label>
                  <input type="text" formControlName="name" placeholder="app" />
                </div>

                <div class="form-group">
                  <label>Image *</label>
                  <input
                    type="text"
                    formControlName="image"
                    placeholder="nginx:latest"
                  />
                </div>

                <div class="form-group">
                  <label>Container Port</label>
                  <input
                    type="number"
                    formControlName="containerPort"
                    placeholder="80"
                  />
                </div>
              </div>

              <!-- Environment Variables -->
              <div class="env-section">
                <label>Environment Variables</label>
                <div formArrayName="env">
                  <div
                    *ngFor="let env of getEnvControls(i).controls; let j = index"
                    [formGroupName]="j"
                    class="env-row"
                  >
                    <input type="text" formControlName="name" placeholder="KEY" />
                    <input type="text" formControlName="value" placeholder="value" />
                    <button type="button" class="btn btn-sm btn-danger" (click)="removeEnv(i, j)">
                      <span class="material-icons">close</span>
                    </button>
                  </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline" (click)="addEnv(i)">
                  <span class="material-icons">add</span> Add Variable
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button type="button" class="btn btn-outline" (click)="goBack()">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || deploying">
            <span class="material-icons" *ngIf="!deploying">rocket_launch</span>
            <span class="material-icons spinning" *ngIf="deploying">sync</span>
            {{ deploying ? 'Deploying...' : 'Deploy' }}
          </button>
        </div>

        <div class="error-banner" *ngIf="error">
          <span class="material-icons">error</span>
          {{ error }}
        </div>

        <div class="success-banner" *ngIf="success">
          <span class="material-icons">check_circle</span>
          Deployment created successfully!
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

      .deploy-form {
        max-width: 800px;
      }

      .form-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 16px;
      }

      .form-card h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .card-header h3 {
        margin-bottom: 0;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .form-group label {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .form-group input {
        padding: 8px 12px;
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 14px;
      }

      .form-group input:focus {
        outline: none;
        border-color: var(--primary);
      }

      .hint {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .error {
        color: var(--warn);
        font-size: 11px;
      }

      .container-block {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .container-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .container-num {
        font-size: 13px;
        font-weight: 600;
        color: var(--primary-light);
      }

      .env-section {
        margin-top: 12px;
      }

      .env-section > label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .env-row {
        display: flex;
        gap: 8px;
        margin-bottom: 6px;
      }

      .env-row input {
        flex: 1;
        padding: 6px 10px;
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-primary);
        font-size: 13px;
      }

      .env-row input:focus {
        outline: none;
        border-color: var(--primary);
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 20px;
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

      .success-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-radius: 8px;
        color: var(--success);
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

      .btn-sm {
        padding: 6px 10px;
        font-size: 12px;
      }

      .btn-primary {
        background: var(--primary);
        color: white;
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

      .btn-danger {
        background: rgba(244, 67, 54, 0.1);
        color: #f44336;
        border: none;
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
export class DeployFormComponent implements OnInit {
  form: FormGroup;
  deploying = false;
  error = '';
  success = false;
  clusterId!: number;
  namespace = 'default';

  constructor(
    private fb: FormBuilder,
    private api: WorkloadApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(253)]],
      replicas: [1, [Validators.min(1), Validators.max(100)]],
      service_port: [null],
      containers: this.fb.array([this.createContainerGroup()]),
    });
  }

  ngOnInit(): void {
    this.clusterId = Number(this.route.snapshot.queryParamMap.get('cluster'));
    this.namespace = this.route.snapshot.queryParamMap.get('namespace') || 'default';
  }

  get containers(): FormArray {
    return this.form.get('containers') as FormArray;
  }

  createContainerGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      image: ['', Validators.required],
      containerPort: [80],
      env: this.fb.array([]),
    });
  }

  addContainer(): void {
    this.containers.push(this.createContainerGroup());
  }

  removeContainer(index: number): void {
    this.containers.removeAt(index);
  }

  getEnvControls(containerIndex: number): FormArray {
    return this.containers.at(containerIndex).get('env') as FormArray;
  }

  addEnv(containerIndex: number): void {
    this.getEnvControls(containerIndex).push(
      this.fb.group({ name: [''], value: [''] })
    );
  }

  removeEnv(containerIndex: number, envIndex: number): void {
    this.getEnvControls(containerIndex).removeAt(envIndex);
  }

  onDeploy(): void {
    if (this.form.invalid) return;

    this.deploying = true;
    this.error = '';
    this.success = false;

    const formValue = this.form.value;

    const payload = {
      name: formValue.name,
      namespace: this.namespace,
      replicas: formValue.replicas,
      service_port: formValue.service_port || undefined,
      containers: formValue.containers.map((c: any) => ({
        name: c.name,
        image: c.image,
        ports: c.containerPort ? [{ containerPort: c.containerPort }] : [],
        env: c.env.filter((e: any) => e.name),
      })),
    };

    this.api.deploy(this.clusterId, this.namespace, payload).subscribe({
      next: () => {
        this.deploying = false;
        this.success = true;
        setTimeout(() => {
          this.router.navigate(['/workloads', 'list'], {
            queryParams: { cluster: this.clusterId, namespace: this.namespace },
          });
        }, 1500);
      },
      error: (err) => {
        this.deploying = false;
        this.error = err.error?.detail || 'Deployment failed. Please check your configuration.';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/workloads'], {
      queryParams: { cluster: this.clusterId },
    });
  }
}
