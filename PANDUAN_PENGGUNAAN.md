# 📘 PANDUAN PENGGUNAAN SISTEM PAMSIMAS
**Sistem Manajemen Air PAMDesa**

---

## 📋 DAFTAR ISI

1. [Pendahuluan](#pendahuluan)
2. [Cara Login](#cara-login)
3. [Panduan Petugas](#panduan-petugas)
4. [Panduan Admin](#panduan-admin)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 PENDAHULUAN

### Tentang Sistem
PAMSIMAS adalah sistem manajemen air minum yang mencakup:
- ✅ Pencatatan meteran bulanan
- ✅ Proses pembayaran
- ✅ Cetak nota thermal
- ✅ Laporan keuangan
- ✅ Manajemen pelanggan

### Akses Sistem
- **Frontend**: http://127.0.0.1:5500/frontend/index.html
- **Backend**: http://localhost:8000 (untuk developer)

### Role Pengguna
| Role | Username | Tugas Utama |
|------|----------|-------------|
| **Admin** | admin | Manajemen sistem, laporan, kelola tarif/user |
| **Petugas** | sunarso / arifcandi | Pencatatan meteran, pembayaran pelanggan |

---

## 🔑 CARA LOGIN

### Langkah-langkah Login:

1. **Buka Browser**
   - Ketik: `http://127.0.0.1:5500/frontend/index.html`
   - Atau klik bookmark yang sudah disimpan

2. **Masukkan Kredensial**

   **Untuk Admin:**
   ```
   Username: admin
   Password: admin123
   ```

   **Untuk Petugas:**
   ```
   Username: sunarso
   Password: 123456

   Atau

   Username: arifcandi
   Password: 123456
   ```

3. **Klik Tombol Login**
   - Tunggu proses loading
   - Anda akan diarahkan ke Dashboard

4. **Berhasil!**
   - Dashboard ditampilkan sesuai role Anda
   - Nama Anda muncul di sidebar atas

### Jika Gagal Login:
- ❌ **Username/Password salah** → Cek kembali pengetikan
- ❌ **Server tidak terkoneksi** → Pastikan backend sudah jalan
- ❌ **Session expired** → Logout dan login kembali

---

## 👷 PANDUAN PETUGAS

Petugas bertugas melakukan pencatatan meteran dan proses pembayaran pelanggan.

### 📌 MENU YANG TERSEDIA
- 🏠 Dashboard
- 👥 Pelanggan
- 📝 Pencatatan
- 💰 Pembayaran

---

### 1️⃣ DASHBOARD PETUGAS

**Yang Ditampilkan:**
- Total pelanggan Anda
- Pencatatan bulan ini
- Pembayaran bulan ini
- Pelanggan yang belum dicatat

**Cara Membaca Dashboard:**
- Total Pelanggan = Jumlah pelanggan yang menjadi tanggung jawab Anda
- Pencatatan Bulan Ini = Jumlah pencatatan yang sudah Anda buat bulan ini
- Pembayaran Bulan Ini = Jumlah pembayaran yang berhasil bulan ini
- Belum Dicatat = Pelanggan yang belum Anda catat meterannya bulan ini

---

### 2️⃣ PENCATATAN METERAN

#### A. Catat Meteran Baru

**Langkah-langkah:**

1. **Klik Menu Pencatatan**
   - Di sidebar, klik "Pencatatan"

2. **Klik Tombol "Catat Meteran"**
   - Tombol biru di atas tabel

3. **Cari Pelanggan**
   - Ketik **nama pelanggan** atau **kode barcode**
   - Tekan **Enter** atau klik tombol 🔍
   - Pilih pelanggan dari hasil pencarian

4. **Isi Data Pencatatan:**

   | Field | Cara Isi | Contoh |
   |-------|----------|--------|
   | **Periode** | Pilih bulan dan tahun | Maret 2026 |
   | **Meteran Awal** | **Otomatis** terisi dari bulan sebelumnya | 0 |
   | **Meteran Akhir** | Isi angka meteran saat ini | 25 |
   | **Pemakaian** | **Otomatis** terhitung (Akhir - Awal) | 25 m³ |
   | **Keterangan** | Opsional | -

5. **Upload Foto Meteran** (Opsional)
   - Klik "Choose File"
   - Pilih foto meteran
   - Klik "Upload"

6. **Pilih Status:**
   - **Draft** = Masih bisa diedit nanti
   - **Dicatat** = Sudah final, tidak bisa diedit

7. **Klik "Simpan"**
   - Data tersimpan
   - Sistem otomatis hitung tagihan

#### B. Edit Pencatatan (Draft)

**Syarat:** Hanya pencatatan dengan status "Draft" yang bisa diedit

1. Klik tombol ✏️ pada pencatatan draft
2. Ubah meteran akhir atau keterangan
3. Klik "Update"

#### C. Hapus Pencatatan (Draft)

1. Klik tombol 🗑️ pada pencatatan draft
2. Konfirmasi hapus

#### D. Lihat Detail & Tagihan

1. Klik tombol 👁️ pada pencatatan
2. Detail ditampilkan:
   - Meteran awal & akhir
   - Pemakaian
   - Rincian biaya
   - Status pembayaran

---

### 3️⃣ PROSES PEMBAYARAN

#### A. Proses Pembayaran Baru

**Langkah-langkah:**

1. **Dari Halaman Pencatatan**
   - Cari pencatatan yang **belum bayar** (status: "Belum")
   - Klik tombol 💰 pada pencatatan tersebut

2. **Sistem Tampilkan Total Tagihan**
   - Cek rincian tagihan
   - Klik **OK** untuk proses

3. **Pilih Metode Pembayaran:**
   - **Tunai** = Uang cash
   - **Transfer** = Transfer bank

4. **Isi Keterangan** (Opsional)
   - Misal: "Lunas via Bank BCA"

5. **Klik "Proses Pembayaran"**
   - Pembayaran berhasil!
   - Status berubah menjadi "Lunas"

#### B. Print Nota Thermal

**Cara 1: Dari Halaman Pencatatan**
1. Klik tombol 🖨️ Nota pada pencatatan yang sudah lunas
2. Nota ditampilkan dalam format thermal
3. Klik 🖨️ Print atau tekan **Ctrl + P**

**Cara 2: Dari Halaman Pembayaran**
1. Klik menu "Pembayaran"
2. Klik tombol 🖨️ Nota pada pembayaran yang diinginkan
3. Nota ditampilkan
4. Klik 🖨️ Print

#### C. Lihat Riwayat Pembayaran

1. **Klik Menu Pembayaran**
2. Tabel menampilkan semua pembayaran:
   - Tanggal
   - Nama Pelanggan
   - Total Tagihan
   - Metode Bayar
   - Status
   - Aksi (Nota)

3. **Filter** (Opsional)
   - Filter by bulan
   - Filter by tahun
   - Filter by status

---

### 4️⃣ MANAJEMEN PELANGGAN (PETUGAS)

#### A. Lihat Daftar Pelanggan

1. Klik menu "Pelanggan"
2. Tabel menampilkan semua pelanggan yang menjadi tanggung jawab Anda

#### B. Cari Pelanggan

1. Di kolom pencarian:
   - Ketik nama pelanggan
   - Atau ketik kode pelanggan
2. Tekan Enter
3. Hasil pencarian muncul

#### C. Lihat Detail Pelanggan

1. Klik tombol 👁️ pada pelanggan
2. Detail ditampilkan:
   - Kode pelanggan
   - Nama lengkap
   - Alamat lengkap
   - RT/RW
   - No HP
   - Meteran awal
   - Status

#### D. Tambah Pelanggan Baru (Jika Diizinkan Admin)

> **Catatan:** Beberapa sistem mungkin tidak mengizinkan petugas menambah pelanggan. Jika tidak ada tombol "Tambah Pelanggan", hubungi admin.

---

## 👨‍💼 PANDUAN ADMIN

Admin memiliki akses penuh ke seluruh fitur sistem termasuk manajemen pengguna, tarif, pengaturan, dan laporan.

### 📌 MENU YANG TERSEDIA
- 🏠 Dashboard
- 👥 Pelanggan
- 📝 Pencatatan
- 💰 Pembayaran
- 📊 Laporan
- 💵 Tarif
- ⚙️ Pengaturan
- 👤 Users

---

### 1️⃣ DASHBOARD ADMIN

**Yang Ditampilkan:**
- Total pelanggan (semua)
- Total pencatatan bulan ini
- Total pembayaran bulan ini
- Total pemasukan bulan ini
- Pelanggan belum dicatat
- Pelanggan belum bayar

**Cara Membaca Dashboard:**
- Total Pelanggan = Semua pelanggan aktif di sistem
- Total Pencatatan = Semua pencatatan bulan ini (semua petugas)
- Total Pembayaran = Semua pembayaran bulan ini
- Total Pemasukan = Total uang yang masuk bulan ini
- Belum Dicatat = Pelanggan yang belum dicatat bulan ini
- Belum Bayar = Pencatatan yang belum dibayar

---

### 2️⃣ MANAJEMEN PELANGGAN

#### A. Tambah Pelanggan Baru

**Langkah-langkah:**

1. **Klik Menu Pelanggan**
2. **Klik Tombol "Tambah Pelanggan"**
3. **Isi Data Pelanggan:**

   | Field | Wajib | Contoh |
   |-------|-------|--------|
   | **Nama** | ✅ Ya | Ahmad Subeki |
   | **Kategori** | ✅ Ya | Personal / Bisnis |
   | **Alamat** | ✅ Ya | Jl. Merdeka No. 123 |
   | **RT** | Tidak | 001 |
   | **RW** | Tidak | 002 |
   | **No HP** | Tidak | 08123456789 |
   | **Petugas** | Tidak | Pilih petugas |

4. **Klik "Simpan"**
   - Kode pelanggan otomatis generate
   - Format: `YYYYMMDDXXXX`
   - Contoh: `202603120001`

#### B. Edit Pelanggan

1. Klik tombol ✏️ pada pelanggan
2. Ubah data yang diinginkan
3. Klik "Update"

#### C. Hapus Pelanggan

1. Klik tombol 🗑️ pada pelanggan
2. Konfirmasi hapus
3. Pelanggan berubah status menjadi "Nonaktif"

> **⚠️ Perhatian:** Pelanggan yang sudah memiliki pencatatan atau pembayaran tidak bisa dihapus sepenuhnya, hanya dinonaktifkan.

#### D. Ganti Petugas Pelanggan

1. Klik ✏️ pada pelanggan
2. Ubah petugas
3. Klik "Update"
4. Sistem catat histori pergantian petugas

---

### 3️⃣ PENCATATAN (ADMIN)

Admin dapat melihat dan mengelola semua pencatatan dari semua petugas.

#### A. Lihat Semua Pencatatan

1. Klik menu "Pencatatan"
2. Semua pencatatan ditampilkan
3. Filter by:
   - Bulan
   - Tahun
   - Petugas
   - Status

#### B. Edit Pencatatan Draft

Admin bisa mengedit pencatatan draft dari petugas mana pun.

#### C. Lihat Detail Pencatatan

1. Klik 👁️ pada pencatatan
2. Lihat semua detail termasuk:
   - Data pelanggan
   - Data meteran
   - Rincian biaya
   - Status pembayaran

---

### 4️⃣ PEMBAYARAN (ADMIN)

#### A. Lihat Semua Pembayaran

1. Klik menu "Pembayaran"
2. Semua pembayaran ditampilkan
3. Filter by:
   - Bulan
   - Tahun
   - Status

#### B. Print Nota

Admin bisa print nota dari pembayaran mana pun.

#### C. Hapus Pembayaran (Jika Salah)

> **⚠️ Hati-hati:** Hanya hapus jika benar-benar salah input.

1. Klik tombol 🗑️ pada pembayaran
2. Konfirmasi hapus

---

### 5️⃣ LAPORAN

#### A. Laporan Bulanan

**Langkah-likah:**

1. **Klik Menu Laporan**
2. **Pilih Submenu "Bulanan"**
3. **Pilih Periode:**
   - Bulan (contoh: Maret)
   - Tahun (contoh: 2026)

4. **Klik "Tampilkan"**

**Data yang Ditampilkan:**
- Total pelanggan
- Sudah dicatat vs belum dicatat
- Sudah bayar vs belum bayar
- Total tagihan
- Total terbayar
- Sisa tagihan

5. **Export Laporan** (Opsional)
   - Klik tombol "Export"
   - Pilih format: PDF / Excel
   - File terdownload

#### B. Laporan Kroscek Petugas

**Gunakan untuk menghitung gaji petugas**

**Langkah-langkah:**

1. **Klik Menu Laporan**
2. **Pilih Submenu "Kroscek"**
3. **Pilih Periode:**
   - Bulan (contoh: Maret)
   - Tahun (contoh: 2026)

4. **Pilih "Hitung Gaji Berdasarkan:"**
   - **Sudah Dicatat** = Hitung dari semua pencatatan
   - **Sudah Lunas** = Hitung hanya dari yang sudah bayar

5. **Klik "Tampilkan"**

**Data yang Ditampilkan per Petugas:**
- Nama petugas
- Jumlah pelanggan
- Jumlah transaksi
- Biaya per pelanggan (default: Rp 2.000)
- **Total gaji**

6. **Export Laporan**
   - Klik "Export"
   - Simpan sebagai PDF/Excel

**Contoh Perhitungan Gaji:**
```
Petugas: Arif
Jumlah Pelanggan: 2
Biaya per Pelanggan: Rp 2.000
Total Gaji: 2 × Rp 2.000 = Rp 4.000
```

---

### 6️⃣ MANAJEMEN TARIF

#### A. Lihat Daftar Tarif

1. Klik menu "Tarif"
2. Tabel menampilkan semua tarif:
   - Kategori (Personal/Bisnis)
   - Range pemakaian
   - Harga per m³
   - Status (Aktif/Nonaktif)

#### B. Tambah Tarif Baru

**Langkah-langkah:**

1. **Klik Tombol "Tambah Tarif"**
2. **Isi Data Tarif:**

   | Field | Contoh |
   |-------|--------|
   | **Kategori** | Personal |
   | **Batas Bawah** | 0 |
   | **Batas Atas** | 10 |
   | **Harga per m³** | 250 |
   | **Aktif** | ✓ |

3. **Klik "Simpan"**

#### C. Edit Tarif

1. Klik tombol ✏️ pada tarif
2. Ubah harga atau status
3. Klik "Update"

> **⚠️ Perhatian:** Hati-hati mengubah tarif aktif karena akan mempengaruhi perhitungan tagihan.

#### D. Nonaktifkan Tarif

1. Klik ✏️ pada tarif
2. Ubah "Aktif" menjadi tidak dicentang
3. Klik "Update"

#### E. Struktur Tarif Rekomendasi

**Tarif Personal:**
| Range (m³) | Harga per m³ |
|------------|-------------|
| 0 - 10 | Rp 250 |
| 11 - 20 | Rp 500 |
| 21 - 30 | Rp 750 |
| 31 - 999 | Rp 1.000 |

**Tarif Bisnis:**
| Range (m³) | Harga per m³ |
|------------|-------------|
| 0 - 10 | Rp 500 |
| 11 - 20 | Rp 750 |
| 21 - 999 | Rp 1.000 |

---

### 7️⃣ PENGATURAN SISTEM

#### A. Lihat Semua Pengaturan

1. Klik menu "Pengaturan"
2. Tabel menampilkan semua pengaturan sistem

#### B. Edit Pengaturan

**Pengaturan Penting:**

| Pengaturan | Default | Deskripsi |
|------------|---------|-----------|
| **Nama Sistem** | PAMSIMASe | Nama aplikasi |
| **Nama Perusahaan** | PAMDesa Candinegara | Nama instansi |
| **Alamat Perusahaan** | Pekuncen | Alamat kantor |
| **Telepon** | 0812345678 | No telp kantor |
| **Biaya Admin** | Rp 3.000 | Biaya admin per pencatatan |
| **Biaya Sistem** | Rp 1.000 | Biaya sistem per transaksi |
| **Biaya Petugas** | Rp 2.000 | Biaya petugas per pencatatan |
| **Hitung Gaji Berdasarkan** | tercatat | Metode hitung gaji |

**Cara Mengubah:**

1. Klik tombol ✏️ pada pengaturan
2. Ubah nilai
3. Klik "Update"

#### C. Reset Pengaturan ke Default

Hubungi developer atau cek file `database_schema.sql` untuk nilai default.

---

### 8️⃣ MANAJEMEN USER

#### A. Lihat Semua User

1. Klik menu "Users"
2. Tabel menampilkan semua user:
   - Username
   - Nama lengkap
   - Role (Admin/Petugas)
   - Status (Aktif/Nonaktif)
   - Tanggal dibuat

#### B. Tambah Petugas Baru

**Langkah-langkah:**

1. **Klik Tombol "Tambah User"**
2. **Isi Data User:**

   | Field | Wajib | Contoh |
   |-------|-------|--------|
   | **Username** | ✅ Ya | budi_susanto |
   | **Password** | ✅ Ya | pass123 |
   | **Nama Lengkap** | ✅ Ya | Budi Susanto |
   | **Role** | ✅ Ya | Petugas |

3. **Klik "Simpan"**

#### C. Edit User

1. Klik tombol ✏️ pada user
2. Ubah data:
   - Nama lengkap
   - Password
   - Status (Aktif/Nonaktif)
3. Klik "Update"

#### D. Nonaktifkan User

**Gunakan jika petugas/resign tidak aktif:**

1. Klik ✏️ pada user
2. Ubah status menjadi tidak aktif
3. Klik "Update"

> **⚠️ Perhatian:** Jangan hapus user yang sudah memiliki data pencatatan/pembayaran. Nonaktifkan saja.

#### E. Reset Password User

1. Klik ✏️ pada user
2. Isi password baru
3. Klik "Update"

---

## 🔧 TROUBLESHOOTING

### ❌ Tidak Bisa Login

**Masalah:** Username/password tidak diterima

**Solusi:**
1. Cek kembali username dan password
2. Pastikan Caps Lock tidak aktif
3. Coba refresh browser (F5)
4. Clear cache browser
5. Hubungi admin untuk reset password

---

### ❌ Server Tidak Terkoneksi

**Masalah:** Muncul pesan "Tidak bisa terhubung ke server API"

**Solusi:**
1. Cek koneksi internet
2. Pastikan backend sudah jalan:
   - Buka terminal/command prompt
   - Ketik: `curl http://localhost:8000`
   - Jika muncul error, backend belum jalan
3. Jalankan backend:
   - Masuk ke folder project
   - Ketik: `docker-compose up -d`
   - Tunggu beberapa detik
4. Refresh browser

---

### ❌ Data Tidak Muncul

**Masalah:** Tabel kosong padahal ada data

**Solusi:**
1. Cek filter periode (bulan/tahun)
2. Klik "Reset Filter"
3. Logout dan login kembali
4. Clear cache browser

---

### ❌ Perhitungan Tagihan Salah

**Masalah:** Total tagihan tidak sesuai harapan

**Solusi:**
1. Cek tarif yang aktif
2. Cek biaya admin di pengaturan
3. Pastikan meteran awal dan akhir benar
4. Cek jumlah bulan belum dicatat
5. Lihat detail rincian biaya

---

### ❊ Print Nota Tidak Keluar

**Masalah:** Klik print tapi tidak terjadi apa-apa

**Solusi:**
1. Pastikan printer terhubung
2. Cek pengaturan printer di browser
3. Coba print ke PDF dulu
4. Pastikan browser mengizinkan print
5. Coba browser lain (Chrome/Firefox)

---

### ❊ Upload Foto Gagal

**Masalah:** Foto meteran tidak bisa diupload

**Solusi:**
1. Cek ukuran file (maksimal 5 MB)
2. Pastikan format file (JPG/PNG)
3. Cek koneksi internet
4. Coba refresh halaman
5. Pastikan folder upload ada di server

---

## 📞 HUBUNGI BANTUAN

Jika mengalami masalah yang tidak tertera di atas:

### Kontak Technical Support
- **Email:** kipli176@gmail.com
- **Telepon:** 08562603077
- **Jam Operasional:** Senin - Jumat (08:00 - 17:00)

### Dokumentasi Lengkap
- **API Documentation:** http://localhost:8000/docs
- **README Project:** Lihat file README.md di folder project

---

## 📝 TIPS & TRIK

### Untuk Petugas:
- ✅ Selalu cek meteran dengan teliti
- ✅ Foto meteran sebagai bukti
- ✅ Catat pelanggan secara berkala setiap bulan
- ✅ Proses pembayaran segera setelah pencatatan
- ✅ Print nota sebagai bukti sah

### Untuk Admin:
- ✅ Cek laporan bulanan secara rutin
- ✅ Rekap gaji petugas setiap akhir bulan
- ✅ Backup database secara berkala
- ✅ Monitor petugas yang belum melakukan pencatatan
- ✅ Review tarif dan biaya admin setiap 6 bulan

---

## 🎓 TUTORIAL VIDEO

Untuk tutorial visual, kunjungi:
- **Channel YouTube:** PAMSIMAS Official
- **Playlist:** Tutorial PAMSIMAS

---

## 📄 VERSION HISTORY

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 1.0.0 | 12 Maret 2026 | Release awal |

---

**© 2026 PAMDesa. All rights reserved.**

*Dokumentasi ini dibuat untuk memudahkan penggunaan Sistem PAMSIMAS.*
