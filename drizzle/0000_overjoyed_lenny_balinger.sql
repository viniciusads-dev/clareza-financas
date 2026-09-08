CREATE TABLE `finance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_finance_owner_kind` ON `finance_records` (`owner`,`kind`);--> statement-breakpoint
CREATE TABLE `finance_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_requests_owner_created` ON `finance_requests` (`owner`,`created`);