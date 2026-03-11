# 💧 PAMSIMAS - Sistem Manajemen Air Minum

Sistem manajemen PAMSIMAS lengkap dengan fitur pencatatan meteran, pembayaran, dan laporan.

## 🚀 Fitur Lengkap

### ✅ Role Petugas:
- **Login & Authentication** - JWT token-based auth
- **CRUD Pelanggan** - Tambah, Edit, Hapus, Cari pelanggan
- **Pencatatan Meteran**:
  - Cari pelanggan (nama / kode barcode)
  - Input meteran akhir
  - Upload foto meteran
  - Otomatis hitung meteran awal dari bulan sebelumnya
  - Otomatis hitung tagihan (tarif progresif)
  - Status draft (bisa diedit) atau dicatat (final)
- **Edit Pencatatan** - Edit sebelum pembayaran
- **Proses Pembayaran** - Proses langsung saat pencatatan atau nanti
- **Print Nota Thermal** - Generate dan print nota

### ✅ Role Admin:
- **Dashboard** - Statistik lengkap
- **Manajemen Pelanggan** - CRUD pelanggan + histori petugas
- **Laporan**:
  - Laporan bulanan (sudah/belum dicatat, sudah/belum bayar)
  - Laporan kroscek petugas dengan hitungan gaji
- **Kelola Tarif** - CRUD tarif (personal/bisnis)
- **Kelola Pengaturan** - Biaya admin, biaya petugas, dll
- **Manajemen User** - Tambah/edit/hapus petugas & admin

## 🛠️ Teknologi

- **Backend**: FastAPI (Python 3.11)
- **Frontend**: JavaScript (Vanilla) + CSS Modern
- **Database**: PostgreSQL 15
- **Container**: Docker & Docker Compose
- **Authentication**: JWT (JSON Web Token)

## 📦 Instalasi Cepat

### Prasyarat:
- Docker & Docker Compose terinstall
- Port 8000, 8080, 5432 tersedia

### Langkah Instalasi:

```bash
# 1. Masuk ke directory
cd pamsimas

# 2. Jalankan semua containers
docker-compose up -d

# 3. Cek status containers
docker-compose ps

# 4. Selesai! Buka browser
```

### Akses Aplikasi:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

## 🔑 Default Login

### Admin:
- **Username**: `admin`
- **Password**: `admin123`

### Petugas:
- **Username**: `sunarso`
- **Password**: `123456`

## 📖 Panduan Penggunaan

Panduan versi terbaru untuk operasional harian admin dan petugas ada di:
- [`README_PENGGUNAAN.md`](README_PENGGUNAAN.md)

### Untuk Petugas:

#### 1. Login
- Buka http://localhost:8080
- Masukkan username & password
- Klik tombol **Login**

#### 2. Catat Meteran Baru
- Menu **Pencatatan** → Klik **Catat Meteran**
- Cari pelanggan (masukkan nama atau kode, tekan Enter)
- Pilih pelanggan dari hasil pencarian
- Isi **Periode** (bulan/tahun)
- Isi **Meteran Akhir** (meteran awal otomatis dari bulan sebelumnya)
- Upload **Foto Meteran** (opsional)
- Pilih **Status**:
  - `Dicatat` = Final (tidak bisa diedit)
  - `Draft` = Masih bisa diedit
- Klik **Simpan**

#### 3. Proses Pembayaran
- Dari halaman **Pencatatan**, klik tombol **💰** pada pencatatan yang belum bayar
- Sistem akan menampilkan total tagihan
- Klik **OK** untuk memproses pembayaran
- Klik **🖨️ Nota** untuk print nota

#### 4. Print Nota
- Dari halaman **Pembayaran**, klik **🖨️ Nota**
- Nota akan ditampilkan dalam format thermal
- Klik **🖨️ Print** untuk print (atau tekan Ctrl+P)

### Untuk Admin:

#### 1. Tambah Petugas Baru
- Menu **Users** → Klik **Tambah User**
- Isi:
  - Username
  - Password
  - Nama Lengkap
  - Role: `petugas`
- Klik **Simpan**

