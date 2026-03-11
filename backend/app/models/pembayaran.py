from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Pembayaran(Base):
    __tablename__ = "pembayaran"

    id = Column(Integer, primary_key=True, index=True)
    pencatatan_id = Column(Integer, ForeignKey("pencatatan.id", ondelete="CASCADE"), nullable=False)
    pelanggan_id = Column(Integer, ForeignKey("pelanggan.id", ondelete="CASCADE"), nullable=False)
    petugas_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))  # Jika bayar ke petugas
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))  # Jika bayar ke admin
    total_tagihan = Column(Integer, nullable=False)
    biaya_admin = Column(Integer, nullable=False, default=3000)
    biaya_sistem = Column(Integer, nullable=False, default=1000)
    biaya_petugas = Column(Integer, nullable=False, default=2000)
    biaya_air = Column(Integer, nullable=False, default=0)
    metode_bayar = Column(String(20), default="tunai")  # 'tunai' or 'transfer'
    status_bayar = Column(String(20), default="lunas")  # 'lunas' or 'belum'
    tanggal_bayar = Column(DateTime(timezone=True), nullable=False)
    keterangan = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    pencatatan = relationship("Pencatatan", back_populates="pembayaran")
    pelanggan = relationship("Pelanggan", back_populates="pembayaran")
    petugas = relationship("User", foreign_keys=[petugas_id])
    admin = relationship("User", foreign_keys=[admin_id])

    def __repr__(self):
        return f"<Pembayaran(id={self.id}, pelanggan_id={self.pelanggan_id}, total={self.total_tagihan})>"
