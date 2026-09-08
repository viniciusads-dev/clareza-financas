import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('finance_records',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),created:integer('created').notNull(),
},t=>[index('idx_finance_owner_kind').on(t.owner,t.kind)]);
export const requests=sqliteTable('finance_requests',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),created:integer('created').notNull(),
},t=>[index('idx_requests_owner_created').on(t.owner,t.created)]);
