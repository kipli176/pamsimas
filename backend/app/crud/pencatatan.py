from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional, List
from datetime import datetime
from app.models.pencatatan import Pencatatan
from app.models.pelanggan import Pelanggan
from app.models.tarif import Tarif
from app.models.pembayaran import Pembayaran
from app.crud.pelanggan import get_pelanggan
from app.crud.pengaturan import get_biaya_admin
from app.utils.perhitungan import hitung_total_tagihan


def get_pencatatan(db: Session, pencatatan_id: int) -> Optional[Pencatatan]:
    """Get pencatatan by ID."""
    return db.query(Pencatatan).filter(Pencatatan.id == pencatatan_id).first()


def get_pencatatan_by_bulan_tahun(
    db: Session,
    pelanggan_id: int,
    bulan: int,
    tahun: int
) -> Optional[Pencatatan]:
    """Get pencatatan by pelanggan, bulan, dan tahun."""
    return db.query(Pencatatan).filter(
        and_(
            Pencatatan.pelanggan_id == pelanggan_id,
            Pencatatan.bulan == bulan,
            Pencatatan.tahun == tahun
        )
    ).first()


def get_pencatatan_list(
    db: Session,
    pelanggan_id: Optional[int] = None,
    petugas_id: Optional[int] = None,
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    status_catat: Optional[str] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Pencatatan]:
    """Get list pencatatan with filters."""
    query = db.query(Pencatatan).join(Pelanggan)

    if pelanggan_id:
        query = query.filter(Pencatatan.pelanggan_id == pelanggan_id)
    if petugas_id:
        query = query.filter(Pencatatan.petugas_id == petugas_id)
    if bulan:
        query = query.filter(Pencatatan.bulan == bulan)
    if tahun:
        query = query.filter(Pencatatan.tahun == tahun)
    if status_catat:
        query = query.filter(Pencatatan.status_catat == status_catat)
    if rt:
        query = query.filter(Pelanggan.rt == rt)
    if rw:
        query = query.filter(Pelanggan.rw == rw)

    return query.order_by(Pencatatan.tanggal_catat.desc()).offset(skip).limit(limit).all()


def get_meteran_awal(
    db: Session,
    pelanggan_id: int,
    bulan: int,
    tahun: int
) -> int:
    """
    Get meteran awal untuk pencatatan.
    Prioritas:
    1. Jika pelanggan baru (belum ada pencatatan sama sekali): gunakan pelanggan.meteran_awal
    2. Jika sudah ada pencatatan: gunakan meteran_akhir dari bulan sebelumnya
    3. Jika tidak ada bulan sebelumnya tapi ada pencatatan lain: gunakan meteran_akhir terakhir
    """
    pelanggan = get_pelanggan(db, pelanggan_id)
    if not pelanggan:
        return 0

    # Cek apakah ada pencatatan sama sekali (pelanggan baru)
    any_catat = db.query(Pencatatan).filter(
        Pencatatan.pelanggan_id == pelanggan_id
    ).first()

    if not any_catat:
        # Pelanggan baru - gunakan meteran_awal dari pelanggan
        return pelanggan.meteran_awal if pelanggan.meteran_awal is not None else 0

    # Sudah ada pencatatan - cari bulan sebelumnya
    # Hitung bulan/tahun sebelumnya
    if bulan == 1:
        bulan_sebelumnya = 12
        tahun_sebelumnya = tahun - 1
    else:
        bulan_sebelumnya = bulan - 1
        tahun_sebelumnya = tahun

    # Cari pencatatan bulan sebelumnya
    pencatatan = get_pencatatan_by_bulan_tahun(
        db, pelanggan_id, bulan_sebelumnya, tahun_sebelumnya
    )

    if pencatatan:
        return pencatatan.meteran_akhir
    else:
        # Ada pencatatan tapi tidak bulan sebelumnya
        # Cari pencatatan terakhir
        last_catat = db.query(Pencatatan).filter(
            Pencatatan.pelanggan_id == pelanggan_id
        ).order_by(
            Pencatatan.tahun.desc(),
            Pencatatan.bulan.desc()
        ).first()

        return last_catat.meteran_akhir if last_catat else 0


