# PAMSIMAS Database Schema Documentation

## Overview
Database PAMSIMAS menggunakan PostgreSQL dengan 7 tabel utama untuk mengelola sistem pencatatan meteran air dan pembayaran.

## Tabel-tabel Database

### 1. `users`
Tabel untuk menyimpan data pengguna (admin dan petugas).

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | SERIAL | Primary key |
| username | VARCHAR(50) | Username login (UNIQUE) |
| password_hash | VARCHAR(255) | Hash password (bcrypt) |
| role | VARCHAR(20) | Role: 'admin' atau 'petugas' |
| nama_lengkap | VARCHAR(100) | Nama lengkap user |
| aktif | BOOLEAN | Status aktif/nonaktif |
| created_at | TIMESTAMP | Waktu dibuat |
| updated_at | TIMESTAMP | Waktu diupdate |

**Default Users:**
- Admin: `admin` / `admin123`
- Petugas: `petugas1` / `petugas123`

---

### 2. `tarif`
Tabel untuk menyimpan tarif harga air per m³.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | SERIAL | Primary key |
| kategori | VARCHAR(20) | Kategori: 'personal' atau 'bisnis' |
| batas_bawah | INTEGER | Batas bawah pemakaian (m³) |
| batas_atas | INTEGER | Batas atas pemakaian (m³) |
| harga_per_m3 | NUMERIC(10,2) | Harga per m³ |
| aktif | BOOLEAN | Status aktif/nonaktif |
| created_at | TIMESTAMP | Waktu dibuat |
| updated_at | TIMESTAMP | Waktu diupdate |

**Contoh Tarif Personal:**
- 0-10 m³: Rp 1.500/m³
- 11-20 m³: Rp 2.000/m³
- 21-30 m³: Rp 2.500/m³
- >30 m³: Rp 3.000/m³

---

### 3. `pengaturan`
Tabel untuk menyimpan pengaturan sistem.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | SERIAL | Primary key |
| key | VARCHAR(50) | Key pengaturan (UNIQUE) |
| value | TEXT | Value pengaturan |
| deskripsi | TEXT | Deskripsi pengaturan |
| updated_at | TIMESTAMP | Waktu diupdate |

**Default Pengaturan:**
- `biaya_admin`: 3000
- `biaya_sistem`: 1000
- `biaya_petugas`: 2000

---

### 4. `pelanggan`
Tabel untuk menyimpan data pelanggan.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | SERIAL | Primary key |
| kode_pelanggan | VARCHAR(20) | Kode unik pelanggan (UNIQUE) |
| nama | VARCHAR(100) | Nama pelanggan |
| kategori | VARCHAR(20) | Kategori: 'personal' atau 'bisnis' |
| alamat | TEXT | Alamat lengkap |
| rt | VARCHAR(10) | RT (01-99) |
| rw | VARCHAR(10) | RW (01-99) |
| no_hp | VARCHAR(20) | Nomor HP |
| petugas_id | INTEGER | Foreign key ke users (petugas) |
| meteran_awal | INTEGER | Meteran awal (default: 0) |
| status | VARCHAR(20) | Status: 'aktif' atau 'nonaktif' |
| created_at | TIMESTAMP | Waktu dibuat |
| updated_at | TIMESTAMP | Waktu diupdate |

**Format Kode Pelanggan:** `YYYYMMDDXXXX` (contoh: 202503080001)

---

### 5. `pencatatan`
Tabel untuk menyimpan data pencatatan meteran bulanan.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | SERIAL | Primary key |
| pelanggan_id | INTEGER | Foreign key ke pelanggan |
| petugas_id | INTEGER | Foreign key ke users (petugas) |
| bulan | INTEGER | Bulan (1-12) |
| tahun | INTEGER | Tahun (2020-2100) |
| meteran_awal | INTEGER | Meteran periode sebelumnya |
| meteran_akhir | INTEGER | Meteran periode ini |
| pemakaian | INTEGER | Selisih meteran |
| foto_meteran | VARCHAR(255) | Path foto meteran |
| total_biaya_admin | INTEGER | Total biaya admin |
| jumlah_bulan_belum_dicatat | INTEGER | Jumlah bulan tertinggal |
| status_catat | VARCHAR(20) | Status: 'dicatat' atau 'belum' |
| tanggal_catat | DATE | Tanggal pencatatan |
| keterangan | TEXT | Keterangan tambahan |
| created_at | TIMESTAMP | Waktu dibuat |
| updated_at | TIMESTAMP | Waktu diupdate |

