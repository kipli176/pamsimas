# Thermal Printing Implementation - PAMSIMAS

## Overview
Sistem sekarang mendukung printing struk pembayaran ke thermal printer dengan ukuran 58mm atau 80mm menggunakan ESC/POS commands.

## Backend Implementation

### File: `backend/app/api/print.py`
Endpoint baru untuk thermal printing:

**POST `/api/print/thermal`**
- Menerima ESC/POS commands dari frontend
- Mendukung berbagai metode printing:
  - `network` - Printer via jaringan (IP:PORT)
  - `usb` - USB printer (Linux)
  - `windows` - Windows printer
  - `rawbt` - Rawbt app Android (default)
- Mengembalikan commands yang sudah di-encode untuk rawbt

**GET `/api/print/thermal/qr/{encoded_commands}`**
- Generate QR code untuk rawbt app deep link
- Format: `rawbt://print?data=<base64_encoded_commands>`

**POST `/api/print/thermal/test`**
- Test print untuk memastikan koneksi printer berjalan

**GET `/api/print/health`**
- Cek status print service
- Menampilkan metode printing yang tersedia berdasarkan OS

### File: `backend/app/main.py`
Updated untuk include print router:
```python
app.include_router(print.router, prefix="/api/print", tags=["Print"])
```

## Frontend Implementation

### File: `frontend/js/api.js`
Added `print` section to API object:
```javascript
print: {
    thermal: (commands, ukuran = 58, method = 'rawbt') => {...},
    test: () => {...},
    health: () => {...},
    getQrCode: (encodedCommands) => {...}
}
```

### File: `frontend/js/pencatatan.js`
Updated functions:

**`printStrukThermal(pembayaranId, ukuran = 58)`**
- Generate ESC/POS commands
- Kirim ke backend API
- Handle response dan tampilkan rawbt options

**`generateThermalPrintCommands({ ukuran, pelanggan, pencatatan, pembayaran, tanggalBayar })`**
- Generate ESC/POS commands untuk thermal printer
- Support 58mm dan 80mm paper width
- Include:
  - Header (PDAM TIRTA MAKMUR)
  - Info pelanggan (kode, nama, alamat)
  - Info pencatatan (periode, meteran, pemakaian)
  - Rincian pembayaran (biaya air, admin, sistem, petugas)
  - Total bayar
  - Metode dan tanggal bayar
  - Footer (TERIMA KASIH)
  - Paper cut command

**`showRawbtPrintOption(encodedCommands)`**
- Menampilkan 3 opsi printing:
  1. **Direct Link** - Buka rawbt app langsung
  2. **QR Code** - Scan dengan rawbt app
  3. **Copy URL** - Copy rawbt URL untuk manual sharing

**`copyRawbtUrl()`**
- Helper untuk copy rawbt URL ke clipboard

## Usage Flow

### 1. User melakukan pembayaran
- User klik "Bayar" pada pencatatan yang sudah dicatat
- Modal pembayaran muncul dengan rincian perhitungan
- User klik tombol "Bayar & Print"

### 2. Pilih ukuran kertas
- Modal pilihan ukuran muncul: 58mm atau 80mm
- User klik salah satu tombol

### 3. Print options muncul
**Jika backend API tersedia:**
- Modal dengan 3 opsi rawbt app ditampilkan
- User bisa:
  - Klik "Buka Rawbt App" untuk direct print
  - Scan QR code dengan rawbt app
  - Copy URL dan share manual

**Jika backend API tidak tersedia:**
- Fallback ke modal dengan ESC/POS commands
- User bisa copy commands untuk manual printing

## ESC/POS Commands Reference

Commands yang digunakan:
- `\x1B@` - Initialize printer
- `\x1Ba\x01` - Center align
- `\x1Ba\x00` - Left align
- `\x1B!\x01` - Bold on
- `\x1B!\x00` - Bold off
- `\x1D\x56\x00` - Cut paper

## Rawbt App Integration

### Instalasi Rawbt
1. Download rawbt app dari Google Play Store
2. Install di Android device
3. Connect ke thermal printer (USB/Bluetooth)

### Cara Menggunakan
**Option 1: Direct Link**
- Klik tombol "🖨️ Buka Rawbt App"
- Rawbt app akan otomatis terbuka
- Print akan langsung dikirim

**Option 2: QR Code**
- Scan QR code dengan rawbt app
- Print data akan terkirim ke printer

**Option 3: Manual URL**
- Copy rawbt URL
- Share via WhatsApp/Email/etc.
- Buka link dengan device yang memiliki rawbt app

## Testing

### Test Print dari Backend
```bash
curl -X POST http://localhost:8000/api/print/thermal/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Check Print Service Health
```bash
curl http://localhost:8000/api/print/health
```

Response example:
```json
{
  "status": "online",
  "system": "Windows",
  "available_methods": ["rawbt", "windows", "network"],
  "default_method": "rawbt"
}
```

## Troubleshooting

### Printer tidak merespon
1. Check koneksi printer (USB/Bluetooth/Network)
2. Test dengan `/api/print/thermal/test`
3. Cek health status di `/api/print/health`

### Rawbt app tidak terbuka
1. Pastikan rawbt app sudah terinstall
2. Pastikan device mendukung deep links
3. Coba gunakan QR code sebagai alternatif

### Commands tidak terkirim
1. Check browser console untuk error
2. Verify backend API running di `localhost:8000`
3. Check token authorization valid

## Future Enhancements

Possible improvements:
- Support untuk lebih banyak printer types
- Print queue system untuk batch printing
- Print history/tracking
- Customizable struk template
- Support untuk gambar/logo pada struk
- Auto-print setelah pembayaran sukses

## Dependencies

### Backend
- FastAPI
- Pydantic
- Python standard library (socket, base64, subprocess, platform)

### Frontend
- JsBarcode (untuk barcode generation)
- Modern browser dengan ESC/POS support
- Rawbt app (untuk mobile printing)

## Notes

- ESC/POS commands adalah standard untuk thermal printing
- Rawbt app adalah solusi gratis untuk Android thermal printing
- System supports fallback jika API tidak tersedia
- All print commands di-log di console untuk debugging
