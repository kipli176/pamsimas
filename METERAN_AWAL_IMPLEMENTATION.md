# Implementasi Fitur Meteran Awal

## Ringkasan

Fitur `meteran_awal` ditambahkan ke tabel `pelanggan` untuk menyimpan nilai meteran awal pelanggan. Nilai ini digunakan sebagai dasar pencatatan meteran bulan berikutnya.

## Perubahan Database

### Tabel Pelanggan
```sql
ALTER TABLE pelanggan ADD COLUMN meteran_awal INTEGER DEFAULT 0;
```

Kolom ini menyimpan:
- **Nilai default**: 0 untuk pelanggan baru
- **Nilai terupdate**: Otomatis diupdate dengan `meteran_akhir` setelah pembayaran lunas

## Logika Bisnis

### 1. Saat Membuat Pelanggan Baru
- Admin/Petugas dapat menginput `meteran_awal` saat membuat pelanggan baru
- Default value: 0
- Digunakan sebagai meteran awal untuk pencatatan pertama

### 2. Saat Membuat Pencatatan
Sistem menggunakan prioritas berikut untuk menentukan `meteran_awal`:
```
1. Jika pelanggan baru (belum ada pencatatan sama sekali):
   → Gunakan pelanggan.meteran_awal

2. Jika sudah ada pencatatan:
   → Gunakan meteran_akhir dari bulan sebelumnya

3. Jika tidak ada bulan sebelumnya tapi ada pencatatan lain:
   → Gunakan meteran_akhir terakhir yang ada
```

### 3. Setelah Pembayaran Lunas
Setelah pembayaran berhasil diproses:
```python
pelanggan.meteran_awal = pencatatan.meteran_akhir
```

Ini menjamin bahwa untuk bulan berikutnya, meteran awal sudah terupdate dengan nilai terakhir.

## Perubahan Backend

### 1. Models (`backend/app/models/pelanggan.py`)
```python
meteran_awal = Column(Integer, default=0)  # Meteran awal pelanggan
```

### 2. Schemas (`backend/app/schemas/pelanggan.py`)
```python
class PelangganCreate(PelangganBase):
    petugas_id: Optional[int] = None
    meteran_awal: Optional[int] = 0  # NEW

class PelangganUpdate(BaseModel):
    ...
    meteran_awal: Optional[int] = None  # NEW

class PelangganResponse(PelangganBase):
    ...
    meteran_awal: int  # NEW
```

### 3. CRUD Pelanggan (`backend/app/crud/pelanggan.py`)
```python
def create_pelanggan(
    ...,
    meteran_awal: Optional[int] = 0  # NEW
):
    db_pelanggan = Pelanggan(
        ...,
        meteran_awal=meteran_awal  # NEW
    )

def update_pelanggan(
    ...,
    meteran_awal: Optional[int] = None  # NEW
):
    if meteran_awal is not None:
        db_pelanggan.meteran_awal = meteran_awal  # NEW
```

### 4. CRUD Pencatatan (`backend/app/crud/pencatatan.py`)
```python
def get_meteran_awal(db, pelanggan_id, bulan, tahun) -> int:
    """
    Prioritas:
    1. Pelanggan baru → gunakan pelanggan.meteran_awal
    2. Sudah ada pencatatan → gunakan meteran_akhir bulan sebelumnya
    3. Ada pencatatan tapi tidak bulan sebelumnya → gunakan meteran_akhir terakhir
    """
```

### 5. CRUD Pembayaran (`backend/app/crud/pembayaran.py`)
```python
def create_pembayaran(...):
    # Setelah pembayaran berhasil
    pelanggan.meteran_awal = pencatatan.meteran_akhir  # NEW
    db.commit()
```

## Perubahan Frontend

### 1. Pelanggan Table (`frontend/js/pelanggan.js`)
- Tambah kolom "Meteran Awal" di tabel
- Tampilkan nilai meteran_awal dalam format "X m³"

### 2. Add Pelanggan Form
```html
<div class="form-group">
    <label>Meteran Awal (m³)</label>
    <input type="number" name="meteran_awal" class="form-control" value="0" min="0">
    <small class="text-muted">Meteran awal untuk pencatatan pertama</small>
</div>
```

### 3. Edit Pelanggan Form
```html
<div class="form-group">
    <label>Meteran Awal (m³)</label>
    <input type="number" name="meteran_awal" class="form-control" value="${pelanggan.meteran_awal || 0}" min="0">
    <small class="text-muted">Meteran awal akan otomatis terupdate setelah pembayaran lunas</small>
</div>
```

### 4. Pencatatan Modal (`frontend/js/pencatatan.js`)
- Tampilkan informasi meteran awal yang akan digunakan
- Hint text menunjukkan sumber meteran awal (dari data pelanggan atau bulan sebelumnya)

## Migration Script

File: `migrations/add_meteran_awal_to_pelanggan.sql`

```sql
-- Add meteran_awal column to pelanggan table
ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS meteran_awal INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN pelanggan.meteran_awal IS 'Meteran awal pelanggan (untuk pencatatan berikutnya)';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pelanggan'
  AND column_name = 'meteran_awal';
```

## Contoh Flow

### Scenario 1: Pelanggan Baru
1. Admin buat pelanggan baru dengan `meteran_awal = 100`
2. Petugas catat meteran bulan Januari:
   - Sistem gunakan `meteran_awal = 100` (dari pelanggan)
   - Input `meteran_akhir = 150`
   - Pemakaian = 50 m³
3. Pembayaran lunas → `pelanggan.meteran_awal` diupdate menjadi 150
4. Februari: Petugas catat meteran:
   - Sistem gunakan `meteran_awal = 150` (dari bulan Januari)
   - dst.

### Scenario 2: Pelanggan Existing
1. Pelanggan sudah punya 5 pencatatan
2. Bulan Juni, petugas catat meteran:
   - Sistem cari pencatatan Mei
   - Gunakan `meteran_akhir` dari Mei sebagai `meteran_awal`
3. Pembayaran lunas → `pelanggan.meteran_awal` diupdate dengan nilai terbaru

## Testing Checklist

- [ ] Create pelanggan baru dengan meteran_awal custom
- [ ] Create pelanggan baru tanpa meteran_awal (default 0)
- [ ] Pencatatan pertama gunakan meteran_awal dari pelanggan
- [ ] Pencatatan bulan berikutnya gunakan meteran_akhir bulan sebelumnya
- [ ] Update meteran_awal pelanggan (manual override)
- [ ] Pembayaran lunas trigger auto-update meteran_awal
- [ ] Tampilkan meteran_awal di pelanggan table
- [ ] Tampilkan meteran_awal di pencatatan modal

## Notes

- `meteran_awal` di tabel pelanggan bersifat informatif dan sebagai fallback
- Sistem tetap mengutamakan `meteran_akhir` dari bulan sebelumnya untuk pelanggan existing
- Auto-update setelah pembayaran menjamin data selalu sinkron
- Admin bisa manual override jika diperlukan (misal: koreksi meteran rusak)
