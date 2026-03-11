from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import re
from pathlib import Path
from PIL import Image
from io import BytesIO
from app.database import get_db
from app.core.deps import get_current_petugas, get_current_admin
from app.core.config import settings
from app.crud.pencatatan import (
    get_pencatatan, get_pencatatan_list, create_pencatatan,
    update_pencatatan, delete_pencatatan, calculate_tagihan,
    get_laporan_bulanan
)
from app.crud.pelanggan import get_pelanggan
from app.crud.tarif import get_tarif_list
from app.crud.pengaturan import get_pengaturan
from app.crud.audit_log import create_audit_log
from app.schemas.pencatatan import (
    PencatatanCreate, PencatatanUpdate, PencatatanResponse,
    PencatatanWithPelanggan, PencatatanWithPembayaran
)

router = APIRouter()


def sanitize_filename(value: str) -> str:
    """Sanitize nama file agar aman di filesystem."""
    value = (value or "").strip()
    value = re.sub(r"[^A-Za-z0-9_.-]+", "_", value)
    return value or "pelanggan"


def resolve_foto_meteran_dir() -> Path:
    """Resolve upload dir foto meteran sesuai env, fallback jika path env gagal dibuat."""
    configured_dir = Path(settings.FOTO_METERAN_DIR)
    try:
        configured_dir.mkdir(parents=True, exist_ok=True)
        return configured_dir
    except Exception:
        fallback = Path.cwd() / "uploads" / "foto_meteran"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


def upload_foto_meteran(
    file: UploadFile,
    kode_pelanggan: str,
    tahun: int,
    bulan: int
) -> str:
    """Upload foto meteran ke struktur tahun/bulan/kodepelanggan.jpg (overwrite)."""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File harus berupa gambar"
        )

    root_dir = resolve_foto_meteran_dir()
    relative_dir = Path(str(tahun), f"{bulan:02d}")
    target_dir = root_dir / relative_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    kode_safe = sanitize_filename(kode_pelanggan)
    target_filename = f"{kode_safe}.jpg"
    target_path = target_dir / target_filename

    # Overwrite file eksisting pelanggan di folder periode ini agar tidak dobel.
    for existing in target_dir.glob(f"{kode_safe}.*"):
        if existing.resolve() != target_path.resolve():
            try:
                existing.unlink()
            except Exception:
                pass

    try:
        file.file.seek(0)
        raw = file.file.read()
        image = Image.open(BytesIO(raw))
        image = image.convert("RGB")
        image.save(target_path, format="JPEG", quality=88, optimize=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal memproses file gambar: {str(e)}"
        )

    # Simpan sebagai path relatif terhadap /uploads/foto_meteran
    return str((relative_dir / target_filename).as_posix())


@router.get("/", response_model=List[PencatatanWithPembayaran])
def list_pencatatan(
    pelanggan_id: Optional[int] = None,
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    status_catat: Optional[str] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get list pencatatan dengan filter."""
    # Filter petugas
    petugas_id = None
    if current_user.role == "petugas":
        petugas_id = current_user.id

    pencatatan_list = get_pencatatan_list(
        db,
        pelanggan_id=pelanggan_id,
        petugas_id=petugas_id,
        bulan=bulan,
        tahun=tahun,
        status_catat=status_catat,
        rt=rt,
        rw=rw,
        skip=skip,
        limit=limit
    )

    # Build response with joins
    result = []
    for p in pencatatan_list:
        p_dict = PencatatanWithPembayaran.model_validate(p).model_dump()
        p_dict["pelanggan_nama"] = p.pelanggan.nama if p.pelanggan else None
        p_dict["pelanggan_kode"] = p.pelanggan.kode_pelanggan if p.pelanggan else None
        p_dict["pelanggan_rt"] = p.pelanggan.rt if p.pelanggan else None
        p_dict["pelanggan_rw"] = p.pelanggan.rw if p.pelanggan else None
        p_dict["pelanggan_kategori"] = p.pelanggan.kategori if p.pelanggan else None
        p_dict["petugas_nama"] = p.petugas.nama_lengkap if p.petugas else None
        p_dict["pembayaran_id"] = p.pembayaran.id if p.pembayaran else None
        p_dict["status_bayar"] = p.pembayaran.status_bayar if p.pembayaran else None
        p_dict["total_tagihan"] = p.pembayaran.total_tagihan if p.pembayaran else None
        result.append(PencatatanWithPembayaran(**p_dict))

    return result


@router.get("/{pencatatan_id:int}", response_model=PencatatanWithPembayaran)
def get_pencatatan_detail(
    pencatatan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get detail pencatatan."""
    pencatatan = get_pencatatan(db, pencatatan_id)

    if not pencatatan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pencatatan tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pencatatan.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pencatatan ini"
        )

    p_dict = PencatatanWithPembayaran.model_validate(pencatatan).model_dump()
    p_dict["pelanggan_nama"] = pencatatan.pelanggan.nama if pencatatan.pelanggan else None
    p_dict["pelanggan_kode"] = pencatatan.pelanggan.kode_pelanggan if pencatatan.pelanggan else None
    p_dict["pelanggan_kategori"] = pencatatan.pelanggan.kategori if pencatatan.pelanggan else None
    p_dict["petugas_nama"] = pencatatan.petugas.nama_lengkap if pencatatan.petugas else None
    p_dict["pembayaran_id"] = pencatatan.pembayaran.id if pencatatan.pembayaran else None
    p_dict["status_bayar"] = pencatatan.pembayaran.status_bayar if pencatatan.pembayaran else None
    p_dict["total_tagihan"] = pencatatan.pembayaran.total_tagihan if pencatatan.pembayaran else None

    return PencatatanWithPembayaran(**p_dict)


