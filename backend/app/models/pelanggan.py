from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Pelanggan(Base):
    __tablename__ = "pelanggan"

    id = Column(Integer, primary_key=True, index=True)
    kode_pelanggan = Column(String(20), unique=True, nullable=False, index=True)
    nama = Column(String(100), nullable=False)
    kategori = Column(String(20), nullable=False)  # 'personal' or 'bisnis'
    alamat = Column(Text)
    rt = Column(String(10))  # Rukun Tetangga
    rw = Column(String(10))  # Rukun Warga
    no_hp = Column(String(20))
    petugas_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    meteran_awal = Column(Integer, default=0)  # Meteran awal pelanggan
    status = Column(String(20), default="aktif")  # 'aktif' or 'nonaktif'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    petugas = relationship("User", foreign_keys=[petugas_id])
    pencatatan = relationship("Pencatatan", back_populates="pelanggan")
    pembayaran = relationship("Pembayaran", back_populates="pelanggan")

    def __repr__(self):
        return f"<Pelanggan(id={self.id}, kode={self.kode_pelanggan}, nama={self.nama}, rt={self.rt}, rw={self.rw}, meteran_awal={self.meteran_awal})>"
