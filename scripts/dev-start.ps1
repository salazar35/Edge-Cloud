# Edge Cloud - Development Start Script (PowerShell / Windows)
# Note: This project is primarily developed on Ubuntu 24.04
# This script is for local Windows development only

Write-Host "=== Edge Cloud - Starting Development (Windows) ===" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$pythonOk = Get-Command python -ErrorAction SilentlyContinue
$nodeOk = Get-Command node -ErrorAction SilentlyContinue

if (-not $pythonOk) { Write-Host "ERROR: Python not found" -ForegroundColor Red; exit 1 }
if (-not $nodeOk) { Write-Host "ERROR: Node.js not found" -ForegroundColor Red; exit 1 }

Write-Host "  Python: $(python --version)" -ForegroundColor Green
Write-Host "  Node:   $(node --version)" -ForegroundColor Green
Write-Host ""

# Backend (with venv)
Write-Host "Starting Backend (port 8000)..." -ForegroundColor Yellow
$backendPath = Join-Path $projectRoot "backend"
$venvPath = Join-Path $backendPath ".venv"

if (-not (Test-Path $venvPath)) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv $venvPath
}

Start-Process -NoNewWindow powershell -ArgumentList "-Command", @"
cd '$backendPath'
& '$venvPath\Scripts\Activate.ps1'
pip install -r requirements.txt -q
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"@

Start-Sleep -Seconds 3

# Frontend - Shell (port 4200)
Write-Host "Starting Shell (port 4200)..." -ForegroundColor Yellow
$shellPath = Join-Path $projectRoot "frontend\shell"
Start-Process -NoNewWindow powershell -ArgumentList "-Command", "cd '$shellPath'; if (-not (Test-Path node_modules)) { npm install }; npx ng serve --configuration development"

Start-Sleep -Seconds 2

# Frontend - MFE Cluster (port 4201)
Write-Host "Starting MFE Cluster (port 4201)..." -ForegroundColor Yellow
$mfeClusterPath = Join-Path $projectRoot "frontend\mfe-cluster"
Start-Process -NoNewWindow powershell -ArgumentList "-Command", "cd '$mfeClusterPath'; if (-not (Test-Path node_modules)) { npm install }; npx ng serve --configuration development"

Start-Sleep -Seconds 2

# Frontend - MFE Workload (port 4202)
Write-Host "Starting MFE Workload (port 4202)..." -ForegroundColor Yellow
$mfeWorkloadPath = Join-Path $projectRoot "frontend\mfe-workload"
Start-Process -NoNewWindow powershell -ArgumentList "-Command", "cd '$mfeWorkloadPath'; if (-not (Test-Path node_modules)) { npm install }; npx ng serve --configuration development"

Write-Host ""
Write-Host "=== All services starting ===" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Shell (Host):       http://localhost:4200"
Write-Host "  MFE Cluster:        http://localhost:4201"
Write-Host "  MFE Workload:       http://localhost:4202"
Write-Host "  Backend API:        http://localhost:8000"
Write-Host "  API Docs (Swagger): http://localhost:8000/docs"
Write-Host ""
Write-Host "Press Ctrl+C to exit this script (services continue in background)." -ForegroundColor Yellow
