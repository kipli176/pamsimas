from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime
from app.models.pembayaran import Pembayaran
from app.models.pencatatan import Pencatatan
from app.models.pelanggan import Pelanggan
from app.crud.pencatatan import get_pencatatan, calculate_tagihan


def get_pembayaran(db: Session, pembayaran_id: int) -> Optional[Pembayaran]:
    """Get pembayaran by ID."""
    return db.query(Pembayaran).filter(Pembayaran.id == pembayaran_id).first()


def get_pembayaran_by_pencatatan(db: Session, pencatatan_id: int) -> Optional[Pembayaran]:
    """Get pembayaran by pencatatan_id."""
    return db.query(Pembayaran).filter(Pembayaran.pencatatan_id == pencatatan_id).first()


def get_pembayaran_list(
    db: Session,
    pelanggan_id: Optional[int] = None,
    petugas_id: Optional[int] = None,
    admin_id: Optional[int] = None,
    status_bayar: Optional[str] = None,
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Pembayaran]:
    """Get list pembayaran with filters."""
    query = db.query(Pembayaran).join(Pencatatan).join(Pelanggan)

    if pelanggan_id:
        query = query.filter(Pembayaran.pelanggan_id == pelanggan_id)
    if petugas_id:
        query = query.filter(Pembayaran.petugas_id == petugas_id)
    if admin_id:
        query = query.filter(Pembayaran.admin_id == admin_id)
    if status_bayar:
        query = query.filter(Pembayaran.status_bayar == status_bayar)
    if bulan:
        query = query.filter(Pencatatan.bulan == bulan)
    if tahun:
        query = query.filter(Pencatatan.tahun == tahun)
    if rt:
        query = query.filter(Pelanggan.rt == rt)
    if rw:
        query = query.filter(Pelanggan.rw == rw)

    return query.order_by(Pembayaran.tanggal_bayar.desc()).offset(skip).limit(limit).all()


def create_pembayaran(
    db: Session,
    pencatatan_id: int,
    pelanggan_id: int,
    petugas_id: Optional[int] = None,
    admin_id: Optional[int] = None,
    metode_bayar: str = "tunai",
    keterangan: Optional[str] = None
) -> Optional[Pembayaran]:
    """Create new pembayaran."""
    # Get pencatatan
    pencatatan = get_pencatatan(db, pencatatan_id)
    if not pencatatan:
        return None

    # Cek apakah sudah ada pembayaran
    existing = get_pembayaran_by_pencatatan(db, pencatatan_id)
    if existing:
        return None

    # Calculate tagihan
    tagihan = calculate_tagihan(db, pencatatan)

    db_pembayaran = Pembayaran(
        pencatatan_id=pencatatan_id,
        pelanggan_id=pelanggan_id,
        petugas_id=petugas_id,
        admin_id=admin_id,
        total_tagihan=tagihan["total_tagihan"],
        biaya_admin=tagihan["biaya_admin"],
        biaya_sistem=tagihan["biaya_sistem"],
        biaya_petugas=tagihan["biaya_petugas"],
        biaya_air=tagihan["biaya_air"],
        metode_bayar=metode_bayar,
        status_bayar="lunas",
        tanggal_bayar=datetime.now(),
        keterangan=keterangan
    )

    db.add(db_pembayaran)
    db.commit()
    db.refresh(db_pembayaran)

    # Auto-update pelanggan.meteran_awal dengan meteran_akhir saat ini
    # Ini akan menjadi meteran awal untuk pencatatan bulan berikutnya
    pelanggan = db.query(Pelanggan).filter(Pelanggan.id == pelanggan_id).first()
    if pelanggan:
        pelanggan.meteran_awal = pencatatan.meteran_akhir
        db.commit()

    return db_pembayaran


def update_pembayaran(
    db: Session,
    pembayaran_id: int,
    status_bayar: Optional[str] = None,
    keterangan: Optional[str] = None
) -> Optional[Pembayaran]:
    """Update pembayaran."""
    db_pembayaran = get_pembayaran(db, pembayaran_id)
    if not db_pembayaran:
        return None

    if status_bayar is not None:
        db_pembayaran.status_bayar = status_bayar
    if keterangan is not None:
        db_pembayaran.keterangan = keterangan

    db.commit()
    db.refresh(db_pembayaran)
    return db_pembayaran


def delete_pembayaran(db: Session, pembayaran_id: int) -> bool:
    """Delete pembayaran."""
    db_pembayaran = get_pembayaran(db, pembayaran_id)
    if not db_pembayaran:
        return False

    db.delete(db_pembayaran)
    db.commit()
    return True


def get_rekap_petugas(
    db: Session,
    petugas_id: int,
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    hitung_berdasarkan: str = "tercatat"
) -> dict:
    """
    Get rekap gaji petugas.

    Args:
        petugas_id: ID petugas
        bulan: Bulan (optional)
        tahun: Tahun (optional)
        hitung_berdasarkan: 'tercatat' atau 'lunas'
    """
    query = db.query(Pembayaran).join(Pencatatan).filter(
        Pencatatan.petugas_id == petugas_id
    )

    if bulan:
        query = query.filter(Pencatatan.bulan == bulan)
    if tahun:
        query = query.filter(Pencatatan.tahun == tahun)

    pembayaran_list = query.all()

    if hitung_berdasarkan == "lunas":
        # Hitung berdasarkan yang sudah lunas
        jumlah_pelanggan = len([p for p in pembayaran_list if p.status_bayar == "lunas"])
    else:
        # Hitung berdasarkan yang sudah dicatat
        jumlah_pelanggan = len(pembayaran_list)

    total_gaji = sum([(p.biaya_petugas or 0) for p in pembayaran_list])

    return {
        "petugas_id": petugas_id,
        "bulan": bulan,
        "tahun": tahun,
        "hitung_berdasarkan": hitung_berdasarkan,
        "jumlah_pelanggan": jumlah_pelanggan,
        "biaya_per_pelanggan": 2000,
        "total_gaji": total_gaji,
        "jumlah_transaksi": len(pembayaran_list)
    }


def get_rekap_all_petugas(
    db: Session,
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    hitung_berdasarkan: str = "tercatat"
) -> List[dict]:
    """Get rekap semua petugas."""
    from app.models.user import User

    # Get all petugas
    petugas_list = db.query(User).filter(User.role == "petugas").all()

    results = []
    for petugas in petugas_list:
        rekap = get_rekap_petugas(
            db, petugas.id, bulan, tahun, hitung_berdasarkan
        )
        rekap["petugas_nama"] = petugas.nama_lengkap
        results.append(rekap)

    return results
