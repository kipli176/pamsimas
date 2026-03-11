from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class PelangganBase(BaseModel):
    kode_pelanggan: str = Field(..., description="Kode unik pelanggan (format: YYYYMMDDXXXX)")
    nama: str = Field(..., min_length=1, max_length=100)
    kategori: str = Field(..., pattern="^(personal|bisnis)$")
    alamat: Optional[str] = None
    rt: Optional[str] = None
    rw: Optional[str] = None
    no_hp: Optional[str] = None


class PelangganCreate(PelangganBase):
    petugas_id: Optional[int] = None
    meteran_awal: Optional[int] = 0
    tanggal_pemasangan: Optional[date] = None


class PelangganCreateAuto(BaseModel):
    """Schema untuk create pelanggan dengan auto-generate kode."""
    nama: str = Field(..., min_length=1, max_length=100)
    kategori: str = Field(..., pattern="^(personal|bisnis)$")
    alamat: Optional[str] = None
    rt: Optional[str] = None
    rw: Optional[str] = None
    no_hp: Optional[str] = None
    petugas_id: Optional[int] = None
    meteran_awal: Optional[int] = 0
    tanggal_pemasangan: Optional[date] = None


class PelangganUpdate(BaseModel):
    nama: Optional[str] = None
    kategori: Optional[str] = None
    alamat: Optional[str] = None
    rt: Optional[str] = None
    rw: Optional[str] = None
    no_hp: Optional[str] = None
    petugas_id: Optional[int] = None
    meteran_awal: Optional[int] = None
    status: Optional[str] = None  # 'aktif' or 'nonaktif'
    tanggal_pemasangan: Optional[date] = None


class PelangganResponse(PelangganBase):
    id: int
    petugas_id: Optional[int] = None
    meteran_awal: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PelangganWithPetugas(PelangganResponse):
    petugas_nama: Optional[str] = None

    class Config:
        from_attributes = True
