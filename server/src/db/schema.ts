import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const statusEnum = pgEnum('status', ['online', 'offline']);
export const accessLevelEnum = pgEnum('access_level', ['admin', 'user']);

// Proxies table
export const proxiesTable = pgTable('proxies', {
  id: serial('id').primaryKey(),
  device_name: text('device_name').notNull(),
  internal_ip: text('internal_ip').notNull(), // For internal management
  public_ip: text('public_ip'), // Can be null initially, updated when device comes online
  port: integer('port').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  status: statusEnum('status').notNull().default('offline'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // Should be hashed in real implementation
  access_level: accessLevelEnum('access_level').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Proxy usage logs table
export const proxyLogsTable = pgTable('proxy_logs', {
  id: serial('id').primaryKey(),
  proxy_id: integer('proxy_id').notNull(),
  client_ip: text('client_ip').notNull(),
  login_time: timestamp('login_time').notNull(),
  logout_time: timestamp('logout_time'), // Nullable - session might still be active
  bytes_transferred: integer('bytes_transferred').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Settings table for global configuration
export const settingsTable = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'), // Nullable - optional description
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const proxiesRelations = relations(proxiesTable, ({ many }) => ({
  logs: many(proxyLogsTable),
}));

export const proxyLogsRelations = relations(proxyLogsTable, ({ one }) => ({
  proxy: one(proxiesTable, {
    fields: [proxyLogsTable.proxy_id],
    references: [proxiesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Proxy = typeof proxiesTable.$inferSelect;
export type NewProxy = typeof proxiesTable.$inferInsert;

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type ProxyLog = typeof proxyLogsTable.$inferSelect;
export type NewProxyLog = typeof proxyLogsTable.$inferInsert;

export type Settings = typeof settingsTable.$inferSelect;
export type NewSettings = typeof settingsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  proxies: proxiesTable,
  users: usersTable,
  proxyLogs: proxyLogsTable,
  settings: settingsTable,
};

export const relations_exports = {
  proxiesRelations,
  proxyLogsRelations,
};