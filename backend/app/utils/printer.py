"""
Print Nota Thermal untuk Pembayaran PAMSIMAS
Menggunakan ReportLab untuk generate PDF yang bisa diprint ke printer thermal
"""

from typing import Optional
from datetime import datetime


def generate_nota_text(
    nama_pelanggan: str,
    kode_pelanggan: str,
    bulan: int,
    tahun: int,
    meteran_awal: int,
    meteran_akhir: int,
    pemakaian: int,
    biaya_air: int,
    biaya_admin: int,
    total_tagihan: int,
    tanggal_bayar: Optional[datetime] = None,
    nama_petugas: Optional[str] = None,
    keterangan: Optional[str] = None,
    nama_instansi: str = "PAMSIMAS",
    alamat_instansi: Optional[str] = None,
    no_telp_instansi: Optional[str] = None
) -> str:
    """
    Generate text nota untuk thermal printer.

    Args:
        nama_pelanggan: Nama pelanggan
        kode_pelanggan: Kode pelanggan
        bulan: Bulan pencatatan
        tahun: Tahun pencatatan
        meteran_awal: Meteran awal
        meteran_akhir: Meteran akhir
        pemakaian: Pemakaian air (m³)
        biaya_air: Biaya air
        biaya_admin: Biaya admin
        total_tagihan: Total tagihan
        tanggal_bayar: Tanggal pembayaran
        nama_petugas: Nama petugas
        keterangan: Keterangan tambahan

    Returns:
        Text nota siap print
    """
    if tanggal_bayar is None:
        tanggal_bayar = datetime.now()

    # Format tanggal
    tanggal_str = tanggal_bayar.strftime("%d/%m/%Y %H:%M")
    bulan_str = f"{bulan:02d}/{tahun}"

    # Build nota text
    lines = []
    lines.append("=" * 42)
    lines.append(f"{nama_instansi:^42}")
    if alamat_instansi:
        lines.append(f"{alamat_instansi[:42]:^42}")
    if no_telp_instansi:
        lines.append(f"Telp: {no_telp_instansi}")
    lines.append(f"NOTA PEMBAYARAN AIR")
    lines.append("=" * 42)
    lines.append("")

    # Info pelanggan
    lines.append(f"No. Pelanggan : {kode_pelanggan}")
    lines.append(f"Nama         : {nama_pelanggan}")
    lines.append(f"Periode      : {bulan_str}")
    lines.append(f"Tgl Bayar    : {tanggal_str}")
    lines.append("-" * 42)
    lines.append("")

    # Detail meteran
    lines.append("DETAIL METERAN:")
    lines.append(f"  Meteran Awal  : {meteran_awal} m³")
    lines.append(f"  Meteran Akhir : {meteran_akhir} m³")
    lines.append(f"  Pemakaian     : {pemakaian} m³")
    lines.append("-" * 42)
    lines.append("")

    # Rincian biaya
    lines.append("RINCIAN BIAYA:")
    lines.append(f"  Biaya Air    : Rp {biaya_air:>10,}")
    lines.append(f"  Biaya Admin  : Rp {biaya_admin:>10,}")
    lines.append("-" * 42)
    lines.append(f"  TOTAL TAGIHAN: Rp {total_tagihan:>10,}")
    lines.append("=" * 42)
    lines.append("")

    # Petugas
    if nama_petugas:
        lines.append(f"Petugas: {nama_petugas}")

    # Footer
    lines.append("")
    lines.append("Terima kasih atas pembayaran Anda.")
    lines.append("Simpan nota ini sebagai bukti yang sah.")
    lines.append("")
    lines.append("=" * 42)

    return "\n".join(lines)


def format_rupiah(amount: int) -> str:
    """Format angka ke Rupiah."""
    return f"Rp {amount:,}"


# Contoh penggunaan
if __name__ == "__main__":
    nota = generate_nota_text(
        nama_pelanggan="Ahmad Subeki",
        kode_pelanggan="202602040001",
        bulan=2,
        tahun=2026,
        meteran_awal=100,
        meteran_akhir=115,
        pemakaian=15,
        biaya_air=7500,
        biaya_admin=3000,
        total_tagihan=10500,
        nama_petugas="Budi Santoso"
    )

    print(nota)
