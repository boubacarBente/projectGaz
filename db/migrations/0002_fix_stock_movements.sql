-- Migration 0002: Add missing columns to stock_movements
-- The schema was updated to include stock_before, stock_after, reference_type, reference_id, note
-- but the table was created with an older schema (product_code, product_name, reference, notes)

ALTER TABLE stock_movements ADD COLUMN stock_before INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN stock_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN reference_type TEXT;
ALTER TABLE stock_movements ADD COLUMN reference_id INTEGER;
ALTER TABLE stock_movements ADD COLUMN note TEXT;

-- Copy existing notes to note column for backward compatibility
UPDATE stock_movements SET note = notes WHERE notes IS NOT NULL;
