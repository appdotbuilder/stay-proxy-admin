import { db } from '../db';
import { proxyLogsTable, proxiesTable } from '../db/schema';
import { type CreateProxyLogInput, type ProxyLog } from '../schema';
import { eq } from 'drizzle-orm';

export const createProxyLog = async (input: CreateProxyLogInput): Promise<ProxyLog> => {
  try {
    // Verify that the proxy exists before creating a log entry
    const proxy = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, input.proxy_id))
      .execute();

    if (proxy.length === 0) {
      throw new Error(`Proxy with id ${input.proxy_id} does not exist`);
    }

    // Insert proxy log record
    const result = await db.insert(proxyLogsTable)
      .values({
        proxy_id: input.proxy_id,
        client_ip: input.client_ip,
        login_time: input.login_time,
        logout_time: input.logout_time || null,
        bytes_transferred: input.bytes_transferred || 0
      })
      .returning()
      .execute();

    const proxyLog = result[0];
    return {
      ...proxyLog,
      // Ensure all date fields are properly typed
      login_time: proxyLog.login_time,
      logout_time: proxyLog.logout_time,
      created_at: proxyLog.created_at
    };
  } catch (error) {
    console.error('Proxy log creation failed:', error);
    throw error;
  }
};