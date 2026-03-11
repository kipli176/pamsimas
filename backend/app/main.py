from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.database import engine, Base
from app.api import auth, pelanggan, pencatatan, pembayaran, admin, print

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistem Manajemen PAMSIMAS"
)


def resolve_upload_dir() -> str:
    """Resolve upload dir sesuai env, fallback jika path env gagal dibuat."""
    configured_dir = Path(settings.UPLOAD_DIR)
    try:
        configured_dir.mkdir(parents=True, exist_ok=True)
        return str(configured_dir)
    except Exception:
        fallback = Path.cwd() / "uploads"
        fallback.mkdir(parents=True, exist_ok=True)
        return str(fallback)


UPLOAD_DIR = resolve_upload_dir()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(pelanggan.router, prefix="/api/pelanggan", tags=["Pelanggan"])
app.include_router(pencatatan.router, prefix="/api/pencatatan", tags=["Pencatatan"])
app.include_router(pembayaran.router, prefix="/api/pembayaran", tags=["Pembayaran"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(print.router, prefix="/api/print", tags=["Print"])

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "PAMSIMAS API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
