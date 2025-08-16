import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { type CreateProxyInput, type Proxy } from '../schema';

export const createProxy = async (input: CreateProxyInput): Promise<Proxy> => {
  try {
    // Insert proxy record
    const result = await db.insert(proxiesTable)
      .values({
        device_name: input.device_name,
        internal_ip: input.internal_ip,
        public_ip: null, // Will be updated when device comes online
        port: input.port,
        username: input.username,
        password: input.password,
        status: 'offline' // Default status for new proxies
      })
      .returning()
      .execute();

    const proxy = result[0];
    
    // Return proxy data matching the Proxy schema (excluding internal_ip)
    return {
      id: proxy.id,
      device_name: proxy.device_name,
      public_ip: proxy.public_ip || '', // Convert null to empty string for schema compatibility
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      status: proxy.status,
      created_at: proxy.created_at,
      updated_at: proxy.updated_at
    };
  } catch (error) {
    console.error('Proxy creation failed:', error);
    throw error;
  }
};