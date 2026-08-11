"""Edge Cloud - Kubernetes Management Platform API."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import clusters, namespaces, workloads


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    await init_db()
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(
    title=settings.app_name,
    description="API for managing multiple Kubernetes clusters, namespaces, and workloads.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(clusters.router)
app.include_router(namespaces.router)
app.include_router(workloads.router)


@app.get("/api/health")
async def api_health():
    """API health check endpoint."""
    return {"status": "healthy", "service": settings.app_name}
