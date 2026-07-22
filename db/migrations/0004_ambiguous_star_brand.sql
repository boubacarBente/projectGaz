ALTER TABLE `sales_invoices` ADD `purchase_invoice_id` integer REFERENCES purchase_invoices(id) ON DELETE SET NULL;
