import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { type Proxy } from '../schema';

export const getProxies = async (): Promise<Proxy[]> => {
  try {
    // Fetch all proxies from the database
    const result = await db.select()
      .from(proxiesTable)
      .execute();

    // Return the proxies with properly typed data
    return result.map(proxy => ({
      id: proxy.id,
      device_name: proxy.device_name,
      public_ip: proxy.public_ip || '', // Handle nullable public_ip
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      status: proxy.status,
      created_at: proxy.created_at,
      updated_at: proxy.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch proxies:', error);
    throw error;
  }
};