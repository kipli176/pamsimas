-- ============================================
-- DATABASE SCHEMA: PAMSIMAS
-- ============================================

-- Tabel: Users (Petugas & Admin)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'petugas')),
    nama_lengkap VARCHAR(100) NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: Pelanggan
CREATE TABLE pelanggan (
    id SERIAL PRIMARY KEY,
    kode_pelanggan VARCHAR(20) UNIQUE NOT NULL,  -- Format: YYYYMMDDXXXX
    nama VARCHAR(100) NOT NULL,
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('personal', 'bisnis')),
    alamat TEXT,
    rt VARCHAR(10),  -- Rukun Tetangga
    rw VARCHAR(10),  -- Rukun Warga
    no_hp VARCHAR(20),
    petugas_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    meteran_awal INTEGER DEFAULT 0,  -- Meteran awal pelanggan (untuk pencatatan berikutnya)
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: Histori Petugas (Track pergantian petugas pelanggan)
CREATE TABLE histori_petugas (
    id SERIAL PRIMARY KEY,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE CASCADE,
    petugas_lama_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    petugas_baru_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tanggal_penggantian DATE NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: Tarif (Dapat disetel admin)
CREATE TABLE tarif (
    id SERIAL PRIMARY KEY,
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('personal', 'bisnis')),
    batas_bawah INTEGER NOT NULL,      -- Misal: 0, 11, 21, 31
    batas_atas INTEGER NOT NULL,       -- Misal: 10, 20, 30, 999
    harga_per_m3 DECIMAL(10, 2) NOT NULL,
    aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kategori, batas_bawah, batas_atas)
);

-- Tabel: Pengaturan Sistem
CREATE TABLE pengaturan (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    deskripsi TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: Pencatatan Meteran
CREATE TABLE pencatatan (
    id SERIAL PRIMARY KEY,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE CASCADE,
    petugas_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INTEGER NOT NULL,
    meteran_awal INTEGER NOT NULL DEFAULT 0,
    meteran_akhir INTEGER NOT NULL,
    pemakaian INTEGER GENERATED ALWAYS AS (meteran_akhir - meteran_awal) STORED,
    foto_meteran VARCHAR(255),
    total_biaya_admin INTEGER NOT NULL DEFAULT 3000,  -- Bisa ditumpuk
    jumlah_bulan_belum_dicatat INTEGER DEFAULT 1,     -- Default 1 bulan
    status_catat VARCHAR(20) DEFAULT 'dicatat' CHECK (status_catat IN ('dicatat', 'draft')),
    tanggal_catat DATE NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pelanggan_id, bulan, tahun)  -- Satu pelanggan hanya 1 catatan per bulan
);

-- Tabel: Pembayaran
CREATE TABLE pembayaran (
    id SERIAL PRIMARY KEY,
    pencatatan_id INTEGER NOT NULL REFERENCES pencatatan(id) ON DELETE CASCADE,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE CASCADE,
    petugas_id INTEGER REFERENCES users(id) ON DELETE SET NULL,      -- Jika bayar ke petugas
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,        -- Jika bayar ke admin
    total_tagihan INTEGER NOT NULL,
    biaya_admin INTEGER NOT NULL DEFAULT 3000,
    biaya_sistem INTEGER NOT NULL DEFAULT 1000,
    biaya_petugas INTEGER NOT NULL DEFAULT 2000,
    biaya_air INTEGER NOT NULL DEFAULT 0,
    metode_bayar VARCHAR(20) DEFAULT 'tunai' CHECK (metode_bayar IN ('tunai', 'transfer')),
    status_bayar VARCHAR(20) DEFAULT 'lunas' CHECK (status_bayar IN ('lunas', 'belum')),
    tanggal_bayar DATE NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: Audit Log (Optional - untuk tracking)
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    aksi VARCHAR(50) NOT NULL,
    tabel VARCHAR(50) NOT NULL,
    record_id INTEGER,
    data_lama JSONB,
    data_baru JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Index untuk pencarian cepat
CREATE INDEX idx_pelanggan_kode ON pelanggan(kode_pelanggan);
CREATE INDEX idx_pelanggan_petugas ON pelanggan(petugas_id);
CREATE INDEX idx_pencatatan_pelanggan ON pencatatan(pelanggan_id);
CREATE INDEX idx_pencatatan_petugas ON pencatatan(petugas_id);
CREATE INDEX idx_pencatatan_bulan_tahun ON pencatatan(bulan, tahun);
CREATE INDEX idx_pembayaran_pelanggan ON pembayaran(pelanggan_id);
CREATE INDEX idx_pembayaran_petugas ON pembayaran(petugas_id);
CREATE INDEX idx_pembayaran_admin ON pembayaran(admin_id);
CREATE INDEX idx_pembayaran_status ON pembayaran(status_bayar);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default admin (password: admin123)
INSERT INTO users (username, password_hash, role, nama_lengkap) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc7q', 'Administrator', 'admin');

-- Insert tarif default - Personal
INSERT INTO tarif (kategori, batas_bawah, batas_atas, harga_per_m3) VALUES
('personal', 0, 10, 250),
('personal', 11, 20, 500),
('personal', 21, 30, 750),
('personal', 31, 999, 1000);

-- Insert tarif default - Bisnis
INSERT INTO tarif (kategori, batas_bawah, batas_atas, harga_per_m3) VALUES
('bisnis', 0, 10, 500),
('bisnis', 11, 20, 750),
('bisnis', 21, 30, 1000);

-- Insert pengaturan default
INSERT INTO pengaturan (key, value, deskripsi) VALUES
('biaya_admin', '3000', 'Biaya admin per bulan'),
('biaya_sistem', '1000', 'Bagian biaya admin untuk sistem'),
('biaya_petugas', '2000', 'Bagian biaya admin untuk petugas'),
('hitung_gaji_berdasarkan', 'tercatat', 'Options: tercatat | lunas. Gaji petugas dihitung berdasarkan pelanggan yang sudah tercatat atau sudah lunas'),
('nama_sistem', 'PAMSIMAS', 'Nama sistem'),
('alamat_sistem', '', 'Alamat kantor PAMSIMAS');
