import {
    sqliteTable,
    text,
    integer,
    index,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const records = sqliteTable(
    "finance_records",
    {
        id: text("id").primaryKey(),
        owner: text("owner").notNull(),
        kind: text("kind").notNull(),
        data: text("data").notNull(),
        created: integer("created").notNull(),
    },
    (t) => [index("idx_finance_owner_kind").on(t.owner, t.kind)],
);
export const requests = sqliteTable(
    "finance_requests",
    {
        id: text("id").primaryKey(),
        owner: text("owner").notNull(),
        created: integer("created").notNull(),
    },
    (t) => [index("idx_requests_owner_created").on(t.owner, t.created)],
);
export const users = sqliteTable(
    "app_users",
    {
        id: text("id").primaryKey(),
        email: text("email").notNull(),
        name: text("name").notNull(),
        passwordHash: text("password_hash").notNull(),
        passwordSalt: text("password_salt").notNull(),
        passwordIterations: integer("password_iterations").notNull(),
        created: integer("created").notNull(),
    },
    (t) => [uniqueIndex("idx_app_users_email").on(t.email)],
);
export const sessions = sqliteTable(
    "app_sessions",
    {
        id: text("id").primaryKey(),
        userId: text("user_id").notNull(),
        tokenHash: text("token_hash").notNull(),
        created: integer("created").notNull(),
        expires: integer("expires").notNull(),
    },
    (t) => [
        uniqueIndex("idx_app_sessions_token_hash").on(t.tokenHash),
        index("idx_app_sessions_user_expires").on(t.userId, t.expires),
    ],
);
