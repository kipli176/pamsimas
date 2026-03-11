from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_petugas, get_current_admin
from app.crud.pelanggan import (
    get_pelanggan, get_pelanggan_by_kode, search_pelanggan,
    create_pelanggan, update_pelanggan, delete_pelanggan,
    generate_kode_pelanggan_auto
)
from app.schemas.pelanggan import (
    PelangganCreate, PelangganCreateAuto, PelangganUpdate, PelangganResponse,
    PelangganWithPetugas
)

router = APIRouter()


@router.get("/", response_model=List[PelangganWithPetugas])
def list_pelanggan(
    search: Optional[str] = None,
    kategori: Optional[str] = None,
    status: Optional[str] = None,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """
    Get list pelanggan dengan filter opsional.

    - **search**: Cari berdasarkan nama, kode, atau no HP
    - **kategori**: Filter 'personal' atau 'bisnis'
    - **status**: Filter 'aktif' atau 'nonaktif'
    - **rt**: Filter berdasarkan RT
    - **rw**: Filter berdasarkan RW
    """
    # Petugas hanya bisa lihat pelanggan mereka sendiri
    petugas_id = None
    if current_user.role == "petugas":
        petugas_id = current_user.id

    pelanggan_list = search_pelanggan(
        db, search=search, kategori=kategori, status=status, rt=rt, rw=rw,
        petugas_id=petugas_id, skip=skip, limit=limit
    )

    # Join with petugas nama
    result = []
    for p in pelanggan_list:
        p_dict = PelangganWithPetugas.model_validate(p).model_dump()
        p_dict["petugas_nama"] = p.petugas.nama_lengkap if p.petugas else None
        result.append(PelangganWithPetugas(**p_dict))

    return result


@router.get("/{pelanggan_id}", response_model=PelangganWithPetugas)
def get_pelanggan_detail(
    pelanggan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get detail pelanggan by ID."""
    pelanggan = get_pelanggan(db, pelanggan_id)

    if not pelanggan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pelanggan tidak ditemukan"
        )

    # Cek permission (petugas hanya bisa akses pelanggan mereka)
    if current_user.role == "petugas" and pelanggan.petugas_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses ke pelanggan ini"
        )

    p_dict = PelangganWithPetugas.model_validate(pelanggan).model_dump()
    p_dict["petugas_nama"] = pelanggan.petugas.nama_lengkap if pelanggan.petugas else None

    return PelangganWithPetugas(**p_dict)


@router.get("/kode/{kode}", response_model=PelangganWithPetugas)
def get_pelanggan_by_kode_pelanggan(
    kode: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Get pelanggan by kode pelanggan (untuk scan barcode)."""
    pelanggan = get_pelanggan_by_kode(db, kode)

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

    p_dict = PelangganWithPetugas.model_validate(pelanggan).model_dump()
    p_dict["petugas_nama"] = pelanggan.petugas.nama_lengkap if pelanggan.petugas else None

    return PelangganWithPetugas(**p_dict)


@router.post("/", response_model=PelangganResponse)
def create_pelanggan_baru(
    pelanggan_data: PelangganCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Create pelanggan baru (Admin & Petugas)."""
    # Cek apakah kode sudah ada
    existing = get_pelanggan_by_kode(db, pelanggan_data.kode_pelanggan)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode pelanggan sudah digunakan"
        )

    # Tentukan petugas_id
    # Jika user adalah petugas, otomatis set ke dirinya sendiri
    # Jika user adalah admin, gunakan petugas_id dari request (atau null)
    if current_user.role == "petugas":
        petugas_id = current_user.id
    else:
        petugas_id = pelanggan_data.petugas_id

    new_pelanggan = create_pelanggan(
        db,
        kode=pelanggan_data.kode_pelanggan,
        nama=pelanggan_data.nama,
        kategori=pelanggan_data.kategori,
        alamat=pelanggan_data.alamat,
        rt=pelanggan_data.rt,
        rw=pelanggan_data.rw,
        no_hp=pelanggan_data.no_hp,
        petugas_id=petugas_id,
        meteran_awal=pelanggan_data.meteran_awal,
        tanggal_pemasangan=pelanggan_data.tanggal_pemasangan
    )

    return PelangganResponse.model_validate(new_pelanggan)


@router.post("/auto", response_model=PelangganResponse)
def create_pelanggan_auto_kode(
    pelanggan_data: PelangganCreateAuto,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Create pelanggan dengan auto-generate kode (Admin & Petugas)."""
    # Generate kode otomatis
    kode = generate_kode_pelanggan_auto(db)

    # Tentukan petugas_id
    # Jika user adalah petugas, otomatis set ke dirinya sendiri
    # Jika user adalah admin, gunakan petugas_id dari request (atau null)
    if current_user.role == "petugas":
        petugas_id = current_user.id
    else:
        petugas_id = pelanggan_data.petugas_id

    # Get IP address dari request
    ip_address = request.client.host if request.client else None

    new_pelanggan = create_pelanggan(
        db,
        kode=kode,
        nama=pelanggan_data.nama,
        kategori=pelanggan_data.kategori,
        alamat=pelanggan_data.alamat,
        rt=pelanggan_data.rt,
        rw=pelanggan_data.rw,
        no_hp=pelanggan_data.no_hp,
        petugas_id=petugas_id,
        meteran_awal=pelanggan_data.meteran_awal,
        tanggal_pemasangan=pelanggan_data.tanggal_pemasangan,
        user_id=current_user.id,
        ip_address=ip_address
    )

    return PelangganResponse.model_validate(new_pelanggan)


@router.put("/{pelanggan_id}", response_model=PelangganResponse)
def update_pelanggan_data(
    pelanggan_id: int,
    pelanggan_data: PelangganUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_petugas)
):
    """Update data pelanggan."""
    pelanggan = get_pelanggan(db, pelanggan_id)
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

    # Get IP address
    ip_address = request.client.host if request.client else None

    updated_pelanggan = update_pelanggan(
        db,
        pelanggan_id,
        nama=pelanggan_data.nama,
        kategori=pelanggan_data.kategori,
        alamat=pelanggan_data.alamat,
        rt=pelanggan_data.rt,
        rw=pelanggan_data.rw,
        no_hp=pelanggan_data.no_hp,
        petugas_id=pelanggan_data.petugas_id,
        meteran_awal=pelanggan_data.meteran_awal,
        status=pelanggan_data.status,
        tanggal_pemasangan=pelanggan_data.tanggal_pemasangan,
        user_id=current_user.id,
        ip_address=ip_address
    )

    return PelangganResponse.model_validate(updated_pelanggan)


@router.delete("/{pelanggan_id}")
def delete_pelanggan_data(
    pelanggan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Delete pelanggan (Admin only, soft delete)."""
    success = delete_pelanggan(db, pelanggan_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pelanggan tidak ditemukan"
        )

    return {"message": "Pelanggan berhasil dihapus (nonaktif)"}
