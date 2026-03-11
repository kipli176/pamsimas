from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.user import User
from app.core.security import get_password_hash, verify_password


def get_user(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username."""
    return db.query(User).filter(User.username == username).first()


def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None
) -> List[User]:
    """Get all users with optional filtering."""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)

    return query.offset(skip).limit(limit).all()


def create_user(db: Session, username: str, password: str, nama_lengkap: str, role: str) -> User:
    """Create new user."""
    hashed_password = get_password_hash(password)
    db_user = User(
        username=username,
        password_hash=hashed_password,
        nama_lengkap=nama_lengkap,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(
    db: Session,
    user_id: int,
    nama_lengkap: Optional[str] = None,
    password: Optional[str] = None,
    aktif: Optional[bool] = None
) -> Optional[User]:
    """Update user."""
    db_user = get_user(db, user_id)
    if not db_user:
        return None

    if nama_lengkap is not None:
        db_user.nama_lengkap = nama_lengkap
    if password is not None:
        db_user.password_hash = get_password_hash(password)
    if aktif is not None:
        db_user.aktif = aktif

    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    """Delete user (soft delete by setting aktif=False)."""
    db_user = get_user(db, user_id)
    if not db_user:
        return False

    db_user.aktif = False
    db.commit()
    return True


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user with username and password."""
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
