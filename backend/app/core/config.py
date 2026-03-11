from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 300

    # Application
    APP_NAME: str = "PAMSIMAS"
    APP_VERSION: str = "1.0.0"

    # File Upload
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    UPLOAD_DIR: str = "/app/uploads"
    FOTO_METERAN_DIR: str = "/app/uploads/foto_meteran"

    # Pengaturan Default
    BIAYA_ADMIN: int = 3000
    BIAYA_SISTEM: int = 1000
    BIAYA_PETUGAS: int = 2000

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
