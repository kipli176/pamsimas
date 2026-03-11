# PAMSIMAS - Panduan Penggunaan Admin dan Petugas

Dokumen ini fokus pada penggunaan harian aplikasi untuk 2 peran: `admin` dan `petugas`.

## 1. Akun Uji

- Admin
  - Username: `admin`
  - Password: `admin123`
- Petugas
  - Username: `sunarso`
  - Password: `123456`

## 2. Hak Akses Ringkas

- Admin
  - Dashboard
  - Pelanggan
  - Pencatatan
  - Laporan
  - Slip Gaji
  - Tarif
  - Pengaturan
  - Users
- Petugas
  - Dashboard
  - Pelanggan
  - Pencatatan
  - Pembayaran

## 3. Alur Kerja Petugas

1. Login di `index.html` dengan akun petugas.
2. Buka menu `Dashboard`, pilih periode bulan/tahun, klik `Tampilkan Data` untuk melihat progres.
3. Buka menu `Pelanggan` untuk cek data pelanggan dan gunakan filter RT/RW/Status/Kategori bila perlu.
4. Buka menu `Pencatatan`:
   - Gunakan `Cari Pelanggan` untuk cari cepat.
   - Gunakan filter `Bulan`, `Tahun`, `RT`, `RW`, `Status` lalu klik `Tampilkan Data`.
   - Input meteran dan simpan status pencatatan.
5. Buka menu `Pembayaran`:
   - Filter berdasarkan periode/RT/RW/status.
   - Proses pembayaran pelanggan.
   - Cetak struk dari tombol print/struk.

## 4. Alur Kerja Admin

1. Login di `index.html` dengan akun admin.
2. Buka menu `Dashboard` untuk ringkasan KPI periode.
3. Buka menu `Pelanggan` untuk tambah/edit/hapus pelanggan dan kelola data wilayah RT/RW.
4. Buka menu `Pencatatan` jika admin juga melakukan pencatatan meteran di kantor.
5. Buka menu `Laporan`:
   - Pilih periode.
   - Gunakan filter `Pencarian`, `Petugas`, `RT`, `RW`, `Status`.
   - Klik KPI (misalnya `Belum Dicatat`) untuk lompat ke halaman terkait.
   - Gunakan `Print A4` untuk laporan ceklis sesuai data tabel yang sedang tampil.
6. Buka menu `Slip Gaji`:
   - Pilih bulan, tahun, dan dasar hitung (`Sudah Dicatat` atau `Sudah Lunas`).
   - Tabel menampilkan rekap per petugas.
   - Gunakan tombol `Print Slip` untuk cetak slip gaji resmi per petugas (A4).
7. Buka menu `Tarif`, `Pengaturan`, dan `Users` untuk konfigurasi sistem.

## 5. Skenario Testing Cepat

### 5.1 Testing Admin
1. Login dengan `admin/admin123`.
2. Pastikan menu `Laporan` dan `Slip Gaji` tampil.
3. Buka `Laporan`, ubah filter RT/RW/status, pastikan tabel dan total menyesuaikan.
4. Klik `Print A4`, pastikan preview berisi data tabel aktif.
5. Buka `Slip Gaji`, klik `Print Slip` pada salah satu petugas.

### 5.2 Testing Petugas
1. Logout, login ulang dengan `sunarso/123456`.
2. Pastikan menu `Pembayaran` tampil dan menu admin tidak tampil.
3. Buka `Pencatatan`, filter periode, lalu simpan minimal 1 data.
4. Buka `Pembayaran`, cari data terkait, proses pembayaran, lalu cetak struk.

## 6. Catatan Operasional

- Jika muncul error `Failed to fetch`, cek:
  - Backend API aktif.
  - Nilai `API_BASE_URL` di `frontend/js/config.js` sesuai server aktif.
  - Browser tidak memblokir mixed content atau koneksi ke domain API.
- Untuk akses mobile/PWA, pastikan aplikasi dibuka dari URL yang benar dan service worker aktif.