@router.post("/", response_model=PencatatanResponse)
def catat_meteran(
    pencatatan_data: PencatatanCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Catat meteran baru."""
    # Validate pelanggan exists
    pelanggan = get_pelanggan(db, pencatatan_data.pelanggan_id)
    if not pelanggan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pelanggan tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pelanggan.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pelanggan ini"
        )

    # Validate meteran_akhir >= meteran_awal
    if pencatatan_data.meteran_akhir < pencatatan_data.meteran_awal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meteran akhir tidak boleh lebih kecil dari meteran awal"
        )

    # Create pencatatan (meteran_awal akan di-overwrite oleh fungsi create)
    new_pencatatan = create_pencatatan(
        db,
        pelanggan_id=pencatatan_data.pelanggan_id,
        petugas_id=current_user.id,
        bulan=pencatatan_data.bulan,
        tahun=pencatatan_data.tahun,
        meteran_akhir=pencatatan_data.meteran_akhir,
        keterangan=pencatatan_data.keterangan,
        status_catat=pencatatan_data.status_catat
    )

    if not new_pencatatan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pencatatan untuk bulan ini sudah ada"
        )

    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db,
        user_id=current_user.id,
        aksi="create",
        tabel="pencatatan",
        record_id=new_pencatatan.id,
        data_baru={
            "pelanggan_id": new_pencatatan.pelanggan_id,
            "bulan": new_pencatatan.bulan,
            "tahun": new_pencatatan.tahun,
            "meteran_awal": new_pencatatan.meteran_awal,
            "meteran_akhir": new_pencatatan.meteran_akhir,
            "pemakaian": new_pencatatan.pemakaian
        },
        ip_address=ip_address
    )

    return PencatatanResponse.model_validate(new_pencatatan)


@router.post("/{pencatatan_id:int}/upload-foto", response_model=PencatatanResponse)
def upload_foto(
    pencatatan_id: int,
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Upload foto meteran untuk pencatatan."""
    pencatatan = get_pencatatan(db, pencatatan_id)
    if not pencatatan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pencatatan tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pencatatan.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pencatatan ini"
        )

    foto_lama = pencatatan.foto_meteran

    # Upload foto
    kode_pelanggan = pencatatan.pelanggan.kode_pelanggan if pencatatan.pelanggan else f"pelanggan_{pencatatan.pelanggan_id}"
    filename = upload_foto_meteran(
        file=file,
        kode_pelanggan=kode_pelanggan,
        tahun=pencatatan.tahun,
        bulan=pencatatan.bulan
    )

    # Update pencatatan
    updated = update_pencatatan(
        db,
        pencatatan_id,
        foto_meteran=filename
    )

    # Hapus file lama jika path sudah berganti.
    if foto_lama and foto_lama != filename:
        old_path = resolve_foto_meteran_dir() / Path(foto_lama)
        if old_path.exists():
            try:
                old_path.unlink()
            except Exception:
                pass

    ip_address = request.client.host if request and request.client else None
    create_audit_log(
        db=db,
        user_id=current_user.id,
        aksi="update",
        tabel="pencatatan",
        record_id=updated.id,
        data_lama={"foto_meteran": foto_lama},
        data_baru={"foto_meteran": updated.foto_meteran},
        ip_address=ip_address
    )

    return PencatatanResponse.model_validate(updated)


