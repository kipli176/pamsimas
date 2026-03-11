from sqlalchemy.orm import Session
from typing import Optional, List, Any
from app.models.pengaturan import Pengaturan


def get_pengaturan(db: Session, key: str) -> Optional[Pengaturan]:
    """Get pengaturan by key."""
    return db.query(Pengaturan).filter(Pengaturan.key == key).first()


def get_pengaturan_value(db: Session, key: str, default: Any = None) -> Any:
    """Get pengaturan value by key."""
    pengaturan = get_pengaturan(db, key)
    if pengaturan:
        return pengaturan.value
    return default


def get_all_pengaturan(db: Session) -> List[Pengaturan]:
    """Get all pengaturan."""
    return db.query(Pengaturan).all()


def create_or_update_pengaturan(
    db: Session,
    key: str,
    value: str,
    deskripsi: Optional[str] = None
) -> Pengaturan:
    """Create or update pengaturan."""
    pengaturan = get_pengaturan(db, key)

    if pengaturan:
        # Update
        pengaturan.value = value
        if deskripsi is not None:
            pengaturan.deskripsi = deskripsi
    else:
        # Create
        pengaturan = Pengaturan(
            key=key,
            value=value,
            deskripsi=deskripsi
        )
        db.add(pengaturan)

    db.commit()
    db.refresh(pengaturan)
    return pengaturan


def delete_pengaturan(db: Session, key: str) -> bool:
    """Delete pengaturan."""
    pengaturan = get_pengaturan(db, key)
    if not pengaturan:
        return False

    db.delete(pengaturan)
    db.commit()
    return True


def get_biaya_admin(db: Session) -> int:
    """Get biaya admin from pengaturan."""
    value = get_pengaturan_value(db, "biaya_admin", "3000")
    return int(value)


def get_biaya_sistem(db: Session) -> int:
    """Get biaya sistem from pengaturan."""
    value = get_pengaturan_value(db, "biaya_sistem", "1000")
    return int(value)


def get_biaya_petugas(db: Session) -> int:
    """Get biaya petugas from pengaturan."""
    value = get_pengaturan_value(db, "biaya_petugas", "2000")
    return int(value)


def get_hitung_gaji_berdasarkan(db: Session) -> str:
    """Get hitung gaji berdasarkan from pengaturan."""
    value = get_pengaturan_value(db, "hitung_gaji_berdasarkan", "tercatat")
    return value
