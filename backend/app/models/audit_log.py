from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, INET
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    aksi = Column(String(50), nullable=False)  # 'create', 'update', 'delete'
    tabel = Column(String(50), nullable=False)
    record_id = Column(Integer)
    data_lama = Column(JSONB)
    data_baru = Column(JSONB)
    ip_address = Column(INET)
    created_at = Column(DateTime(timezone=True), nullable=False)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, aksi={self.aksi}, tabel={self.tabel})>"
