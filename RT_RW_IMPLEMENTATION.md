# Implementasi Fitur RT/RW pada Pelanggan

## Ringkasan

Fitur RT (Rukun Tetangga) dan RW (Rukun Warga) ditambahkan ke tabel pelanggan untuk memudahkan filtering berdasarkan wilayah di menu:
- Pelanggan
- Pencatatan
- Pembayaran

## Perubahan Database

### Tabel Pelanggan
```sql
ALTER TABLE pelanggan ADD COLUMN rt VARCHAR(10);
ALTER TABLE pelanggan ADD COLUMN rw VARCHAR(10);
```

Kolom ini bersifat opsional (nullable) dan dapat berisi nilai seperti "001", "002", dll.

## Perubahan Backend

### 1. Models (`backend/app/models/pelanggan.py`)
```python
rt = Column(String(10))  # Rukun Tetangga
rw = Column(String(10))  # Rukun Warga
```

### 2. Schemas (`backend/app/schemas/pelanggan.py`)
```python
class PelangganBase(BaseModel):
    ...
    rt: Optional[str] = None
    rw: Optional[str] = None
    ...

class PelangganUpdate(BaseModel):
    ...
    rt: Optional[str] = None
    rw: Optional[str] = None
    ...
```

### 3. CRUD Pelanggan (`backend/app/crud/pelanggan.py`)
```python
def search_pelanggan(
    ...,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    ...
):
    """Search pelanggan dengan filter RT/RW."""
    if rt:
        query = query.filter(Pelanggan.rt == rt)
    if rw:
        query = query.filter(Pelanggan.rw == rw)
```

### 4. CRUD Pencatatan (`backend/app/crud/pencatatan.py`)
```python
def get_pencatatan_list(
    ...,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    ...
):
    """Get list pencatatan dengan filter RT/RW dari pelanggan."""
    query = db.query(Pencatatan).join(Pelanggan)
    if rt:
        query = query.filter(Pelanggan.rt == rt)
    if rw:
        query = query.filter(Pelanggan.rw == rw)
```

### 5. CRUD Pembayaran (`backend/app/crud/pembayaran.py`)
```python
def get_pembayaran_list(
    ...,
    rt: Optional[str] = None,
    rw: Optional[str] = None,
    ...
):
    """Get list pembayaran dengan filter RT/RW dari pelanggan."""
    query = db.query(Pembayaran).join(Pencatatan).join(Pelanggan)
    if rt:
        query = query.filter(Pelanggan.rt == rt)
    if rw:
        query = query.filter(Pelanggan.rw == rw)
```

## Perubahan Frontend

### 1. Pelanggan Page (`frontend/js/pelanggan.js`)

#### Table Column
Menambahkan kolom RT/RW di tabel pelanggan:
```javascript
const rtRw = [p.rt, p.rw].filter(Boolean).join('/');
<td>${rtRw || '-'}</td>
```

#### Filter Dropdowns
```html
<select id="filterRt" class="form-control">
    <option value="">Semua RT</option>
</select>
<select id="filterRw" class="form-control">
    <option value="">Semua RW</option>
</select>
```

#### Add/Edit Forms
```html
<div style="display: flex; gap: 1rem;">
    <div class="form-group" style="flex: 1;">
        <label>RT</label>
        <input type="text" name="rt" class="form-control" placeholder="001">
    </div>
    <div class="form-group" style="flex: 1;">
        <label>RW</label>
        <input type="text" name="rw" class="form-control" placeholder="001">
    </div>
</div>
```

### 2. Pencatatan Page (`frontend/js/pencatatan.js`)

#### Filter Dropdowns
```html
<select id="filterRt" class="form-control">
    <option value="">Semua RT</option>
</select>
<select id="filterRw" class="form-control">
    <option value="">Semua RW</option>
</select>
```

### 3. Pembayaran Page (`frontend/js/pembayaran.js`)

#### Filter Dropdowns
```html
<select id="filterRt" class="form-control">
    <option value="">Semua RT</option>
</select>
<select id="filterRw" class="form-control">
    <option value="">Semua RW</option>
</select>
```

## Cara Penggunaan

### 1. Menambahkan Pelanggan dengan RT/RW
1. Buka menu Pelanggan
2. Klik "Tambah Pelanggan"
3. Isi field RT (misal: "001")
4. Isi field RW (misal: "002")
5. Simpan

### 2. Filter Pelanggan berdasarkan RT/RW
1. Buka menu Pelanggan
2. Pilih RT dari dropdown (atau kosongkan untuk semua RT)
3. Pilih RW dari dropdown (atau kosongkan untuk semua RW)
4. Klik "Filter"

### 3. Filter Pencatatan berdasarkan RT/RW
1. Buka menu Pencatatan
2. Pilih RT dan RW yang diinginkan
3. Klik "Filter"
4. Sistem akan menampilkan pencatatan pelanggan di RT/RW tersebut

### 4. Filter Pembayaran berdasarkan RT/RW
1. Buka menu Pembayaran
2. Pilih RT dan RW yang diinginkan
3. Klik "Filter"
4. Sistem akan menampilkan pembayaran pelanggan di RT/RW tersebut

## Dynamic Population

RT/RW dropdown options diisi secara otomatis berdasarkan data yang ada:

- Di menu Pelanggan: Diisi dari semua pelanggan yang ada
- Di menu Pencatatan: Diisi dari pelanggan yang punya pencatatan
- Di menu Pembayaran: Diisi dari pelanggan yang punya pembayaran

Ini memastikan bahwa hanya RT/RW yang relevan yang muncul di filter.

## Testing Checklist

- [ ] Tambah pelanggan dengan RT/RW
- [ ] Edit pelanggan untuk mengubah RT/RW
- [ ] Filter pelanggan berdasarkan RT
- [ ] Filter pelanggan berdasarkan RW
- [ ] Filter pelanggan berdasarkan RT & RW kombinasi
- [ ] Filter pencatatan berdasarkan RT/RW
- [ ] Filter pembayaran berdasarkan RT/RW
- [ ] Tampilkan RT/RW di tabel pelanggan

## Migration Script

File: `migrations/add_rt_rw_to_pelanggan.sql`

Untuk database yang sudah ada, jalankan:
```sql
ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS rt VARCHAR(10);
ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS rw VARCHAR(10);
```

## Notes

- RT/RW bersifat opsional (nullable)
- Format bebas, bisa "001", "1", "A", dll - sesuaikan dengan kebutuhan wilayah
- Filter bersifat AND (kedua-duanya harus match jika keduanya dipilih)
- Dropdown options diisi otomatis dari data yang ada