def hitung_bulan_belum_dicatat(
    db: Session,
    pelanggan_id: int,
    bulan: int,
    tahun: int
) -> int:
    """
    Hitung berapa bulan yang belum dicatat.
    Cek mundur dari bulan/tahun yang diminta sampai ketemu pencatatan terakhir.
    Batas awal mengikuti tanggal pelanggan dibuat (fallback: updated_at).
    """
    pelanggan = get_pelanggan(db, pelanggan_id)
    if not pelanggan:
        return 1

    def month_key(y: int, m: int) -> int:
        return y * 12 + (m - 1)

    # Batas awal pelanggan: created_at lalu updated_at jika created_at tidak ada.
    referensi_tanggal = pelanggan.created_at or pelanggan.updated_at or datetime.now()
    fallback_awal_bulan = int(referensi_tanggal.month)
    fallback_awal_tahun = int(referensi_tanggal.year)

    batas_awal_key = month_key(fallback_awal_tahun, fallback_awal_bulan)

    target_key = month_key(tahun, bulan)
    if target_key < batas_awal_key:
        return 1

    # Kumpulkan bulan/tahun yang sudah pernah dicatat untuk pelanggan ini.
    existing_records = db.query(Pencatatan).filter(
        Pencatatan.pelanggan_id == pelanggan_id
    ).all()
    # Exclude target month agar bulan berjalan tetap ditagihkan admin.
    # Jika tidak, saat pencatatan target sudah tersimpan hasil hitung bisa turun 1 bulan.
    existing_keys = {
        month_key(p.tahun, p.bulan)
        for p in existing_records
        if month_key(p.tahun, p.bulan) != target_key
    }

    # Mulai hitung dari bulan setelah pencatatan terakhir sebelum target, atau batas awal.
    last_before_target = [
        k for k in existing_keys
        if k < target_key
    ]
    if last_before_target:
        start_key = max(batas_awal_key, max(last_before_target) + 1)
    else:
        start_key = batas_awal_key

    if start_key > target_key:
        return 1

    count = 0
    for k in range(start_key, target_key + 1):
        if k not in existing_keys:
            count += 1

    # Safety cap: maksimum 24 bulan.
    count = min(count, 24)
    return count if count > 0 else 1


def get_bulan_belum_bayar(
    db: Session,
    pelanggan_id: int,
    sampai_bulan: int,
    sampai_tahun: int
) -> List[str]:
    """
    List bulan yang belum punya pembayaran lunas.
    Batas awal menggunakan pelanggan.created_at/updated_at.
    """
    pelanggan = get_pelanggan(db, pelanggan_id)
    if not pelanggan:
        return []

    referensi_tanggal = pelanggan.created_at or pelanggan.updated_at or datetime.now()
    fallback_awal_bulan = int(referensi_tanggal.month)
    fallback_awal_tahun = int(referensi_tanggal.year)

    def month_key(y: int, m: int) -> int:
        return y * 12 + (m - 1)

    batas_awal_key = month_key(fallback_awal_tahun, fallback_awal_bulan)
    batas_akhir_key = month_key(sampai_tahun, sampai_bulan)

    if batas_akhir_key < batas_awal_key:
        return []

    # Bulan yang sudah lunas
    pembayaran_lunas = db.query(Pencatatan.tahun, Pencatatan.bulan).join(
        Pembayaran, Pembayaran.pencatatan_id == Pencatatan.id
    ).filter(
        Pencatatan.pelanggan_id == pelanggan_id,
        Pembayaran.status_bayar == "lunas"
    ).all()

    lunas_keys = {month_key(row.tahun, row.bulan) for row in pembayaran_lunas}
    nama_bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

    belum_bayar = []
    for key in range(batas_awal_key, batas_akhir_key + 1):
        if key in lunas_keys:
            continue
        tahun = key // 12
        bulan = (key % 12) + 1
        belum_bayar.append(f"{nama_bulan[bulan - 1]} {tahun}")

    # Safety cap agar UI tidak terlalu panjang.
    return belum_bayar[-36:]


