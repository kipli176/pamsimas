from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_petugas, get_current_admin
from app.crud.pembayaran import (
    get_pembayaran, get_pembayaran_by_pencatatan, get_pembayaran_list, create_pembayaran,
    update_pembayaran, delete_pembayaran, get_rekap_petugas,
    get_rekap_all_petugas
)
from app.crud.pengaturan import get_pengaturan_value
from app.crud.audit_log import create_audit_log
from app.crud.pencatatan import get_pencatatan, calculate_tagihan
from app.schemas.pembayaran import (
    PembayaranCreate, PembayaranResponse, PembayaranWithDetail,
    NotaResponse
)
from app.utils.printer import generate_nota_text

router = APIRouter()


def get_instansi_settings(db: Session) -> dict:
    """Ambil pengaturan identitas instansi untuk header struk."""
    nama_instansi = get_pengaturan_value(db, "nama_perusahaan", None) or get_pengaturan_value(db, "nama_instansi", "PAMSIMAS")
    alamat_instansi = get_pengaturan_value(db, "alamat_perusahaan", None) or get_pengaturan_value(db, "alamat_instansi", "")
    no_telp_instansi = get_pengaturan_value(db, "telepon_perusahaan", None) or get_pengaturan_value(db, "no_telp_instansi", "")

    return {
        "nama_instansi": nama_instansi,
        "alamat_instansi": alamat_instansi,
        "no_telp_instansi": no_telp_instansi
    }


@router.get("/", response_model=List[PembayaranWithDetail])
def list_pembayaran(
    pelanggan_id: Optional[int] = None,
    status_bayar: Optional[str] = None,
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get list pembayaran dengan filter."""
    # Filter by petugas
    petugas_id = None
    if current_user.role == "petugas":
        petugas_id = current_user.id

    pembayaran_list = get_pembayaran_list(
        db,
        pelanggan_id=pelanggan_id,
        petugas_id=petugas_id,
        status_bayar=status_bayar,
        bulan=bulan,
        tahun=tahun,
        rt=rt,
        rw=rw,
        skip=skip,
        limit=limit
    )

    # Build response with joins
    result = []
    for p in pembayaran_list:
        p_dict = PembayaranWithDetail.model_validate(p).model_dump()
        p_dict["pelanggan_nama"] = p.pelanggan.nama if p.pelanggan else None
        p_dict["pelanggan_kode"] = p.pelanggan.kode_pelanggan if p.pelanggan else None
        p_dict["pelanggan_rt"] = p.pelanggan.rt if p.pelanggan else None
        p_dict["pelanggan_rw"] = p.pelanggan.rw if p.pelanggan else None
        p_dict["petugas_nama"] = p.petugas.nama_lengkap if p.petugas else None
        p_dict["admin_nama"] = p.admin.nama_lengkap if p.admin else None
        p_dict["bulan"] = p.pencatatan.bulan if p.pencatatan else None
        p_dict["tahun"] = p.pencatatan.tahun if p.pencatatan else None
        p_dict["meteran_awal"] = p.pencatatan.meteran_awal if p.pencatatan else None
        p_dict["meteran_akhir"] = p.pencatatan.meteran_akhir if p.pencatatan else None
        p_dict["pemakaian"] = p.pencatatan.pemakaian if p.pencatatan else None
        result.append(PembayaranWithDetail(**p_dict))

    return result


@router.get("/pencatatan/{pencatatan_id}", response_model=PembayaranWithDetail)
def get_pembayaran_dari_pencatatan(
    pencatatan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get pembayaran berdasarkan ID pencatatan."""
    pembayaran = get_pembayaran_by_pencatatan(db, pencatatan_id)

    if not pembayaran:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pembayaran tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pembayaran.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pembayaran ini"
        )

    p_dict = PembayaranWithDetail.model_validate(pembayaran).model_dump()
    p_dict["pelanggan_nama"] = pembayaran.pelanggan.nama if pembayaran.pelanggan else None
    p_dict["pelanggan_kode"] = pembayaran.pelanggan.kode_pelanggan if pembayaran.pelanggan else None
    p_dict["pelanggan_rt"] = pembayaran.pelanggan.rt if pembayaran.pelanggan else None
    p_dict["pelanggan_rw"] = pembayaran.pelanggan.rw if pembayaran.pelanggan else None
    p_dict["petugas_nama"] = pembayaran.petugas.nama_lengkap if pembayaran.petugas else None
    p_dict["admin_nama"] = pembayaran.admin.nama_lengkap if pembayaran.admin else None
    p_dict["bulan"] = pembayaran.pencatatan.bulan if pembayaran.pencatatan else None
    p_dict["tahun"] = pembayaran.pencatatan.tahun if pembayaran.pencatatan else None
    p_dict["meteran_awal"] = pembayaran.pencatatan.meteran_awal if pembayaran.pencatatan else None
    p_dict["meteran_akhir"] = pembayaran.pencatatan.meteran_akhir if pembayaran.pencatatan else None
    p_dict["pemakaian"] = pembayaran.pencatatan.pemakaian if pembayaran.pencatatan else None

    return PembayaranWithDetail(**p_dict)