#### 2. Tambah Pelanggan
- Menu **Pelanggan** → Klik **Tambah Pelanggan**
- Isi data pelanggan:
  - Nama (wajib)
  - Kategori (Personal/Bisnis)
  - Alamat
  - No HP
  - Petugas (opsional)
- Kode pelanggan otomatis generate (format: YYYYMMDDXXXX)
- Klik **Simpan**

#### 3. Lihat Laporan Kroscek
- Menu **Kroscek**
- Pilih **Bulan** dan **Tahun**
- Pilih **Hitung Gaji Berdasarkan**:
  - `Sudah Dicatat` = Hitung dari semua pelanggan yang sudah dicatat
  - `Sudah Lunas` = Hitung dari pelanggan yang sudah LUNAS
- Klik **Tampilkan**
- Lihat rekap per petugas dan total gaji
- Klik **Export** untuk print/save sebagai PDF

#### 4. Edit Tarif
- Menu **Tarif**
- Klik **✏️** pada tarif yang ingin diedit
- Ubah harga per m³ atau status aktif/nonaktif
- Klik **Update**

#### 5. Ubah Pengaturan
- Menu **Pengaturan**
- Ubah:
  - Nama Sistem
  - Biaya Admin
  - Biaya Sistem
  - Biaya Petugas
  - Metode hitung gaji petugas
- Klik **Simpan Pengaturan**

## 🗄️ Database Schema

### Tabel Utama:
- **users** - Petugas & Admin
- **pelanggan** - Data pelanggan
- **histori_petugas** - Track pergantian petugas pelanggan
- **tarif** - Konfigurasi tarif (disetel admin)
- **pengaturan** - Konfigurasi sistem
- **pencatatan** - Pencatatan meteran bulanan
- **pembayaran** - Riwayat pembayaran
- **audit_log** - Log aktivitas (opsional)

## 💰 Perhitungan Otomatis

### Tarif Personal (Default):
- 0-10 m³ = Rp 250/m³
- 11-20 m³ = Rp 500/m³
- 21-30 m³ = Rp 750/m³
- 31-999 m³ = Rp 1.000/m³

### Tarif Bisnis (Default):
- 0-10 m³ = Rp 500/m³
- 11-20 m³ = Rp 750/m³
- 21-30 m³ = Rp 1.000/m³

### Biaya Admin:
- **Rp 3.000/bulan**
- Breakdown:
  - Rp 1.000 → Sistem
  - Rp 2.000 → Petugas
- **Ditumpuk** jika belum dicatat beberapa bulan

### Contoh Perhitungan:

#### Pelanggan Personal, Pakai 15 m³:
```
Biaya Air:
- 10 m³ pertama × Rp 250 = Rp 2.500
- 5 m³ berikutnya × Rp 500 = Rp 2.500
Total Air = Rp 5.000

Biaya Admin = Rp 3.000
─────────────────────────────
Total Tagihan = Rp 8.000
```

#### Belum Dicatat 2 Bulan:
```
Biaya Air = Sesuai pemakaian
Biaya Admin = Rp 3.000 × 2 bulan = Rp 6.000
─────────────────────────────
Total Tagihan = Air + Rp 6.000
```

## 📁 Struktur Project

