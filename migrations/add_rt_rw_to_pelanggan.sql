-- Migration: Add rt and rw columns to pelanggan table
-- Date: 2026-03-08
-- Description: Add RT (Rukun Tetangga) and RW (Rukun Warga) columns for filtering by neighborhood

-- Add rt and rw columns to pelanggan table
ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS rt VARCHAR(10);
ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS rw VARCHAR(10);

-- Add comments for documentation
COMMENT ON COLUMN pelanggan.rt IS 'Rukun Tetangga (RT)';
COMMENT ON COLUMN pelanggan.rw IS 'Rukun Warga (RW)';

-- Verify the columns were added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pelanggan'
  AND column_name IN ('rt', 'rw')
ORDER BY column_name;
