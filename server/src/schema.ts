import { z } from 'zod';

// Proxy schema
export const proxySchema = z.object({
  id: z.number(),
  device_name: z.string(),
  public_ip: z.string(),
  port: z.number().int(),
  username: z.string(),
  password: z.string(),
  status: z.enum(['online', 'offline']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Proxy = z.infer<typeof proxySchema>;

// Input schema for creating proxies (devices)
export const createProxyInputSchema = z.object({
  device_name: z.string().min(1, 'Device name is required'),
  internal_ip: z.string().ip('Invalid IP address'),
  port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type CreateProxyInput = z.infer<typeof createProxyInputSchema>;

// Input schema for updating proxy status
export const updateProxyStatusInputSchema = z.object({
  id: z.number(),
  status: z.enum(['online', 'offline']).optional(),
  public_ip: z.string().optional(),
});

export type UpdateProxyStatusInput = z.infer<typeof updateProxyStatusInputSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  access_level: z.enum(['admin', 'user']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  access_level: z.enum(['admin', 'user']),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  access_level: z.enum(['admin', 'user']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Proxy usage log schema
export const proxyLogSchema = z.object({
  id: z.number(),
  proxy_id: z.number(),
  client_ip: z.string(),
  login_time: z.coerce.date(),
  logout_time: z.coerce.date().nullable(),
  bytes_transferred: z.number().int(),
  created_at: z.coerce.date(),
});

export type ProxyLog = z.infer<typeof proxyLogSchema>;

// Input schema for creating proxy logs
export const createProxyLogInputSchema = z.object({
  proxy_id: z.number(),
  client_ip: z.string().ip('Invalid IP address'),
  login_time: z.coerce.date(),
  logout_time: z.coerce.date().nullable().optional(),
  bytes_transferred: z.number().int().nonnegative().optional().default(0),
});

export type CreateProxyLogInput = z.infer<typeof createProxyLogInputSchema>;

// Settings schema
export const settingsSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Settings = z.infer<typeof settingsSchema>;

// Input schema for updating settings
export const updateSettingsInputSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().nullable().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;

// Dashboard stats schema
export const dashboardStatsSchema = z.object({
  active_proxies: z.number().int(),
  total_proxies: z.number().int(),
  online_proxies: z.number().int(),
  offline_proxies: z.number().int(),
  total_users: z.number().int(),
  recent_logs: z.array(proxyLogSchema),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// IP reset input schema
export const ipResetInputSchema = z.object({
  proxy_id: z.number().optional(), // If not provided, reset all proxies
});

export type IpResetInput = z.infer<typeof ipResetInputSchema>;

// Proxy details for clipboard copy
export const proxyDetailsSchema = z.object({
  public_ip: z.string(),
  port: z.number().int(),
  username: z.string(),
  password: z.string(),
});

export type ProxyDetails = z.infer<typeof proxyDetailsSchema>;