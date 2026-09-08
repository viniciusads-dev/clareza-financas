import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('finance_records',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),created:integer('created').notNull(),
},t=>[index('idx_finance_owner_kind').on(t.owner,t.kind)]);
export const requests=sqliteTable('finance_requests',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),created:integer('created').notNull(),
},t=>[index('idx_requests_owner_created').on(t.owner,t.created)]);
export const apiTokens=sqliteTable('finance_api_tokens',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),tokenHash:text('token_hash').notNull(),prefix:text('prefix').notNull(),scopes:text('scopes').notNull(),created:integer('created').notNull(),expiresAt:integer('expires_at'),revokedAt:integer('revoked_at'),lastUsedAt:integer('last_used_at'),
},t=>[index('idx_api_tokens_owner').on(t.owner),uniqueIndex('uq_api_tokens_hash').on(t.tokenHash)]);
