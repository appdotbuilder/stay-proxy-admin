import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createProxyInputSchema,
  updateProxyStatusInputSchema,
  ipResetInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createProxyLogInputSchema,
  updateSettingsInputSchema
} from './schema';

// Import all handlers
import { createProxy } from './handlers/create_proxy';
import { getProxies } from './handlers/get_proxies';
import { updateProxyStatus } from './handlers/update_proxy_status';
import { resetProxyIp } from './handlers/reset_proxy_ip';
import { getProxyDetails } from './handlers/get_proxy_details';
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { deleteUser } from './handlers/delete_user';
import { createProxyLog } from './handlers/create_proxy_log';
import { getProxyLogs } from './handlers/get_proxy_logs';
import { getSettings } from './handlers/get_settings';
import { updateSettings } from './handlers/update_settings';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // Proxy management
  createProxy: publicProcedure
    .input(createProxyInputSchema)
    .mutation(({ input }) => createProxy(input)),
  
  getProxies: publicProcedure
    .query(() => getProxies()),

  updateProxyStatus: publicProcedure
    .input(updateProxyStatusInputSchema)
    .mutation(({ input }) => updateProxyStatus(input)),

  resetProxyIp: publicProcedure
    .input(ipResetInputSchema)
    .mutation(({ input }) => resetProxyIp(input)),

  getProxyDetails: publicProcedure
    .input(z.object({ proxyId: z.number() }))
    .query(({ input }) => getProxyDetails(input.proxyId)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  deleteUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => deleteUser(input.userId)),

  // Proxy logs
  createProxyLog: publicProcedure
    .input(createProxyLogInputSchema)
    .mutation(({ input }) => createProxyLog(input)),

  getProxyLogs: publicProcedure
    .input(z.object({ 
      limit: z.number().optional(),
      offset: z.number().optional()
    }).optional())
    .query(({ input }) => getProxyLogs(input?.limit, input?.offset)),

  // Settings
  getSettings: publicProcedure
    .query(() => getSettings()),

  updateSettings: publicProcedure
    .input(updateSettingsInputSchema)
    .mutation(({ input }) => updateSettings(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Stay Proxy TRPC server listening at port: ${port}`);
}

start();