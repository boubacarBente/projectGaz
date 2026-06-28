ALTER TABLE stock_movements ADD COLUMN stock_before INTEGER NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE stock_movements ADD COLUMN stock_after INTEGER NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE stock_movements ADD COLUMN reference_type TEXT;--> statement-breakpoint
ALTER TABLE stock_movements ADD COLUMN reference_id INTEGER;--> statement-breakpoint
ALTER TABLE stock_movements ADD COLUMN note TEXT;