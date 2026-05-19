CREATE TABLE `customer_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_types_name_unique` ON `customer_types` (`name`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`city` text,
	`type_id` integer,
	`total_purchases` real DEFAULT 0,
	`notes` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`type_id`) REFERENCES `customer_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`capacity` text NOT NULL,
	`unit_price` real NOT NULL,
	`sale_price` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE TABLE `purchase_invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost` real NOT NULL,
	`total_cost` real NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`supplier_id` integer,
	`date` text NOT NULL,
	`notes` text,
	`total_amount` real DEFAULT 0,
	`is_paid` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales_invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_name` text NOT NULL,
	`date` text NOT NULL,
	`payment_method` text DEFAULT 'Espèces',
	`notes` text,
	`total_amount` real DEFAULT 0,
	`amount_paid` real DEFAULT 0,
	`remaining_amount` real DEFAULT 0,
	`payment_status` text DEFAULT 'En attente',
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text DEFAULT 'Mini-Centre Distribution',
	`company_address` text,
	`company_phone` text,
	`company_email` text,
	`default_min_stock` integer DEFAULT 10,
	`currency` text DEFAULT 'GNF',
	`currency_symbol` text DEFAULT 'GNF',
	`date_format` text DEFAULT 'DD/MM/YYYY',
	`invoice_prefix` text DEFAULT 'FAC',
	`purchase_prefix` text DEFAULT 'ACH',
	`low_stock_alert_enabled` integer DEFAULT true,
	`theme` text DEFAULT 'light',
	`primary_color` text DEFAULT '#1e40af',
	`sidebar_color` text DEFAULT '#1e293b',
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text NOT NULL,
	`capacity` text NOT NULL,
	`current_stock` integer DEFAULT 0,
	`min_stock` integer DEFAULT 10,
	`last_entry` text,
	`last_exit` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference` text NOT NULL,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`total_purchases` real DEFAULT 0,
	`notes` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_name_unique` ON `suppliers` (`name`);