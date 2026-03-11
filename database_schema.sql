-- PAMSIMAS Database Schema
-- PostgreSQL Schema
-- Generated: 2025-03-08

-- =====================================================
-- DROP TABLES (Hapus jika ada recreate database)
-- =====================================================

-- Drop tabel dengan memperhatikan foreign key dependencies
DROP TABLE IF EXISTS pembayaran CASCADE;
DROP TABLE IF EXISTS pencatatan CASCADE;
DROP TABLE IF EXISTS pelanggan CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS pengaturan CASCADE;
DROP TABLE IF EXISTS tarif CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Tabel Users (Admin dan Petugas)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'petugas')),
    nama_lengkap VARCHAR(100) NOT NULL,
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Tarif (Harga air per m3 berdasarkan kategori dan pemakaian)
CREATE TABLE tarif (
    id SERIAL PRIMARY KEY,
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('personal', 'bisnis')),
    batas_bawah INTEGER NOT NULL,
    batas_atas INTEGER NOT NULL,
    harga_per_m3 NUMERIC(10, 2) NOT NULL,
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_batas CHECK (batas_atas >= batas_bawah)
);

-- Tabel Pengaturan (Settings sistem)
CREATE TABLE pengaturan (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    deskripsi TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Pelanggan
CREATE TABLE pelanggan (
    id SERIAL PRIMARY KEY,
    kode_pelanggan VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('personal', 'bisnis')),
    alamat TEXT,
    rt VARCHAR(10),
    rw VARCHAR(10),
    no_hp VARCHAR(20),
    petugas_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    meteran_awal INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Pencatatan Meteran
CREATE TABLE pencatatan (
    id SERIAL PRIMARY KEY,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE CASCADE,
    petugas_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INTEGER NOT NULL CHECK (tahun >= 2020 AND tahun <= 2100),
    meteran_awal INTEGER NOT NULL DEFAULT 0,
    meteran_akhir INTEGER NOT NULL,
    pemakaian INTEGER,
    foto_meteran VARCHAR(255),
    total_biaya_admin INTEGER NOT NULL DEFAULT 3000,
    jumlah_bulan_belum_dicatat INTEGER DEFAULT 1,
    status_catat VARCHAR(20) DEFAULT 'dicatat' CHECK (status_catat IN ('dicatat', 'belum')),
    tanggal_catat DATE NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_meteran CHECK (meteran_akhir >= meteran_awal),
    CONSTRAINT valid_pemakaian CHECK (pemakaian IS NULL OR pemakaian >= 0),
    CONSTRAINT unique_bulan_tahun UNIQUE (pelanggan_id, bulan, tahun)
);

-- Tabel Audit Log (Tracking perubahan data)
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    aksi VARCHAR(50) NOT NULL CHECK (aksi IN ('create', 'update', 'delete')),
    tabel VARCHAR(50) NOT NULL,
    record_id INTEGER,
    data_lama JSONB,
    data_baru JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Pembayaran
CREATE TABLE pembayaran (
    id SERIAL PRIMARY KEY,
    pencatatan_id INTEGER NOT NULL REFERENCES pencatatan(id) ON DELETE CASCADE,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE RESTRICT,
    petugas_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_tagihan INTEGER NOT NULL,
    biaya_admin INTEGER NOT NULL DEFAULT 3000,
    biaya_sistem INTEGER NOT NULL DEFAULT 1000,
    biaya_petugas INTEGER NOT NULL DEFAULT 2000,
    biaya_air INTEGER NOT NULL DEFAULT 0,
    metode_bayar VARCHAR(20) DEFAULT 'tunai' CHECK (metode_bayar IN ('tunai', 'transfer')),
    status_bayar VARCHAR(20) DEFAULT 'lunas' CHECK (status_bayar IN ('lunas', 'pending', 'batal')),
    tanggal_bayar DATE NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_tagihan CHECK (total_tagihan >= 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index untuk users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_aktif ON users(aktif);

-- Index untuk pelanggan
CREATE INDEX idx_pelanggan_kode ON pelanggan(kode_pelanggan);
CREATE INDEX idx_pelanggan_kategori ON pelanggan(kategori);
CREATE INDEX idx_pelanggan_status ON pelanggan(status);
CREATE INDEX idx_pelanggan_petugas ON pelanggan(petugas_id);
CREATE INDEX idx_pelanggan_rtrw ON pelanggan(rt, rw);

-- Index untuk tarif
CREATE INDEX idx_tarif_kategori ON tarif(kategori);
CREATE INDEX idx_tarif_aktif ON tarif(aktif);

-- Index untuk pencatatan
CREATE INDEX idx_pencatatan_pelanggan ON pencatatan(pelanggan_id);
CREATE INDEX idx_pencatatan_petugas ON pencatatan(petugas_id);
CREATE INDEX idx_pencatatan_bulan_tahun ON pencatatan(bulan, tahun);
CREATE INDEX idx_pencatatan_tanggal ON pencatatan(tanggal_catat);
CREATE INDEX idx_pencatatan_status ON pencatatan(status_catat);

-- Index untuk pembayaran
CREATE INDEX idx_pembayaran_pelanggan ON pembayaran(pelanggan_id);
CREATE INDEX idx_pembayaran_petugas ON pembayaran(petugas_id);
CREATE INDEX idx_pembayaran_admin ON pembayaran(admin_id);
CREATE INDEX idx_pembayaran_tanggal ON pembayaran(tanggal_bayar);
CREATE INDEX idx_pembayaran_status ON pembayaran(status_bayar);

-- Index untuk audit_log
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_aksi ON audit_log(aksi);
CREATE INDEX idx_audit_tabel ON audit_log(tabel);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Index untuk pengaturan
CREATE INDEX idx_pengaturan_key ON pengaturan(key);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function untuk update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pelanggan_updated_at BEFORE UPDATE ON pelanggan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pencatatan_updated_at BEFORE UPDATE ON pencatatan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pembayaran_updated_at BEFORE UPDATE ON pembayaran
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarif_updated_at BEFORE UPDATE ON tarif
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (Data Awal)
-- =====================================================

-- Insert default Admin user
-- Password: admin123 (hash untuk bcrypt)
INSERT INTO users (username, password_hash, role, nama_lengkap) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5Mx5W8W4f5dSy', 'admin', 'Administrator');

-- Insert default Petugas users (contoh)
-- Password: petugas123
INSERT INTO users (username, password_hash, role, nama_lengkap) VALUES
('petugas1', '$2b$12$EixZaYVK1fsbw1ZfbX3OXe/PZ/Xc9zYFx1r6f3n7zWpLvU8cZqWFe', 'petugas', 'Petugas Lapangan 1'),
('petugas2', '$2b$12$EixZaYVK1fsbw1ZfbX3OXe/PZ/Xc9zYFx1r6f3n7zWpLvU8cZqWFe', 'petugas', 'Petugas Lapangan 2');

-- Insert default Tarif untuk Personal
INSERT INTO tarif (kategori, batas_bawah, batas_atas, harga_per_m3, aktif) VALUES
('personal', 0, 10, 1500, true),
('personal', 11, 20, 2000, true),
('personal', 21, 30, 2500, true),
('personal', 31, 999999, 3000, true);

-- Insert default Tarif untuk Bisnis
INSERT INTO tarif (kategori, batas_bawah, batas_atas, harga_per_m3, aktif) VALUES
('bisnis', 0, 10, 2000, true),
('bisnis', 11, 20, 2500, true),
('bisnis', 21, 30, 3000, true),
('bisnis', 31, 999999, 3500, true);

-- Insert default Pengaturan
INSERT INTO pengaturan (key, value, deskripsi) VALUES
('biaya_admin', '3000', 'Biaya admin per pencatatan'),
('biaya_sistem', '1000', 'Biaya sistem per transaksi'),
('biaya_petugas', '2000', 'Biaya petugas per pencatatan'),
('nama_perusahaan', 'PDAM TIRTA MAKMUR', 'Nama perusahaan air'),
('alamat_perusahaan', 'Jl. Pahlawan No. 123, Jakarta', 'Alamat perusahaan'),
('telepon_perusahaan', '021-1234567', 'Nomor telepon perusahaan'),

-- =====================================================
-- VIEWS (Pandangan Data yang Sering Digunakan)
-- =====================================================

-- View untuk Daftar Pelanggan dengan nama petugas
CREATE VIEW v_pelanggan_list AS
SELECT
    p.id,
    p.kode_pelanggan,
    p.nama,
    p.kategori,
    p.alamat,
    p.rt,
    p.rw,
    p.no_hp,
    p.meteran_awal,
    p.status,
    p.petugas_id,
    u.nama_lengkap AS petugas_nama,
    p.created_at,
    p.updated_at
FROM pelanggan p
LEFT JOIN users u ON p.petugas_id = u.id;

-- View untuk Laporan Pencatatan dengan detail pelanggan
CREATE VIEW v_pencatatan_laporan AS
SELECT
    penc.id,
    penc.pelanggan_id,
    pel.kode_pelanggan,
    pel.nama AS pelanggan_nama,
    pel.kategori,
    penc.petugas_id,
    pet.nama_lengkap AS petugas_nama,
    penc.bulan,
    penc.tahun,
    penc.meteran_awal,
    penc.meteran_akhir,
    penc.pemakaian,
    penc.total_biaya_admin,
    penc.status_catat,
    penc.tanggal_catat,
    penc.created_at
FROM pencatatan penc
INNER JOIN pelanggan pel ON penc.pelanggan_id = pel.id
LEFT JOIN users pet ON penc.petugas_id = pet.id;

-- View untuk Laporan Pembayaran
CREATE VIEW v_pembayaran_laporan AS
SELECT
    pemb.id,
    pemb.pencatatan_id,
    pemb.pelanggan_id,
    pel.kode_pelanggan,
    pel.nama AS pelanggan_nama,
    pemb.petugas_id,
    pet.nama_lengkap AS petugas_nama,
    pemb.admin_id,
    adm.nama_lengkap AS admin_nama,
    pemb.total_tagihan,
    pemb.biaya_admin,
    pemb.biaya_sistem,
    pemb.biaya_petugas,
    pemb.biaya_air,
    pemb.metode_bayar,
    pemb.status_bayar,
    pemb.tanggal_bayar,
    pemb.keterangan,
    pemb.created_at
FROM pembayaran pemb
INNER JOIN pelanggan pel ON pemb.pelanggan_id = pel.id
LEFT JOIN users pet ON pemb.petugas_id = pet.id
LEFT JOIN users adm ON pemb.admin_id = adm.id;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
