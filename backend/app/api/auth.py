from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.crud.user import authenticate_user, get_user_by_username, create_user
from app.schemas.user import UserLogin, Token, UserCreate, UserResponse

router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login user dan return JWT token.

    - **username**: Username user
    - **password**: Password user
    """
    # Authenticate user
    user = authenticate_user(db, user_credentials.username, user_credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.aktif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun user tidak aktif"
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    # Return token with user info
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register user baru (hanya untuk testing, sebaiknya hanya admin yang bisa create user).
    """
    # Cek apakah username sudah ada
    existing_user = get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username sudah digunakan"
        )

    # Validate role
    if user_data.role not in ["admin", "petugas"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role harus 'admin' atau 'petugas'"
        )

    # Create user
    new_user = create_user(
        db,
        username=user_data.username,
        password=user_data.password,
        nama_lengkap=user_data.nama_lengkap,
        role=user_data.role
    )

    return UserResponse.model_validate(new_user)
