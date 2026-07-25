PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_wallet_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`balance_after` real NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_wallet_transactions`("id", "amount", "type", "description", "balance_after", "created_at", "updated_at") SELECT "id", "amount", "type", "description", "balance_after", "created_at", "updated_at" FROM `wallet_transactions`;--> statement-breakpoint
DROP TABLE `wallet_transactions`;--> statement-breakpoint
ALTER TABLE `__new_wallet_transactions` RENAME TO `wallet_transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;