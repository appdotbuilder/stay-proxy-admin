import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { type IpResetInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const resetProxyIp = async (input: IpResetInput): Promise<{ success: boolean; message: string; affected_proxies: number }> => {
  try {
    let query = db.update(proxiesTable);
    let countQuery = db.select().from(proxiesTable);

    // Build the where condition based on input
    if (input.proxy_id !== undefined) {
      // Reset specific proxy - verify it exists first
      const existingProxy = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, input.proxy_id))
        .execute();

      if (existingProxy.length === 0) {
        return {
          success: false,
          message: `Proxy with ID ${input.proxy_id} not found`,
          affected_proxies: 0
        };
      }

      // Update specific proxy
      await query
        .set({
          public_ip: null, // Reset public IP to trigger new IP assignment
          status: 'offline', // Mark as offline during IP reset
          updated_at: new Date()
        })
        .where(eq(proxiesTable.id, input.proxy_id))
        .execute();

      return {
        success: true,
        message: `IP reset initiated for proxy ${existingProxy[0].device_name}`,
        affected_proxies: 1
      };
    } else {
      // Reset all online proxies
      const conditions = [eq(proxiesTable.status, 'online')];

      // Count affected proxies first
      const proxiesToReset = await db.select()
        .from(proxiesTable)
        .where(and(...conditions))
        .execute();

      if (proxiesToReset.length === 0) {
        return {
          success: true,
          message: 'No online proxies found to reset',
          affected_proxies: 0
        };
      }

      // Update all online proxies
      await query
        .set({
          public_ip: null, // Reset public IP to trigger new IP assignment
          status: 'offline', // Mark as offline during IP reset
          updated_at: new Date()
        })
        .where(and(...conditions))
        .execute();

      return {
        success: true,
        message: `IP reset initiated for all online proxies`,
        affected_proxies: proxiesToReset.length
      };
    }
  } catch (error) {
    console.error('Proxy IP reset failed:', error);
    throw error;
  }
};