"""
Generate dan Manage Barcode Pelanggan
Format: YYYYMMDDXXXX (TahunBulanTanggalIncrement)
"""


from datetime import datetime
from typing import Optional


def generate_kode_pelanggan(increment: int, tanggal: Optional[datetime] = None) -> str:
    """
    Generate kode pelanggan dengan format YYYYMMDDXXXX

    Args:
        increment: Nomor urut (1-9999)
        tanggal: Tanggal pembuatan, default hari ini

    Returns:
        Kode pelanggan (string length 14)

    Example:
        >>> generate_kode_pelanggan(1, datetime(2026, 2, 4))
        '202602040001'
    """
    if tanggal is None:
        tanggal = datetime.now()

    tahun = tanggal.year
    bulan = f"{tanggal.month:02d}"
    hari = f"{tanggal.day:02d}"
    increment_str = f"{increment:04d}"

    return f"{tahun}{bulan}{hari}{increment_str}"


def parse_kode_pelanggan(kode: str) -> dict:
    """
    Parse kode pelanggan untuk mendapatkan informasi tanggal dan increment

    Args:
        kode: Kode pelanggan (YYYYMMDDXXXX)

    Returns:
        Dict dengan keys: tahun, bulan, tanggal, increment
    """
    if len(kode) != 14:
        raise ValueError("Kode pelanggan harus 14 digit")

    tahun = int(kode[0:4])
    bulan = int(kode[4:6])
    hari = int(kode[6:8])
    increment = int(kode[8:12])

    try:
        tanggal = datetime(tahun, bulan, hari)
    except ValueError as e:
        raise ValueError(f"Tanggal tidak valid: {e}")

    return {
        "tahun": tahun,
        "bulan": bulan,
        "tanggal": tanggal,
        "increment": increment
    }


def validate_kode_pelanggan(kode: str) -> bool:
    """
    Validate format kode pelanggan

    Args:
        kode: Kode pelanggan

    Returns:
        True jika valid, False jika tidak
    """
    try:
        parse_kode_pelanggan(kode)
        return True
    except (ValueError, IndexError):
        return False
