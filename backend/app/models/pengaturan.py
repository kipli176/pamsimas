from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.database import Base


class Pengaturan(Base):
    __tablename__ = "pengaturan"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    deskripsi = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Pengaturan(key={self.key}, value={self.value})>"
