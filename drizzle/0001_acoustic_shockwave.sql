CREATE TABLE `finance_api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`prefix` text NOT NULL,
	`scopes` text NOT NULL,
	`created` integer NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`last_used_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_api_tokens_owner` ON `finance_api_tokens` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_api_tokens_hash` ON `finance_api_tokens` (`token_hash`);