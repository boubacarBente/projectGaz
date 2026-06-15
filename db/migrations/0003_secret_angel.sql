CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user',
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`balance_after` real NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
DROP TABLE `stock`;--> statement-breakpoint
ALTER TABLE `products` ADD `stock` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `stock_min` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `default_min_stock`;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `low_stock_alert_enabled`;