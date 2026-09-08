DROP INDEX `idx_api_tokens_hash`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_api_tokens_hash` ON `finance_api_tokens` (`token_hash`);