def create_pencatatan(
    db: Session,
    pelanggan_id: int,
    petugas_id: int,
    bulan: int,
    tahun: int,
    meteran_akhir: int,
    keterangan: Optional[str] = None,
    foto_meteran: Optional[str] = None,
    status_catat: str = "dicatat"
) -> Optional[Pencatatan]:
    """Create new pencatatan."""
    # Cek apakah sudah ada
    existing = get_pencatatan_by_bulan_tahun(db, pelanggan_id, bulan, tahun)
    if existing:
        return None  # Already exists

    # Get meteran awal
    meteran_awal = get_meteran_awal(db, pelanggan_id, bulan, tahun)

    # Hitung bulan belum dicatat
    jumlah_bulan = hitung_bulan_belum_dicatat(db, pelanggan_id, bulan, tahun)

    # Get pelanggan untuk kategori
    pelanggan = get_pelanggan(db, pelanggan_id)
    if not pelanggan:
        return None

    biaya_admin_per_bulan = get_biaya_admin(db)
    total_biaya_admin = biaya_admin_per_bulan * jumlah_bulan

    db_pencatatan = Pencatatan(
        pelanggan_id=pelanggan_id,
        petugas_id=petugas_id,
        bulan=bulan,
        tahun=tahun,
        meteran_awal=meteran_awal,
        meteran_akhir=meteran_akhir,
        foto_meteran=foto_meteran,
        total_biaya_admin=total_biaya_admin,
        jumlah_bulan_belum_dicatat=jumlah_bulan,
        status_catat=status_catat,
        tanggal_catat=datetime.now(),
        keterangan=keterangan
    )

    db.add(db_pencatatan)
    db.commit()
    db.refresh(db_pencatatan)
    return db_pencatatan


def update_pencatatan(
    db: Session,
    pencatatan_id: int,
    meteran_akhir: Optional[int] = None,
    foto_meteran: Optional[str] = None,
    status_catat: Optional[str] = None,
    keterangan: Optional[str] = None
) -> Optional[Pencatatan]:
    """Update pencatatan."""
    db_pencatatan = get_pencatatan(db, pencatatan_id)
    if not db_pencatatan:
        return None

    if meteran_akhir is not None:
        db_pencatatan.meteran_akhir = meteran_akhir
    if foto_meteran is not None:
        db_pencatatan.foto_meteran = foto_meteran
    if status_catat is not None:
        db_pencatatan.status_catat = status_catat
    if keterangan is not None:
        db_pencatatan.keterangan = keterangan

    db.commit()
    db.refresh(db_pencatatan)
    return db_pencatatan


def delete_pencatatan(db: Session, pencatatan_id: int) -> bool:
    """Delete pencatatan."""
    db_pencatatan = get_pencatatan(db, pencatatan_id)
    if not db_pencatatan:
        return False

    db.delete(db_pencatatan)
    db.commit()
    return True


def calculate_tagihan(
    db: Session,
    pencatatan: Pencatatan
) -> dict:
    """Calculate total tagihan for pencatatan."""
    # Get tarif list
    tarif_list = db.query(Tarif).filter(
        and_(
            Tarif.kategori == pencatatan.pelanggan.kategori,
            Tarif.aktif == True
        )
    ).all()

    tarif_dicts = [
        {
            "kategori": t.kategori,
            "batas_bawah": t.batas_bawah,
            "batas_atas": t.batas_atas,
            "harga_per_m3": float(t.harga_per_m3)
        }
        for t in tarif_list
    ]

    # Selalu hitung ulang jumlah bulan agar tidak terpengaruh data historis yang salah.
    jumlah_bulan = hitung_bulan_belum_dicatat(
        db=db,
        pelanggan_id=pencatatan.pelanggan_id,
        bulan=pencatatan.bulan,
        tahun=pencatatan.tahun
    )
    biaya_admin_per_bulan = get_biaya_admin(db)
    total_biaya_admin = biaya_admin_per_bulan * jumlah_bulan

    # Sinkronkan nilai tersimpan (legacy data bisa menyimpan angka berlebih).
    need_sync = (
        (pencatatan.jumlah_bulan_belum_dicatat or 1) != jumlah_bulan or
        (pencatatan.total_biaya_admin or 0) != total_biaya_admin
    )
    if need_sync:
        pencatatan.jumlah_bulan_belum_dicatat = jumlah_bulan
        pencatatan.total_biaya_admin = total_biaya_admin
        db.commit()
        db.refresh(pencatatan)

    result = hitung_total_tagihan(
        pemakaian=pencatatan.pemakaian,
        kategori=pencatatan.pelanggan.kategori,
        tarif_list=tarif_dicts,
        biaya_admin=biaya_admin_per_bulan,
        jumlah_bulan_belum_dicatat=jumlah_bulan
    )

    bulan_belum_bayar = get_bulan_belum_bayar(
        db=db,
        pelanggan_id=pencatatan.pelanggan_id,
        sampai_bulan=pencatatan.bulan,
        sampai_tahun=pencatatan.tahun
    )
    result["bulan_belum_bayar"] = bulan_belum_bayar
    result["jumlah_bulan_belum_bayar"] = len(bulan_belum_bayar)

    return result


