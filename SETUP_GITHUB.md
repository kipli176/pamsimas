# 🚀 PANDUAN SETUP GITHUB REPOSITORY

## Langkah 1: Inisialisasi Git Repository

```bash
# Masuk ke folder project
cd C:\Users\Admin\Documents\claude\pamsimas

# Inisialisasi git
git init
```

---

## Langkah 2: Setup .gitignore

File `.gitignore` sudah dibuat. Pastikan isinya lengkap:

```bash
# Cek file .gitignore
cat .gitignore
```

**Pastikan .gitignore berisi:**
- `__pycache__/`
- `*.pyc`
- `.env`
- `backend/uploads/foto_meteran/*`
- `*.log`
- `*.db`
- `*.sqlite`
- `test_*.sh`
- `audit_*.sh`

---

## Langkah 3: Setup Environment Template

```bash
# Copy .env ke .env.example (untuk template)
cp backend/.env backend/.env.example

# Edit .env.example dan ganti nilai sensitif dengan placeholder
notepad backend/.env.example
```

**Contoh .env.example:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pamsimas

# JWT Secret (generate dengan: python -c "import secrets; print(secrets.token_urlsafe(32))")
SECRET_KEY=your-secret-key-here-min-32-characters

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# CORS
FRONTEND_URL=http://localhost:8080
```

---

## Langkah 4: Setup Folder Uploads

```bash
# Buat file .gitkeep agar folder tetap ada di repository
mkdir -p backend/uploads/foto_meteran
touch backend/uploads/.gitkeep
touch backend/uploads/foto_meteran/.gitkeep
```

---

## Langkah 5: Rename Test Scripts (Opsional)

Jika ingin menyimpan test scripts sebagai contoh:

```bash
# Rename test scripts
mv audit_detail.sh audit_detail.sh.example
mv audit_sistem.sh audit_sistem.sh.example
mv test_all_features.sh test_all_features.sh.example
mv test_features_v2.sh test_features_v2.sh.example
```

---

## Langkah 6: Add Semua File ke Git

```bash
# Add semua file
git add .

# Cek status sebelum commit
git status
```

**Pastikan file-file ini TIDAK ter-track:**
- ❌ backend/.env
- ❌ backend/uploads/foto_meteran/2026/03/*.jpg
- ❌ backend/app/__pycache__/
- ❌ test_*.sh (kecuali yang sudah di-rename)

**Pastikan file-file ini TER-track:**
- ✅ backend/app/**/*.py
- ✅ frontend/**/*.*
- ✅ *.md
- ✅ docker-compose.yml
- ✅ database_schema.sql
- ✅ migrations/*.sql

---

## Langkah 7: Commit Pertama

```bash
# Commit pertama
git commit -m "Initial commit: PAMSIMAS Water Management System

Features:
- Customer management
- Meter recording
- Payment processing
- Thermal printing
- Monthly reports
- Admin & Petugas roles

Tech Stack:
- Backend: FastAPI (Python)
- Frontend: Vanilla JavaScript
- Database: PostgreSQL
- Container: Docker"
```

---

## Langkah 8: Buat Repository di GitHub

1. **Buka GitHub**
   - Go to: https://github.com/new

2. **Create New Repository**
   - Repository name: `pamsimas`
   - Description: `Sistem Manajemen Air Minum PAMDesa Candinegara`
   - Visibility: Private (recommended) atau Public
   - ❌ Jangan centang "Add a README file"
   - ❌ Jangan centang "Add .gitignore"
   - ❌ Jangan centang "Choose a license"

3. **Click "Create repository"**

4. **Copy repository URL**
   ```
   https://github.com/USERNAME/pamsimas.git
   ```

---

## Langkah 9: Push ke GitHub

```bash
# Tambah remote origin
git remote add origin https://github.com/USERNAME/pamsimas.git

# Ganti USERNAME dengan username GitHub Anda
# Contoh:
# git remote add origin https://github.com/budi/pamsimas.git

# Push ke GitHub (branch main)
git branch -M main
git push -u origin main
```

**Jika diminta username & password:**
- **Username:** Username GitHub Anda
- **Password:** Personal Access Token (PAT)

### Cara Membuat Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Note: "PAMSIMAS Development"
4. Expiration: "90 days" atau pilih sesuai
5. Scopes: Centang "repo" (full control)
6. Click "Generate token"
7. **Copy token** (simpan di tempat aman!)
8. Paste sebagai password saat push

---

## Langkah 10: Setup Branch Protection (Opsional tapi Recommended)

### Protect Main Branch:

1. **Buka repository di GitHub**
2. Click **Settings** → **Branches**
3. Click **Add rule**
4. Branch name pattern: `main`
5. Centang:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Dismiss stale reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
6. Click **Create**

---

## Langkah 11: Setup README Badge (Opsional)

Tambahkan badge di README.md untuk status build:

```markdown
# 💧 PAMSIMAS - Sistem Manajemen Air Minum

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)](https://fastapi.tiangolo.com)

...
```

---

## 🎯 CHECKLIST FINAL

Sebelum push ke GitHub, pastikan:

- [ ] `.gitignore` sudah dibuat dan lengkap
- [ ] `backend/.env` TIDAK ter-track di git
- [ ] `backend/.env.example` sudah dibuat dan ter-track
- [ ] Foto meteran TIDAK ter-track
- [ ] `__pycache__` TIDAK ter-track
- [ ] Test scripts TIDAK ter-track (atau sudah di-rename)
- [ ] Folder uploads punya `.gitkeep`
- [ ] `README.md` lengkap
- [ ] Commit message jelas
- [ ] Personal Access Token sudah dibuat

---

## 📝 COMMANDS SUMMARY

```bash
# 1. Inisialisasi
git init

# 2. Add files
git add .

# 3. Cek status
git status

# 4. Commit
git commit -m "Initial commit: PAMSIMAS Water Management System"

# 5. Add remote
git remote add origin https://github.com/USERNAME/pamsimas.git

# 6. Push
git branch -M main
git push -u origin main
```

---

## 🔧 TROUBLESHOOTING

### Error: "failed to push some refs"
**Solusi:**
```bash
# Pull dulu
git pull origin main --allow-unrelated-histories

# Lalu push lagi
git push -u origin main
```

### Error: "src refspec main does not match any"
**Solusi:**
```bash
# Cek branch yang ada
git branch

# Rename ke main
git branch -M master main
```

### Error: "Authentication failed"
**Solusi:**
- Gunakan Personal Access Token, bukan password GitHub
- Pastikan token punya scope "repo"

---

**Selamat! Repository PAMSIMAS Anda sudah siap di GitHub! 🎉**

---

*Last Updated: 12 Maret 2026*
