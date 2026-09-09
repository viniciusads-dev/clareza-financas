CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_app_users_email` ON `app_users` (`email`);
--> statement-breakpoint
CREATE TABLE `app_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_app_sessions_token_hash` ON `app_sessions` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_app_sessions_user_expires` ON `app_sessions` (`user_id`,`expires`);
