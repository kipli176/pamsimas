from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PencatatanBase(BaseModel):
    pelanggan_id: int
    bulan: int = Field(..., ge=1, le=12)
    tahun: int = Field(..., ge=2020, le=2100)
    meteran_awal: int = Field(..., ge=0)
    meteran_akhir: int = Field(..., ge=0)
    keterangan: Optional[str] = None


class PencatatanCreate(PencatatanBase):
    status_catat: Optional[str] = "dicatat"  # 'dicatat' or 'draft'


class PencatatanUpdate(BaseModel):
    meteran_akhir: Optional[int] = None
    foto_meteran: Optional[str] = None
    status_catat: Optional[str] = None
    keterangan: Optional[str] = None


class PencatatanResponse(PencatatanBase):
    id: int
    petugas_id: int
    pemakaian: int
    foto_meteran: Optional[str] = None
    total_biaya_admin: int
    jumlah_bulan_belum_dicatat: int
    status_catat: str
    tanggal_catat: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PencatatanWithPelanggan(PencatatanResponse):
    pelanggan_nama: Optional[str] = None
    pelanggan_kode: Optional[str] = None
    pelanggan_kategori: Optional[str] = None
    petugas_nama: Optional[str] = None


class PencatatanWithPembayaran(PencatatanWithPelanggan):
    pembayaran_id: Optional[int] = None
    status_bayar: Optional[str] = None
    total_tagihan: Optional[int] = None
