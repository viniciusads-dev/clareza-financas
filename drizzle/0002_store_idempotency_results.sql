ALTER TABLE `finance_requests` ADD COLUMN `method` text;
--> statement-breakpoint
ALTER TABLE `finance_requests` ADD COLUMN `path` text;
--> statement-breakpoint
ALTER TABLE `finance_requests` ADD COLUMN `payload_hash` text;
--> statement-breakpoint
ALTER TABLE `finance_requests` ADD COLUMN `status` integer;
--> statement-breakpoint
ALTER TABLE `finance_requests` ADD COLUMN `response` text;
