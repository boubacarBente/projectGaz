ALTER TABLE `wallet_transactions` ADD `purchase_invoice_id` integer REFERENCES purchase_invoices(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD `purchase_invoice_reference` text;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD `purchase_invoice_supplier_name` text;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD `purchase_invoice_date` text;
