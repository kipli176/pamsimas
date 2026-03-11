from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import relationship
from app.database import Base


class Pencatatan(Base):
    __tablename__ = "pencatatan"

    id = Column(Integer, primary_key=True, index=True)
    pelanggan_id = Column(Integer, ForeignKey("pelanggan.id", ondelete="CASCADE"), nullable=False)
    petugas_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    bulan = Column(Integer, nullable=False)
    tahun = Column(Integer, nullable=False)
    meteran_awal = Column(Integer, nullable=False, default=0)
    meteran_akhir = Column(Integer, nullable=False)
    pemakaian = Column(Integer, server_default="0")  # Computed column: meteran_akhir - meteran_awal
    foto_meteran = Column(String(255))
    total_biaya_admin = Column(Integer, nullable=False, default=3000)
    jumlah_bulan_belum_dicatat = Column(Integer, default=1)
    status_catat = Column(String(20), default="dicatat")  # 'dicatat' or 'draft'
    tanggal_catat = Column(DateTime(timezone=True), nullable=False)
    keterangan = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    pelanggan = relationship("Pelanggan", back_populates="pencatatan")
    petugas = relationship("User", foreign_keys=[petugas_id])
    pembayaran = relationship("Pembayaran", back_populates="pencatatan", uselist=False)

    def __repr__(self):
        return f"<Pencatatan(id={self.id}, pelanggan_id={self.pelanggan_id}, {self.bulan}/{self.tahun})>"
