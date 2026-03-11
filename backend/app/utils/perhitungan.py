"""
Perhitungan Tagihan Air PAMSIMAS
Tarif Progresif berdasarkan kategori pelanggan
"""


def hitung_biaya_air_dengan_rincian(pemakaian: int, kategori: str, tarif_list: list) -> dict:
    """
    Hitung biaya air berdasarkan pemakaian dan tarif progresif + rincian tier.

    Args:
        pemakaian: Jumlah pemakaian air dalam m³
        kategori: 'personal' atau 'bisnis'
        tarif_list: List of dict dengan keys: batas_bawah, batas_atas, harga_per_m3

    Returns:
        Dict berisi total biaya air dan rincian per tier.
    """
    total_biaya = 0
    rincian = []

    # Sort tarif berdasarkan batas bawah agar tier konsisten.
    tarif_sorted = sorted(
        [t for t in tarif_list if t.get('kategori') == kategori],
        key=lambda x: x['batas_bawah']
    )

    for tarif in tarif_sorted:
        batas_bawah = tarif['batas_bawah']
        batas_atas = tarif['batas_atas']
        harga = float(tarif['harga_per_m3'])

        # Range 0-10 berarti menghitung 1..10 (10 m3), bukan 0..10 (11 m3).
        range_mulai = 1 if batas_bawah == 0 else batas_bawah

        if pemakaian < range_mulai:
            continue

        pemakaian_di_tier = min(pemakaian, batas_atas) - range_mulai + 1
        if pemakaian_di_tier <= 0:
            continue

        subtotal = int(round(pemakaian_di_tier * harga))
        total_biaya += subtotal

        rincian.append({
            "batas_bawah": batas_bawah,
            "batas_atas": batas_atas,
            "range": f"{batas_bawah}-{batas_atas if batas_atas < 999999 else '+'}",
            "m3": pemakaian_di_tier,
            "harga_per_m3": harga,
            "subtotal": subtotal
        })

        if pemakaian <= batas_atas:
            break

    return {
        "biaya_air": total_biaya,
        "rincian_tarif": rincian
    }


def hitung_biaya_air(pemakaian: int, kategori: str, tarif_list: list) -> int:
    """
    Hitung biaya air total (tanpa rincian).
    """
    return hitung_biaya_air_dengan_rincian(pemakaian, kategori, tarif_list)["biaya_air"]


def hitung_total_tagihan(
    pemakaian: int,
    kategori: str,
    tarif_list: list,
    biaya_admin: int = 3000,
    jumlah_bulan_belum_dicatat: int = 1
) -> dict:
    """
    Hitung total tagihan pelanggan.

    Args:
        pemakaian: Jumlah pemakaian air dalam m³
        kategori: 'personal' atau 'bisnis'
        tarif_list: List tarif dari database
        biaya_admin: Biaya admin per bulan
        jumlah_bulan_belum_dicatat: Jumlah bulan yang belum dicatat

    Returns:
        Dict dengan breakdown tagihan
    """
    detail_biaya_air = hitung_biaya_air_dengan_rincian(pemakaian, kategori, tarif_list)
    biaya_air = detail_biaya_air["biaya_air"]

    # Hitung total biaya admin (ditumpuk jika beberapa bulan belum dicatat)
    total_biaya_admin = biaya_admin * jumlah_bulan_belum_dicatat

    # Hitung breakdown biaya admin
    total_biaya_sistem = 1000 * jumlah_bulan_belum_dicatat
    total_biaya_petugas = 2000 * jumlah_bulan_belum_dicatat

    # Total tagihan
    total_tagihan = biaya_air + total_biaya_admin

    return {
        "biaya_air": biaya_air,
        "rincian_tarif": detail_biaya_air["rincian_tarif"],
        "biaya_admin": total_biaya_admin,
        "biaya_sistem": total_biaya_sistem,
        "biaya_petugas": total_biaya_petugas,
        "total_tagihan": total_tagihan,
        "pemakaian": pemakaian,
        "jumlah_bulan_belum_dicatat": jumlah_bulan_belum_dicatat
    }


def hitung_gaji_petugas(
    jumlah_pelanggan: int,
    hitung_berdasarkan: str = "tercatat",
    biaya_petugas_per_pelanggan: int = 2000
) -> dict:
    """
    Hitung estimasi gaji petugas.

    Args:
        jumlah_pelanggan: Jumlah pelanggan
        hitung_berdasarkan: 'tercatat' atau 'lunas'
        biaya_petugas_per_pelanggan: Biaya petugas per pelanggan

    Returns:
        Dict dengan total gaji
    """
    total_gaji = jumlah_pelanggan * biaya_petugas_per_pelanggan

    return {
        "jumlah_pelanggan": jumlah_pelanggan,
        "biaya_per_pelanggan": biaya_petugas_per_pelanggan,
        "hitung_berdasarkan": hitung_berdasarkan,
        "total_gaji": total_gaji
    }


# Contoh penggunaan untuk testing
if __name__ == "__main__":
    # Contoh tarif
    tarif_personal = [
        {"kategori": "personal", "batas_bawah": 0, "batas_atas": 10, "harga_per_m3": 250},
        {"kategori": "personal", "batas_bawah": 11, "batas_atas": 20, "harga_per_m3": 500},
        {"kategori": "personal", "batas_bawah": 21, "batas_atas": 30, "harga_per_m3": 750},
        {"kategori": "personal", "batas_bawah": 31, "batas_atas": 999, "harga_per_m3": 1000},
    ]

    tarif_bisnis = [
        {"kategori": "bisnis", "batas_bawah": 0, "batas_atas": 10, "harga_per_m3": 500},
        {"kategori": "bisnis", "batas_bawah": 11, "batas_atas": 20, "harga_per_m3": 750},
        {"kategori": "bisnis", "batas_bawah": 21, "batas_atas": 30, "harga_per_m3": 1000},
    ]

    # Test 1: Personal 15 m³
    print("Test 1: Personal 15 m³")
    hasil = hitung_total_tagihan(15, "personal", tarif_personal)
    print(f"Biaya Air: Rp {hasil['biaya_air']:,}")
    print(f"Biaya Admin: Rp {hasil['biaya_admin']:,}")
    print(f"Total: Rp {hasil['total_tagihan']:,}")
    print()

    # Test 2: Bisnis 25 m³
    print("Test 2: Bisnis 25 m³")
    hasil = hitung_total_tagihan(25, "bisnis", tarif_bisnis)
    print(f"Biaya Air: Rp {hasil['biaya_air']:,}")
    print(f"Biaya Admin: Rp {hasil['biaya_admin']:,}")
    print(f"Total: Rp {hasil['total_tagihan']:,}")
    print()

    # Test 3: Belum dicatat 2 bulan
    print("Test 3: Personal 10 m³, belum dicatat 2 bulan")
    hasil = hitung_total_tagihan(10, "personal", tarif_personal, jumlah_bulan_belum_dicatat=2)
    print(f"Biaya Air: Rp {hasil['biaya_air']:,}")
    print(f"Biaya Admin (2 bulan): Rp {hasil['biaya_admin']:,}")
    print(f"Total: Rp {hasil['total_tagihan']:,}")