```
pamsimas/
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── api/                 # API Routes
│   │   │   ├── auth.py          # Login
│   │   │   ├── pelanggan.py     # CRUD pelanggan
│   │   │   ├── pencatatan.py    # Pencatatan meteran
│   │   │   ├── pembayaran.py    # Pembayaran & nota
│   │   │   └── admin.py         # Tarif, pengaturan, users
│   │   ├── core/                # Config & Security
│   │   │   ├── config.py        # Settings
│   │   │   ├── security.py      # JWT, password hash
│   │   │   └── deps.py          # Auth dependencies
│   │   ├── crud/                # Database Operations
│   │   │   ├── user.py
│   │   │   ├── pelanggan.py
│   │   │   ├── pencatatan.py
│   │   │   ├── pembayaran.py
│   │   │   └── tarif.py
│   │   ├── models/              # SQLAlchemy Models
│   │   │   ├── user.py
│   │   │   ├── pelanggan.py
│   │   │   ├── pencatatan.py
│   │   │   ├── pembayaran.py
│   │   │   └── ...
│   │   ├── schemas/             # Pydantic Schemas
│   │   ├── utils/               # Helper Functions
│   │   │   ├── perhitungan.py   # Hitung tarif
│   │   │   ├── barcode.py       # Generate kode pelanggan
│   │   │   └── printer.py       # Generate nota thermal
│   │   ├── database.py          # DB connection
│   │   └── main.py              # FastAPI app
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/                     # JavaScript Frontend
│   ├── index.html               # Login page
│   ├── dashboard.html           # Main dashboard
│   ├── css/
│   │   ├── style.css            # Main styles
│   │   ├── login.css            # Login styles
│   │   └── dashboard.css        # Dashboard layout
│   └── js/
│       ├── config.js            # API config
│       ├── api.js               # API helper functions
│       ├── auth.js              # Authentication
│       ├── main.js              # Utility functions
│       ├── dashboard.js         # Dashboard logic
│       ├── pelanggan.js         # Pelanggan CRUD
│       ├── pencatatan.js        # Pencatatan meteran
│       ├── pembayaran.js        # Pembayaran & nota
│       ├── laporan.js           # Laporan & kroscek
│       └── admin.js             # Tarif, pengaturan, users
├── database_schema.sql           # Database schema
├── docker-compose.yml            # Docker setup
└── README.md
```

## 🧪 Testing API

### 1. Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### 2. Tambah Petugas:
```bash
# Login dulu untuk dapat token
TOKEN="YOUR_TOKEN_FROM_LOGIN"

curl -X POST http://localhost:8000/api/admin/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "petugas1",
    "password": "pass123",
    "nama_lengkap": "Budi Santoso",
    "role": "petugas"
  }'
```

### 3. Tambah Pelanggan (Auto Kode):
```bash
curl -X POST http://localhost:8000/api/pelanggan/auto \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nama": "Ahmad Subeki",
    "kategori": "personal",
    "alamat": "Jl. Merdeka No. 1",
    "no_hp": "08123456789"
  }'
```

### 4. Catat Meteran:
```bash
curl -X POST http://localhost:8000/api/pencatatan/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pelanggan_id": 1,
    "bulan": 3,
    "tahun": 2026,
    "meteran_akhir": 50,
    "status_catat": "dicatat"
  }'
```

## 🐛 Troubleshooting

### Container tidak mau start:
```bash
# Cek logs
docker-compose logs backend
docker-compose logs db

# Rebuild
docker-compose down
docker-compose up -d --build
```

### Database connection error:
- Pastikan container db sudah running
- Tunggu beberapa detik untuk database startup
- Cek dengan `docker-compose ps`

### Frontend tidak bisa connect ke backend:
- Pastikan backend container running
- Cek API base URL di `frontend/js/config.js`
- Default: `http://localhost:8000/api`

### Reset Database:
```bash
# Hapus semua containers & volumes
docker-compose down -v

# Start ulang
docker-compose up -d
```

## 📝 Fitur Tambahan yang Tersedia

### ✅ Sudah Implementasi:
- [x] Authentication (JWT)
- [x] CRUD Pelanggan
- [x] Pencatatan Meteran dengan auto meteran awal
- [x] Upload foto meteran
- [x] Perhitungan tarif progresif otomatis
- [x] Biaya admin ditumpuk untuk bulan belum dicatat
- [x] Proses pembayaran
- [x] Generate nota thermal
- [x] Laporan bulanan
- [x] Laporan kroscek petugas
- [x] Kelola tarif (admin)
- [x] Kelola pengaturan (admin)
- [x] Manajemen user (admin)
- [x] Histori pergantian petugas

## 🔒 Security

- Password hashing dengan bcrypt
- JWT token untuk authentication
- Role-based access control (Admin/Petugas)
- Petugas hanya bisa akses pelanggan mereka sendiri
- Input validation di backend & frontend

## 📄 License

MIT License

---

## 🎉 Terima Kasih!

Sistem PAMSIMAS ini dibuat dengan ❤️ untuk membantu pengelolaan air minum di Indonesia.

**Dibuat oleh:** Claude AI
**Tanggal:** Maret 2026
**Versi:** 1.0.0

---

**Butuh bantuan?** Cek dokumentasi API di http://localhost:8000/docs atau hubungi developer.
