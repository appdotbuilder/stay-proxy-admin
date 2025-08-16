import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { type ProxyDetails } from '../schema';
import { eq } from 'drizzle-orm';

export const getProxyDetails = async (proxyId: number): Promise<ProxyDetails | null> => {
  try {
    // Query the proxy with the specified ID
    const result = await db.select({
      public_ip: proxiesTable.public_ip,
      port: proxiesTable.port,
      username: proxiesTable.username,
      password: proxiesTable.password,
    })
      .from(proxiesTable)
      .where(eq(proxiesTable.id, proxyId))
      .execute();

    // Return null if proxy not found
    if (result.length === 0) {
      return null;
    }

    const proxy = result[0];

    // Return null if proxy doesn't have a public IP (not online/configured)
    if (!proxy.public_ip) {
      return null;
    }

    return {
      public_ip: proxy.public_ip,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
    };
  } catch (error) {
    console.error('Get proxy details failed:', error);
    throw error;
  }
};