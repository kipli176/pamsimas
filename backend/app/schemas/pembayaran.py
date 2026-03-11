from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PembayaranBase(BaseModel):
    pencatatan_id: int
    pelanggan_id: int
    metode_bayar: str = "tunai"  # 'tunai' or 'transfer'
    keterangan: Optional[str] = None


class PembayaranCreate(PembayaranBase):
    total_tagihan: int
    biaya_admin: int
    biaya_sistem: int
    biaya_petugas: int
    biaya_air: int


class PembayaranResponse(PembayaranBase):
    id: int
    petugas_id: Optional[int] = None
    admin_id: Optional[int] = None
    total_tagihan: int
    biaya_admin: int
    biaya_sistem: int
    biaya_petugas: int
    biaya_air: int
    status_bayar: str
    tanggal_bayar: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PembayaranWithDetail(PembayaranResponse):
    pelanggan_nama: Optional[str] = None
    pelanggan_kode: Optional[str] = None
    pelanggan_rt: Optional[str] = None
    pelanggan_rw: Optional[str] = None
    petugas_nama: Optional[str] = None
    admin_nama: Optional[str] = None
    bulan: Optional[int] = None
    tahun: Optional[int] = None
    meteran_awal: Optional[int] = None
    meteran_akhir: Optional[int] = None
    pemakaian: Optional[int] = None


class NotaResponse(BaseModel):
    nota_text: str
    pembayaran: PembayaranWithDetail