**Constraints:**
- `meteran_akhir >= meteran_awal`
- Unique: `pelanggan_id + bulan + tahun`

---

### 6. `audit_log`
Tabel untuk menyimpan log perubahan data (tracking).

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key ke users |
| aksi | VARCHAR(50) | Aksi: 'create', 'update', 'delete' |
| tabel | VARCHAR(50) | Nama tabel yang diubah |
| record_id | INTEGER | ID record yang diubah |
| data_lama | JSONB | Data sebelum perubahan |
| data_baru | JSONB | Data setelah perubahan |
| ip_address | INET | IP address user |
| created_at | TIMESTAMP | Waktu log dibuat |

**Tracking Tables:**
- `pelanggan` (create, update)
- Dapat ditambahkan untuk tabel lain

---

### 7. `pembayaran`
Tabel untuk menyimpan data pembayaran.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | SERIAL | Primary key |
| pencatatan_id | INTEGER | Foreign key ke pencatatan |
| pelanggan_id | INTEGER | Foreign key ke pelanggan |
| petugas_id | INTEGER | Foreign key ke users (petugas) |
| admin_id | INTEGER | Foreign key ke users (admin) |
| total_tagihan | INTEGER | Total tagihan |
| biaya_admin | INTEGER | Biaya admin (default: 3000) |
| biaya_sistem | INTEGER | Biaya sistem (default: 1000) |
| biaya_petugas | INTEGER | Biaya petugas (default: 2000) |
| biaya_air | INTEGER | Biaya air berdasarkan pemakaian |
| metode_bayar | VARCHAR(20) | Metode: 'tunai' atau 'transfer' |
| status_bayar | VARCHAR(20) | Status: 'lunas', 'pending', 'batal' |
| tanggal_bayar | DATE | Tanggal pembayaran |
| keterangan | TEXT | Keterangan tambahan |
| created_at | TIMESTAMP | Waktu dibuat |
| updated_at | TIMESTAMP | Waktu diupdate |

**Rumus Total Tagihan:**
```
total_tagihan = biaya_air + biaya_admin + biaya_sistem + biaya_petugas
```

---

## Views

### `v_pelanggan_list`
View untuk daftar pelanggan dengan nama petugas.

### `v_pencatatan_laporan`
View untuk laporan pencatatan dengan detail pelanggan dan petugas.

### `v_pembayaran_laporan`
View untuk laporan pembayaran lengkap.

---

## Indexes

Index yang dibuat untuk performa query:

- **users**: username, role, aktif
- **pelanggan**: kode_pelanggan, kategori, status, petugas_id, (rt, rw)
- **tarif**: kategori, aktif
- **pencatatan**: pelanggan_id, petugas_id, (bulan, tahun), tanggal_catat, status_catat
- **pembayaran**: pelanggan_id, petugas_id, admin_id, tanggal_bayar, status_bayar
- **audit_log**: user_id, aksi, tabel, created_at
- **pengaturan**: key

---

## Triggers

### `update_updated_at_column()`
Function yang otomatis mengupdate kolom `updated_at` saat row diubah.

Diterapkan pada tabel:
- users
- pelanggan
- pencatatan
- pembayaran
- tarif

---

## Cara Menggunakan Schema

### Create Database Baru

```bash
# Login ke PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pamsimas_db;

# Connect ke database
\c pamsimas_db

# Execute schema (from root directory)
\i database_schema.sql
```

### Atau menggunakan Python

```python
from app.database import engine
from sqlalchemy import text

# Baca file database_schema.sql dari current directory
schema_path = 'database_schema.sql'
with open(schema_path, 'r') as f:
    schema_sql = f.read()

# Execute
with engine.connect() as conn:
    conn.execute(text(schema_sql))
    conn.commit()
```

---

## Backup & Restore

### Backup

```bash
pg_dump -U postgres pamsimas_db > backup_pamsimas.sql
```

### Restore

```bash
psql -U postgres pamsimas_db < backup_pamsimas.sql
```

---

## Catatan Penting

1. **Password Hashing**: Password disimpan sebagai bcrypt hash, bukan plain text
2. **Kode Pelanggan**: Format `YYYYMMDDXXXX` dengan auto-increment
3. **Audit Log**: Di-handle di level aplikasi (CRUD), bukan database trigger
4. **Soft Delete**: Pelanggan tidak dihapus fisik, hanya status diubah ke 'nonaktif'
5. **Cascade Delete**: Pencatatan akan dihapus jika pelanggan dihapus

---

## Versi

- **Schema Version**: 1.0
- **Last Updated**: 2025-03-08
- **PostgreSQL Version**: 12+
