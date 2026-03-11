# Migration Scripts (Historical)

## ⚠️ OBSOLETE

File-file migration ini **OBSOLETE** dan tidak digunakan lagi.

Kolom-kolom yang ditambahkan oleh migration ini sudah ada di schema terbaru:
- `meteran_awal` - Sudah ada di `database_schema.sql`
- `rt` dan `rw` - Sudah ada di `database_schema.sql`

## Schema Terbaru

Gunakan `database_schema.sql` di root folder untuk setup database baru.

Schema terbaru sudah mencakup:
- ✅ Kolom `meteran_awal` di tabel `pelanggan`
- ✅ Kolom `rt` dan `rw` di tabel `pelanggan`
- ✅ Semua fitur lengkap dengan triggers, views, dan indexes

## File-file Migration

### 1. add_meteran_awal_to_pelanggan.sql
- **Tanggal:** 2026-03-08
- **Purpose:** Menambahkan kolom `meteran_awal` ke tabel `pelanggan`
- **Status:** ✅ Sudah diintegrasikan ke schema utama

### 2. add_rt_rw_to_pelanggan.sql
- **Tanggal:** 2026-03-08
- **Purpose:** Menambahkan kolom `rt` dan `rw` ke tabel `pelanggan`
- **Status:** ✅ Sudah diintegrasikan ke schema utama

## Catatan

File ini disimpan hanya sebagai dokumentasi sejarah perkembangan sistem.
**JANGAN jalankan file-file ini** jika Anda sudah menggunakan `database_schema.sql`.
