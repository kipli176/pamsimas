# 💧 PAMSIMAS - Sistem Manajemen Air Minum

![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

Sistem manajemen air minum lengkap dengan fitur pencatatan meteran, pembayaran, dan laporan untuk PDAM/PAMDesa.

## 🌟 Fitur Utama

### ✅ Role Petugas
- **Login & Authentication** - JWT token-based auth
- **CRUD Pelanggan** - Kelola data pelanggan lengkap
- **Pencatatan Meteran**:
  - Pencatatan meteran bulanan
  - Auto-meteran awal dari bulan sebelumnya
  - Upload foto meteran
  - Auto-hitung tagihan (tarif progresif)
  - Status draft & final
- **Proses Pembayaran** - Pembayaran langsung atau nanti
- **Print Nota Thermal** - Generate dan print nota otomatis

### ✅ Role Admin
- **Dashboard** - Statistik lengkap sistem
- **Manajemen Pelanggan** - CRUD + histori petugas
- **Laporan**:
  - Laporan bulanan (sudah/belum dicatat & bayar)
  - Laporan kroscek petugas dengan hitungan gaji
- **Kelola Tarif** - CRUD tarif (personal/bisnis)
- **Kelola Pengaturan** - Biaya admin, sistem, petugas
- **Manajemen User** - Tambah/edit/hapus petugas & admin

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | FastAPI (Python 3.11) |
| **Frontend** | Vanilla JavaScript + CSS Modern |
| **Database** | PostgreSQL 15 |
| **Container** | Docker & Docker Compose |
| **Authentication** | JWT (JSON Web Token) |
| **API Documentation** | Swagger UI / ReDoc |

## 📦 Quick Start

### Prerequisites
- Docker & Docker Compose terinstall
- Port 8000, 8080, 5432 tersedia

### Installation

```bash
# 1. Clone repository
git clone https://github.com/kipli176/pamsimas.git
cd pamsimas

# 2. Jalankan dengan Docker
docker-compose up -d

# 3. Selesai! Buka browser
```

### Access Points

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

## 🔑 Default Login

### Admin
- **Username**: `admin`
- **Password**: `admin123`

### Petugas
- **Username**: `sunarso` / `arifcandi`
- **Password**: `123456`

## 📖 Documentation

- **[Panduan Pengguna](PANDUAN_PENGGUNAAN.md)** - Panduan lengkap untuk Admin & Petugas
- **[API Documentation](http://localhost:8000/docs)** - Swagger UI (klik di docs/ → FastAPI)

## 🗄️ Database Schema

**Tabel Utama:**
- `users` - Petugas & Admin
- `pelanggan` - Data pelanggan
- `tarif` - Konfigurasi tarif
- `pengaturan` - Settings sistem
- `pencatatan` - Pencatatan meteran
- `pembayaran` - Riwayat pembayaran
- `audit_log` - Log aktivitas

**Schema lengkap:** Lihat [database_schema.sql](database_schema.sql)

## 💰 Perhitungan Otomatis

### Tarif Personal (Default)
| Range (m³) | Harga per m³ |
|------------|-------------|
| 0 - 10 | Rp 250 |
| 11 - 20 | Rp 500 |
| 21 - 30 | Rp 750 |
| 31 - 999 | Rp 1.000 |

### Tarif Bisnis (Default)
| Range (m³) | Harga per m³ |
|------------|-------------|
| 0 - 10 | Rp 500 |
| 11 - 20 | Rp 750 |
| 21 - 999 | Rp 1.000 |

### Biaya Admin
- **Rp 3.000/bulan**
  - Rp 1.000 → Sistem
  - Rp 2.000 → Petugas
- **Ditumpuk** jika belum dicatat beberapa bulan

## 📁 Project Structure

```
pamsimas/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── api/            # API Routes
│   │   ├── core/           # Config & Security
│   │   ├── crud/           # Database Operations
│   │   ├── models/         # SQLAlchemy Models
│   │   ├── schemas/        # Pydantic Schemas
│   │   └── utils/          # Helper Functions
│   ├── schema.sql          # Database Schema (copy dari root)
│   ├── uploads/            # Upload directory (foto meteran)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # JavaScript Frontend
│   ├── assets/            # Icons & images
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   ├── index.html         # Login page
│   ├── dashboard.html     # Main dashboard
│   ├── manifest.webmanifest
│   └── service-worker.js  # PWA support
├── database_schema.sql    # Complete Schema (with triggers & views)
├── docker-compose.yml     # Docker Setup
├── nginx.conf             # Nginx configuration
├── PANDUAN_PENGGUNAAN.md  # User Guide
└── README.md              # This file
```

## 🔒 Security

- ✅ Password hashing dengan bcrypt
- ✅ JWT token untuk authentication
- ✅ Role-based access control (Admin/Petugas)
- ✅ Input validation di backend & frontend
- ✅ SQL Injection prevention dengan SQLAlchemy
- ✅ CORS configuration

## 🧪 Testing

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Tambah Pelanggan
curl -X POST http://localhost:8000/api/pelanggan/auto \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nama": "Ahmad", "kategori": "personal", "alamat": "Jl. Test"}'

# Catat Meteran
curl -X POST http://localhost:8000/api/pencatatan/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pelanggan_id": 1, "bulan": 3, "tahun": 2026, "meteran_akhir": 50}'
```

## 🐛 Troubleshooting

### Container tidak mau start
```bash
# Cek logs
docker-compose logs backend
docker-compose logs db

# Rebuild
docker-compose down
docker-compose up -d --build
```

### Reset Database
```bash
# Hapus containers & volumes
docker-compose down -v

# Start ulang
docker-compose up -d
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 👥 Authors

- **Kipli176** - Initial development

## 🎉 Acknowledgments

- Built with ❤️ for PAMDesa Candinegara
- Inspired by real-world water management needs

---

**Support:** For issues and questions, please open an issue on GitHub.

**Made with ❤️ in Indonesia**
