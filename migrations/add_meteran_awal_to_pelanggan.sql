-- Migration: Add meteran_awal column to pelanggan table
-- Date: 2026-03-08
-- Description: Add meteran_awal column to store initial meter reading for customers

-- Add meteran_awal column to pelanggan table
ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS meteran_awal INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN pelanggan.meteran_awal IS 'Meteran awal pelanggan (untuk pencatatan berikutnya)';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pelanggan'
  AND column_name = 'meteran_awal';