@router.put("/{pencatatan_id:int}", response_model=PencatatanResponse)
def edit_pencatatan(
    pencatatan_id: int,
    pencatatan_data: PencatatanUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Edit pencatatan (hanya jika belum dibayar)."""
    pencatatan = get_pencatatan(db, pencatatan_id)
    if not pencatatan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pencatatan tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pencatatan.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pencatatan ini"
        )

    # Cek apakah sudah dibayar
    if pencatatan.pembayaran:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pencatatan sudah dibayar, tidak bisa diedit"
        )

    data_lama = {
        "meteran_akhir": pencatatan.meteran_akhir,
        "keterangan": pencatatan.keterangan,
        "status_catat": pencatatan.status_catat
    }

    # Update
    updated = update_pencatatan(
        db,
        pencatatan_id,
        meteran_akhir=pencatatan_data.meteran_akhir,
        foto_meteran=pencatatan_data.foto_meteran,
        status_catat=pencatatan_data.status_catat,
        keterangan=pencatatan_data.keterangan
    )

    data_baru = {
        "meteran_akhir": updated.meteran_akhir,
        "keterangan": updated.keterangan,
        "status_catat": updated.status_catat
    }
    perubahan = {}
    for key in data_lama:
        if data_lama[key] != data_baru[key]:
            perubahan[key] = {"old": data_lama[key], "new": data_baru[key]}

    if perubahan:
        ip_address = request.client.host if request.client else None
        create_audit_log(
            db=db,
            user_id=current_user.id,
            aksi="update",
            tabel="pencatatan",
            record_id=updated.id,
            data_lama=perubahan,
            data_baru=perubahan,
            ip_address=ip_address
        )

    return PencatatanResponse.model_validate(updated)


@router.delete("/{pencatatan_id:int}")
def hapus_pencatatan(
    pencatatan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Hapus pencatatan."""
    pencatatan = get_pencatatan(db, pencatatan_id)
    if not pencatatan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pencatatan tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pencatatan.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pencatatan ini"
        )

    # Cek apakah sudah dibayar
    if pencatatan.pembayaran:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pencatatan sudah dibayar, tidak bisa dihapus"
        )

    success = delete_pencatatan(db, pencatatan_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal menghapus pencatatan"
        )

    return {"message": "Pencatatan berhasil dihapus"}


@router.get("/{pencatatan_id:int}/tagihan", response_model=dict)
def hitung_tagihan(
    pencatatan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Hitung tagihan untuk pencatatan."""
    pencatatan = get_pencatatan(db, pencatatan_id)
    if not pencatatan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pencatatan tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pencatatan.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pencatatan ini"
        )

    tagihan = calculate_tagihan(db, pencatatan)

    return tagihan


@router.get("/laporan/bulanan", response_model=dict)
def laporan_bulanan(
    bulan: int,
    tahun: int,
    petugas_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get laporan bulanan (Admin only)."""
    laporan = get_laporan_bulanan(db, bulan, tahun, petugas_id)

    return laporan


@router.get("/tarif")
def list_tarif(
    kategori: Optional[str] = None,
    aktif: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get list tarif (Admin & Petugas). Digunakan untuk perhitungan progresif."""
    from app.models.tarif import Tarif

    query = db.query(Tarif)

    if kategori:
        query = query.filter(Tarif.kategori == kategori)
    if aktif is not None:
        query = query.filter(Tarif.aktif == aktif)

    tarif_list = query.order_by(Tarif.batas_bawah).all()

    return [
        {
            "id": t.id,
            "kategori": t.kategori,
            "batas_bawah": t.batas_bawah,
            "batas_atas": t.batas_atas,
            "harga_per_m3": float(t.harga_per_m3),
            "aktif": t.aktif
        }
        for t in tarif_list
    ]


@router.get("/pengaturan-instansi")
def get_pengaturan_instansi(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get pengaturan instansi untuk struk (Admin & Petugas)."""
    nama_instansi = get_pengaturan(db, "nama_perusahaan")
    alamat_instansi = get_pengaturan(db, "alamat_perusahaan")
    telepon_instansi = get_pengaturan(db, "telepon_perusahaan")

    return {
        "nama_instansi": nama_instansi.value if nama_instansi else "PAMSIMAS",
        "alamat_instansi": alamat_instansi.value if alamat_instansi else "",
        "no_telp_instansi": telepon_instansi.value if telepon_instansi else ""
    }
