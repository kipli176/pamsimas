from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.core.deps import get_current_admin
from app.crud.tarif import get_tarif, get_tarif_list, create_tarif, update_tarif, delete_tarif
from app.crud.pengaturan import get_all_pengaturan, create_or_update_pengaturan, delete_pengaturan
from app.crud.user import get_users, create_user, update_user, delete_user
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.models.tarif import Tarif
from app.models.pengaturan import Pengaturan

router = APIRouter()


class TarifCreateRequest(BaseModel):
    kategori: str
    batas_bawah: int
    batas_atas: int
    harga_per_m3: float


class PengaturanSetRequest(BaseModel):
    key: str
    value: str
    deskripsi: Optional[str] = None


# ==================== TARIF ====================

@router.get("/tarif/", response_model=List[dict])
def list_tarif(
    kategori: str = None,
    aktif: bool = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get list tarif."""
    tarif_list = get_tarif_list(db, kategori=kategori, aktif=aktif, skip=skip, limit=limit)

    result = []
    for t in tarif_list:
        result.append({
            "id": t.id,
            "kategori": t.kategori,
            "batas_bawah": t.batas_bawah,
            "batas_atas": t.batas_atas,
            "harga_per_m3": float(t.harga_per_m3),
            "aktif": t.aktif
        })

    return result


@router.get("/tarif/{tarif_id}", response_model=dict)
def get_tarif_detail(
    tarif_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get detail tarif."""
    tarif = get_tarif(db, tarif_id)

    if not tarif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarif tidak ditemukan"
        )

    return {
        "id": tarif.id,
        "kategori": tarif.kategori,
        "batas_bawah": tarif.batas_bawah,
        "batas_atas": tarif.batas_atas,
        "harga_per_m3": float(tarif.harga_per_m3),
        "aktif": tarif.aktif
    }


@router.post("/tarif/", response_model=dict)
def create_tarif_baru(
    tarif_data: TarifCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Create tarif baru."""
    # Validate kategori
    if tarif_data.kategori not in ["personal", "bisnis"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kategori harus 'personal' atau 'bisnis'"
        )

    # Validate range
    if tarif_data.batas_bawah >= tarif_data.batas_atas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="batas_bawah harus lebih kecil dari batas_atas"
        )

    new_tarif = create_tarif(
        db,
        kategori=tarif_data.kategori,
        batas_bawah=tarif_data.batas_bawah,
        batas_atas=tarif_data.batas_atas,
        harga_per_m3=tarif_data.harga_per_m3
    )

    return {
        "id": new_tarif.id,
        "kategori": new_tarif.kategori,
        "batas_bawah": new_tarif.batas_bawah,
        "batas_atas": new_tarif.batas_atas,
        "harga_per_m3": float(new_tarif.harga_per_m3),
        "aktif": new_tarif.aktif
    }


@router.put("/tarif/{tarif_id}", response_model=dict)
def update_tarif_data(
    tarif_id: int,
    harga_per_m3: float = None,
    aktif: bool = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Update tarif."""
    updated_tarif = update_tarif(
        db,
        tarif_id=tarif_id,
        harga_per_m3=harga_per_m3,
        aktif=aktif
    )

    if not updated_tarif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarif tidak ditemukan"
        )

    return {
        "id": updated_tarif.id,
        "kategori": updated_tarif.kategori,
        "batas_bawah": updated_tarif.batas_bawah,
        "batas_atas": updated_tarif.batas_atas,
        "harga_per_m3": float(updated_tarif.harga_per_m3),
        "aktif": updated_tarif.aktif
    }


