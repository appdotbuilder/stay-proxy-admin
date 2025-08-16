import { db } from '../db';
import { proxyLogsTable, proxiesTable } from '../db/schema';
import { type ProxyLog } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getProxyLogs(limit: number = 50, offset: number = 0): Promise<ProxyLog[]> {
  try {
    // Build query with join to get proxy information
    const results = await db.select({
      id: proxyLogsTable.id,
      proxy_id: proxyLogsTable.proxy_id,
      client_ip: proxyLogsTable.client_ip,
      login_time: proxyLogsTable.login_time,
      logout_time: proxyLogsTable.logout_time,
      bytes_transferred: proxyLogsTable.bytes_transferred,
      created_at: proxyLogsTable.created_at,
    })
    .from(proxyLogsTable)
    .innerJoin(proxiesTable, eq(proxyLogsTable.proxy_id, proxiesTable.id))
    .orderBy(desc(proxyLogsTable.created_at))
    .limit(limit)
    .offset(offset)
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch proxy logs:', error);
    throw error;
  }
}