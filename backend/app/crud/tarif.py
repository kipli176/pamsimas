from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.tarif import Tarif


def get_tarif(db: Session, tarif_id: int) -> Optional[Tarif]:
    """Get tarif by ID."""
    return db.query(Tarif).filter(Tarif.id == tarif_id).first()


def get_tarif_list(
    db: Session,
    kategori: Optional[str] = None,
    aktif: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Tarif]:
    """Get all tarif with filters."""
    query = db.query(Tarif)

    if kategori:
        query = query.filter(Tarif.kategori == kategori)
    if aktif is not None:
        query = query.filter(Tarif.aktif == aktif)

    return query.order_by(Tarif.kategori, Tarif.batas_bawah).offset(skip).limit(limit).all()


def create_tarif(
    db: Session,
    kategori: str,
    batas_bawah: int,
    batas_atas: int,
    harga_per_m3: float
) -> Tarif:
    """Create new tarif."""
    db_tarif = Tarif(
        kategori=kategori,
        batas_bawah=batas_bawah,
        batas_atas=batas_atas,
        harga_per_m3=harga_per_m3
    )
    db.add(db_tarif)
    db.commit()
    db.refresh(db_tarif)
    return db_tarif


def update_tarif(
    db: Session,
    tarif_id: int,
    harga_per_m3: Optional[float] = None,
    aktif: Optional[bool] = None
) -> Optional[Tarif]:
    """Update tarif."""
    db_tarif = get_tarif(db, tarif_id)
    if not db_tarif:
        return None

    if harga_per_m3 is not None:
        db_tarif.harga_per_m3 = harga_per_m3
    if aktif is not None:
        db_tarif.aktif = aktif

    db.commit()
    db.refresh(db_tarif)
    return db_tarif


def delete_tarif(db: Session, tarif_id: int) -> bool:
    """Delete tarif (soft delete by setting aktif=False)."""
    db_tarif = get_tarif(db, tarif_id)
    if not db_tarif:
        return False

    db_tarif.aktif = False
    db.commit()
    return True