@router.delete("/tarif/{tarif_id}")
def hapus_tarif(
    tarif_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Hapus tarif (soft delete)."""
    success = delete_tarif(db, tarif_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarif tidak ditemukan"
        )

    return {"message": "Tarif berhasil dihapus (nonaktif)"}


# ==================== PENGATURAN ====================

@router.get("/pengaturan/", response_model=List[dict])
def list_pengaturan(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get all pengaturan."""
    pengaturan_list = get_all_pengaturan(db)

    result = []
    for p in pengaturan_list:
        result.append({
            "key": p.key,
            "value": p.value,
            "deskripsi": p.deskripsi,
            "updated_at": p.updated_at
        })

    return result


@router.get("/pengaturan/{key}", response_model=dict)
def get_pengaturan_detail(
    key: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get detail pengaturan by key."""
    pengaturan = db.query(Pengaturan).filter(Pengaturan.key == key).first()

    if not pengaturan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengaturan tidak ditemukan"
        )

    return {
        "key": pengaturan.key,
        "value": pengaturan.value,
        "deskripsi": pengaturan.deskripsi,
        "updated_at": pengaturan.updated_at
    }


@router.post("/pengaturan/", response_model=dict)
def create_or_update_pengaturan_data(
    pengaturan_data: PengaturanSetRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Create or update pengaturan."""
    pengaturan = create_or_update_pengaturan(
        db,
        key=pengaturan_data.key,
        value=pengaturan_data.value,
        deskripsi=pengaturan_data.deskripsi
    )

    return {
        "key": pengaturan.key,
        "value": pengaturan.value,
        "deskripsi": pengaturan.deskripsi,
        "updated_at": pengaturan.updated_at
    }


class PengaturanBatchUpdateRequest(BaseModel):
    items: list[PengaturanSetRequest]


@router.post("/pengaturan/batch", response_model=dict)
def batch_update_pengaturan(
    data: PengaturanBatchUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Update multiple pengaturan at once."""
    results = []
    errors = []

    for item in data.items:
        try:
            pengaturan = create_or_update_pengaturan(
                db,
                key=item.key,
                value=item.value,
                deskripsi=item.deskripsi
            )
            results.append({
                "key": pengaturan.key,
                "success": True
            })
        except Exception as e:
            errors.append({
                "key": item.key,
                "error": str(e)
            })

    return {
        "success": True,
        "results": results,
        "errors": errors
    }


@router.post("/pengaturan/set/{key}", response_model=dict)
def set_pengaturan_by_key(
    key: str,
    value: str,
    deskripsi: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Set pengaturan by key menggunakan form/query params."""
    pengaturan = create_or_update_pengaturan(
        db,
        key=key,
        value=value,
        deskripsi=deskripsi
    )

    return {
        "key": pengaturan.key,
        "value": pengaturan.value,
        "deskripsi": pengaturan.deskripsi,
        "updated_at": pengaturan.updated_at
    }


@router.delete("/pengaturan/{key}")
def hapus_pengaturan(
    key: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Hapus pengaturan."""
    success = delete_pengaturan(db, key)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengaturan tidak ditemukan"
        )

    return {"message": "Pengaturan berhasil dihapus"}


# ==================== USER MANAGEMENT ====================

@router.get("/users/", response_model=List[UserResponse])
def list_users(
    role: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get all users (Admin only)."""
    user_list = get_users(db, skip=skip, limit=limit, role=role)

    return [UserResponse.model_validate(u) for u in user_list]


@router.post("/users/", response_model=UserResponse)
def create_user_baru(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Create user baru (Admin only)."""
    # Cek username
    from app.crud.user import get_user_by_username
    existing = get_user_by_username(db, user_data.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username sudah digunakan"
        )

    new_user = create_user(
        db,
        username=user_data.username,
        password=user_data.password,
        nama_lengkap=user_data.nama_lengkap,
        role=user_data.role
    )

    return UserResponse.model_validate(new_user)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_data(
    user_id: int,
    nama_lengkap: str = None,
    password: str = None,
    aktif: bool = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Update user (Admin only)."""
    updated_user = update_user(
        db,
        user_id=user_id,
        nama_lengkap=nama_lengkap,
        password=password,
        aktif=aktif
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan"
        )

    return UserResponse.model_validate(updated_user)


@router.delete("/users/{user_id}")
def hapus_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Hapus user (Admin only, soft delete)."""
    success = delete_user(db, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan"
        )

    return {"message": "User berhasil dihapus (nonaktif)"}
