from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, func
from app.database import Base


class Tarif(Base):
    __tablename__ = "tarif"

    id = Column(Integer, primary_key=True, index=True)
    kategori = Column(String(20), nullable=False)  # 'personal' or 'bisnis'
    batas_bawah = Column(Integer, nullable=False)
    batas_atas = Column(Integer, nullable=False)
    harga_per_m3 = Column(Numeric(10, 2), nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Tarif(id={self.id}, kategori={self.kategori}, {self.batas_bawah}-{self.batas_atas}m³={self.harga_per_m3})>"
