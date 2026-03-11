from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date
from app.models.pelanggan import Pelanggan
from app.utils.barcode import generate_kode_pelanggan
from app.crud.audit_log import create_audit_log


def get_pelanggan(db: Session, pelanggan_id: int) -> Optional[Pelanggan]:
    """Get pelanggan by ID."""
    return db.query(Pelanggan).filter(Pelanggan.id == pelanggan_id).first()


def get_pelanggan_by_kode(db: Session, kode: str) -> Optional[Pelanggan]:
    """Get pelanggan by kode pelanggan."""
    return db.query(Pelanggan).filter(Pelanggan.kode_pelanggan == kode).first()


def search_pelanggan(
    db: Session,
    search: Optional[str] = None,
    kategori: Optional[str] = None,
    status: Optional[str] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    petugas_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Pelanggan]:
    """Search pelanggan with filters."""
    query = db.query(Pelanggan)

    if search:
        query = query.filter(
            (Pelanggan.nama.ilike(f"%{search}%")) |
            (Pelanggan.kode_pelanggan.ilike(f"%{search}%")) |
            (Pelanggan.no_hp.ilike(f"%{search}%"))
        )

    if kategori:
        query = query.filter(Pelanggan.kategori == kategori)

    if status:
        query = query.filter(Pelanggan.status == status)

    if rt:
        query = query.filter(Pelanggan.rt == rt)

    if rw:
        query = query.filter(Pelanggan.rw == rw)

    if petugas_id:
        query = query.filter(Pelanggan.petugas_id == petugas_id)

    return query.order_by(Pelanggan.created_at.desc()).offset(skip).limit(limit).all()


def create_pelanggan(
    db: Session,
    kode: str,
    nama: str,
    kategori: str,
    alamat: Optional[str] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    no_hp: Optional[str] = None,
    petugas_id: Optional[int] = None,
    meteran_awal: Optional[int] = 0,
    tanggal_pemasangan: Optional[date] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None
) -> Pelanggan:
    """Create new pelanggan."""
    db_pelanggan = Pelanggan(
        kode_pelanggan=kode,
        nama=nama,
        kategori=kategori,
        alamat=alamat,
        rt=rt,
        rw=rw,
        no_hp=no_hp,
        petugas_id=petugas_id,
        meteran_awal=meteran_awal
    )
    if tanggal_pemasangan:
        db_pelanggan.created_at = datetime.combine(tanggal_pemasangan, datetime.min.time())

    db.add(db_pelanggan)
    db.commit()
    db.refresh(db_pelanggan)

    # Create audit log
    if user_id:
        create_audit_log(
            db=db,
            user_id=user_id,
            aksi='create',
            tabel='pelanggan',
            record_id=db_pelanggan.id,
            data_baru={
                'kode_pelanggan': db_pelanggan.kode_pelanggan,
                'nama': db_pelanggan.nama,
                'kategori': db_pelanggan.kategori
            },
            ip_address=ip_address
        )

    return db_pelanggan


def update_pelanggan(
    db: Session,
    pelanggan_id: int,
    nama: Optional[str] = None,
    kategori: Optional[str] = None,
    alamat: Optional[str] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    no_hp: Optional[str] = None,
    petugas_id: Optional[int] = None,
    meteran_awal: Optional[int] = None,
    status: Optional[str] = None,
    tanggal_pemasangan: Optional[date] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None
) -> Optional[Pelanggan]:
    """Update pelanggan."""
    db_pelanggan = get_pelanggan(db, pelanggan_id)
    if not db_pelanggan:
        return None

    # Simpan data lama untuk audit log
    data_lama = {
        'kode_pelanggan': db_pelanggan.kode_pelanggan,
        'nama': db_pelanggan.nama,
        'kategori': db_pelanggan.kategori,
        'rt': db_pelanggan.rt,
        'rw': db_pelanggan.rw,
        'status': db_pelanggan.status,
        'created_at': db_pelanggan.created_at.isoformat() if db_pelanggan.created_at else None
    }

    # Update field yang diberikan
    if nama is not None:
        db_pelanggan.nama = nama
    if kategori is not None:
        db_pelanggan.kategori = kategori
    if alamat is not None:
        db_pelanggan.alamat = alamat
    if rt is not None:
        db_pelanggan.rt = rt
    if rw is not None:
        db_pelanggan.rw = rw
    if no_hp is not None:
        db_pelanggan.no_hp = no_hp
    if meteran_awal is not None:
        db_pelanggan.meteran_awal = meteran_awal
    if petugas_id is not None:
        db_pelanggan.petugas_id = petugas_id
    if status is not None:
        db_pelanggan.status = status
    if tanggal_pemasangan is not None:
        db_pelanggan.created_at = datetime.combine(tanggal_pemasangan, datetime.min.time())

    db.commit()
    db.refresh(db_pelanggan)

    # Create audit log
    if user_id:
        data_baru = {
            'kode_pelanggan': db_pelanggan.kode_pelanggan,
            'nama': db_pelanggan.nama,
            'kategori': db_pelanggan.kategori,
            'rt': db_pelanggan.rt,
            'rw': db_pelanggan.rw,
            'status': db_pelanggan.status,
            'created_at': db_pelanggan.created_at.isoformat() if db_pelanggan.created_at else None
        }

        # Hanya log field yang berubah
        changes = {}
        for key in data_lama:
            if data_lama[key] != data_baru[key]:
                changes[key] = {'old': data_lama[key], 'new': data_baru[key]}

        if changes:
            create_audit_log(
                db=db,
                user_id=user_id,
                aksi='update',
                tabel='pelanggan',
                record_id=db_pelanggan.id,
                data_lama=changes,
                data_baru=changes,
                ip_address=ip_address
            )

    return db_pelanggan


def delete_pelanggan(db: Session, pelanggan_id: int) -> bool:
    """Delete pelanggan (soft delete)."""
    db_pelanggan = get_pelanggan(db, pelanggan_id)
    if not db_pelanggan:
        return False

    db_pelanggan.status = "nonaktif"
    db.commit()
    return True


def generate_kode_pelanggan_auto(db: Session, tanggal: Optional[datetime] = None) -> str:
    """Generate kode pelanggan otomatis dengan increment."""
    if tanggal is None:
        tanggal = datetime.now()

    # Get count for today
    prefix = tanggal.strftime("%Y%m%d")
    count = db.query(Pelanggan).filter(
        Pelanggan.kode_pelanggan.like(f"{prefix}%")
    ).count()

    increment = count + 1
    return generate_kode_pelanggan(increment, tanggal)
