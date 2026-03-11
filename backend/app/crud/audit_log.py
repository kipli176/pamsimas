from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from datetime import datetime


def create_audit_log(
    db: Session,
    user_id: int,
    aksi: str,
    tabel: str,
    record_id: int,
    data_lama: dict = None,
    data_baru: dict = None,
    ip_address: str = None
):
    """Buat audit log baru."""
    audit_log = AuditLog(
        user_id=user_id,
        aksi=aksi,
        tabel=tabel,
        record_id=record_id,
        data_lama=data_lama,
        data_baru=data_baru,
        ip_address=ip_address,
        created_at=datetime.now()
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