@router.get("/pengaturan/instansi", response_model=dict)
def get_pengaturan_instansi(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get pengaturan instansi untuk kebutuhan print/nota."""
    return get_instansi_settings(db)


@router.get("/{pembayaran_id}", response_model=PembayaranWithDetail)
def get_pembayaran_detail(
    pembayaran_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get detail pembayaran."""
    pembayaran = get_pembayaran(db, pembayaran_id)

    if not pembayaran:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pembayaran tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas":
        if pembayaran.petugas_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tidak memiliki akses ke pembayaran ini"
            )

    p_dict = PembayaranWithDetail.model_validate(pembayaran).model_dump()
    p_dict["pelanggan_nama"] = pembayaran.pelanggan.nama if pembayaran.pelanggan else None
    p_dict["pelanggan_kode"] = pembayaran.pelanggan.kode_pelanggan if pembayaran.pelanggan else None
    p_dict["pelanggan_rt"] = pembayaran.pelanggan.rt if pembayaran.pelanggan else None
    p_dict["pelanggan_rw"] = pembayaran.pelanggan.rw if pembayaran.pelanggan else None
    p_dict["petugas_nama"] = pembayaran.petugas.nama_lengkap if pembayaran.petugas else None
    p_dict["admin_nama"] = pembayaran.admin.nama_lengkap if pembayaran.admin else None
    p_dict["bulan"] = pembayaran.pencatatan.bulan if pembayaran.pencatatan else None
    p_dict["tahun"] = pembayaran.pencatatan.tahun if pembayaran.pencatatan else None
    p_dict["meteran_awal"] = pembayaran.pencatatan.meteran_awal if pembayaran.pencatatan else None
    p_dict["meteran_akhir"] = pembayaran.pencatatan.meteran_akhir if pembayaran.pencatatan else None
    p_dict["pemakaian"] = pembayaran.pencatatan.pemakaian if pembayaran.pencatatan else None

    return PembayaranWithDetail(**p_dict)