def get_laporan_bulanan(
    db: Session,
    bulan: int,
    tahun: int,
    petugas_id: Optional[int] = None
) -> dict:
    """Get laporan bulanan dengan output JSON-safe."""
    pelanggan_query = db.query(Pelanggan).filter(Pelanggan.status == "aktif")
    if petugas_id:
        pelanggan_query = pelanggan_query.filter(Pelanggan.petugas_id == petugas_id)
    total_pelanggan = pelanggan_query.count()

    query = db.query(Pencatatan).join(Pelanggan).filter(
        and_(
            Pencatatan.bulan == bulan,
            Pencatatan.tahun == tahun
        )
    )

    if petugas_id:
        query = query.filter(Pencatatan.petugas_id == petugas_id)

    pencatatan_list = query.order_by(Pencatatan.tanggal_catat.desc()).all()

    serialized_pencatatan = []
    for item in pencatatan_list:
        pembayaran = item.pembayaran
        if pembayaran:
            biaya_air = pembayaran.biaya_air or 0
            biaya_admin = pembayaran.biaya_admin or 0
            biaya_petugas = pembayaran.biaya_petugas or 0
            total_tagihan = pembayaran.total_tagihan or 0
            status_bayar = pembayaran.status_bayar or "belum"
            bulan_belum_bayar = []
        else:
            tagihan_calc = calculate_tagihan(db, item)
            biaya_air = tagihan_calc.get("biaya_air", 0)
            biaya_admin = tagihan_calc.get("biaya_admin", 0)
            biaya_petugas = tagihan_calc.get("biaya_petugas", 0)
            total_tagihan = tagihan_calc.get("total_tagihan", 0)
            status_bayar = "belum"
            bulan_belum_bayar = tagihan_calc.get("bulan_belum_bayar", [])

        serialized_pencatatan.append({
            "id": item.id,
            "pelanggan_id": item.pelanggan_id,
            "petugas_id": item.petugas_id,
            "bulan": item.bulan,
            "tahun": item.tahun,
            "meteran_awal": item.meteran_awal,
            "meteran_akhir": item.meteran_akhir,
            "pemakaian": item.pemakaian,
            "status_catat": item.status_catat,
            "tanggal_catat": item.tanggal_catat,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "pelanggan": {
                "id": item.pelanggan.id if item.pelanggan else None,
                "nama": item.pelanggan.nama if item.pelanggan else None,
                "kode_pelanggan": item.pelanggan.kode_pelanggan if item.pelanggan else None,
                "kategori": item.pelanggan.kategori if item.pelanggan else None,
                "alamat": item.pelanggan.alamat if item.pelanggan else None,
                "rt": item.pelanggan.rt if item.pelanggan else None,
                "rw": item.pelanggan.rw if item.pelanggan else None
            } if item.pelanggan else None,
            "petugas": {
                "id": item.petugas.id if item.petugas else None,
                "nama_lengkap": item.petugas.nama_lengkap if item.petugas else None
            } if item.petugas else None,
            "pembayaran": {
                "id": pembayaran.id,
                "status_bayar": pembayaran.status_bayar,
                "total_tagihan": pembayaran.total_tagihan,
                "biaya_air": pembayaran.biaya_air,
                "biaya_admin": pembayaran.biaya_admin,
                "biaya_petugas": pembayaran.biaya_petugas,
                "tanggal_bayar": pembayaran.tanggal_bayar
            } if pembayaran else None,
            "pembayaran_id": pembayaran.id if pembayaran else None,
            "status_bayar": status_bayar,
            "biaya_air": biaya_air,
            "biaya_admin": biaya_admin,
            "biaya_petugas": biaya_petugas,
            "jumlah_bulan_belum_dicatat": item.jumlah_bulan_belum_dicatat or 1,
            "bulan_belum_bayar": bulan_belum_bayar,
            "total_tagihan": total_tagihan
        })

    sudah_dicatat = len([p for p in serialized_pencatatan if p["status_catat"] == "dicatat"])
    sudah_lunas = len([p for p in serialized_pencatatan if p["status_bayar"] == "lunas"])
    belum_dicatat = max(0, total_pelanggan - sudah_dicatat)
    belum_lunas = max(0, sudah_dicatat - sudah_lunas)

    return {
        "bulan": bulan,
        "tahun": tahun,
        "total_pelanggan": total_pelanggan,
        "sudah_dicatat": sudah_dicatat,
        "belum_dicatat": belum_dicatat,
        "sudah_lunas": sudah_lunas,
        "belum_lunas": belum_lunas,
        "pencatatan": serialized_pencatatan
    }