@router.post("/proses", response_model=PembayaranWithDetail)
def proses_pembayaran(
    pencatatan_id: int,
    metode_bayar: str = "tunai",
    keterangan: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Proses pembayaran untuk pencatatan."""
    # Get pencatatan
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

    # Cek apakah sudah ada pembayaran
    if pencatatan.pembayaran:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pencatatan sudah dibayar"
        )

    # Create pembayaran
    petugas_id = current_user.id if current_user.role == "petugas" else None
    admin_id = current_user.id if current_user.role == "admin" else None

    new_pembayaran = create_pembayaran(
        db,
        pencatatan_id=pencatatan_id,
        pelanggan_id=pencatatan.pelanggan_id,
        petugas_id=petugas_id,
        admin_id=admin_id,
        metode_bayar=metode_bayar,
        keterangan=keterangan
    )

    if not new_pembayaran:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal membuat pembayaran"
        )

    ip_address = request.client.host if request and request.client else None
    create_audit_log(
        db=db,
        user_id=current_user.id,
        aksi="create",
        tabel="pembayaran",
        record_id=new_pembayaran.id,
        data_baru={
            "pencatatan_id": new_pembayaran.pencatatan_id,
            "pelanggan_id": new_pembayaran.pelanggan_id,
            "metode_bayar": new_pembayaran.metode_bayar,
            "total_tagihan": new_pembayaran.total_tagihan,
            "status_bayar": new_pembayaran.status_bayar
        },
        ip_address=ip_address
    )

    p_dict = PembayaranWithDetail.model_validate(new_pembayaran).model_dump()
    p_dict["pelanggan_nama"] = new_pembayaran.pelanggan.nama if new_pembayaran.pelanggan else None
    p_dict["pelanggan_kode"] = new_pembayaran.pelanggan.kode_pelanggan if new_pembayaran.pelanggan else None
    p_dict["pelanggan_rt"] = new_pembayaran.pelanggan.rt if new_pembayaran.pelanggan else None
    p_dict["pelanggan_rw"] = new_pembayaran.pelanggan.rw if new_pembayaran.pelanggan else None
    p_dict["petugas_nama"] = new_pembayaran.petugas.nama_lengkap if new_pembayaran.petugas else None
    p_dict["admin_nama"] = new_pembayaran.admin.nama_lengkap if new_pembayaran.admin else None
    p_dict["bulan"] = new_pembayaran.pencatatan.bulan if new_pembayaran.pencatatan else None
    p_dict["tahun"] = new_pembayaran.pencatatan.tahun if new_pembayaran.pencatatan else None
    p_dict["meteran_awal"] = new_pembayaran.pencatatan.meteran_awal if new_pembayaran.pencatatan else None
    p_dict["meteran_akhir"] = new_pembayaran.pencatatan.meteran_akhir if new_pembayaran.pencatatan else None
    p_dict["pemakaian"] = new_pembayaran.pencatatan.pemakaian if new_pembayaran.pencatatan else None

    return PembayaranWithDetail(**p_dict)


@router.get("/{pembayaran_id}/nota", response_model=NotaResponse)
def print_nota(
    pembayaran_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Generate nota untuk pembayaran."""
    pembayaran = get_pembayaran(db, pembayaran_id)

    if not pembayaran:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pembayaran tidak ditemukan"
        )

    # Cek permission
    if current_user.role == "petugas" and pembayaran.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pembayaran ini"
        )

    instansi_settings = get_instansi_settings(db)

    # Generate nota text
    nota_text = generate_nota_text(
        nama_pelanggan=pembayaran.pelanggan.nama,
        kode_pelanggan=pembayaran.pelanggan.kode_pelanggan,
        bulan=pembayaran.pencatatan.bulan,
        tahun=pembayaran.pencatatan.tahun,
        meteran_awal=pembayaran.pencatatan.meteran_awal,
        meteran_akhir=pembayaran.pencatatan.meteran_akhir,
        pemakaian=pembayaran.pencatatan.pemakaian,
        biaya_air=pembayaran.biaya_air,
        biaya_admin=pembayaran.biaya_admin,
        total_tagihan=pembayaran.total_tagihan,
        tanggal_bayar=pembayaran.tanggal_bayar,
        nama_petugas=pembayaran.petugas.nama_lengkap if pembayaran.petugas else None,
        keterangan=pembayaran.keterangan,
        nama_instansi=instansi_settings["nama_instansi"],
        alamat_instansi=instansi_settings["alamat_instansi"],
        no_telp_instansi=instansi_settings["no_telp_instansi"]
    )

    # Build pembayaran response
    p_dict = PembayaranWithDetail.model_validate(pembayaran).model_dump()
    p_dict["pelanggan_nama"] = pembayaran.pelanggan.nama if pembayaran.pelanggan else None
    p_dict["pelanggan_kode"] = pembayaran.pelanggan.kode_pelanggan if pembayaran.pelanggan else None
    p_dict["pelanggan_rt"] = pembayaran.pelanggan.rt if pembayaran.pelanggan else None
    p_dict["pelanggan_rw"] = pembayaran.pelanggan.rw if pembayaran.pelanggan else None
    p_dict["petugas_nama"] = pembayaran.petugas.nama_lengkap if pembayaran.petugas else None
    p_dict["admin_nama"] = pembayaran.admin.nama_lengkap if pembayaran.admin else None
    p_dict["bulan"] = pembayaran.pencatatan.bulan if pembayaran.pencatatan else None
    p_dict["tahun"] = pembayaran.pencatatan.tahun if pembayaran.pencatatan else None
    p_dict["meteran_awal"] = pembayaran.pencatatan.meteran_awal if pembayaran.pencatatan else None
    p_dict["meteran_akhir"] = pembayaran.pencatatan.meteran_akhir if pembayaran.pencatatan else None
    p_dict["pemakaian"] = pembayaran.pencatatan.pemakaian if pembayaran.pencatatan else None

    return NotaResponse(
        nota_text=nota_text,
        pembayaran=PembayaranWithDetail(**p_dict)
    )


@router.put("/{pembayaran_id}", response_model=PembayaranResponse)
def update_status_pembayaran(
    pembayaran_id: int,
    status_bayar: str,
    keterangan: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Update status pembayaran (Admin only)."""
    pembayaran = update_pembayaran(
        db,
        pembayaran_id,
        status_bayar=status_bayar,
        keterangan=keterangan
    )

    if not pembayaran:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pembayaran tidak ditemukan"
        )

    return PembayaranResponse.model_validate(pembayaran)


@router.delete("/{pembayaran_id}")
def hapus_pembayaran(
    pembayaran_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Hapus pembayaran (Admin only)."""
    success = delete_pembayaran(db, pembayaran_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pembayaran tidak ditemukan"
        )

    return {"message": "Pembayaran berhasil dihapus"}


@router.get("/rekap/petugas/{petugas_id}", response_model=dict)
def rekap_gaji_petugas(
    petugas_id: int,
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    hitung_berdasarkan: str = "tercatat",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get rekap gaji petugas (Admin only)."""
    rekap = get_rekap_petugas(
        db,
        petugas_id=petugas_id,
        bulan=bulan,
        tahun=tahun,
        hitung_berdasarkan=hitung_berdasarkan
    )

    return rekap


@router.get("/rekap/all-petugas", response_model=List[dict])
def rekap_gaji_all_petugas(
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    hitung_berdasarkan: str = "tercatat",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get rekap gaji semua petugas (Admin only)."""
    rekap_list = get_rekap_all_petugas(
        db,
        bulan=bulan,
        tahun=tahun,
        hitung_berdasarkan=hitung_berdasarkan
    )

    return rekap_list
