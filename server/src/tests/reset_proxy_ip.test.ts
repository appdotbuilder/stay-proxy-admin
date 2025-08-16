import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { type IpResetInput } from '../schema';
import { resetProxyIp } from '../handlers/reset_proxy_ip';
import { eq } from 'drizzle-orm';

describe('resetProxyIp', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test proxy
  const createTestProxy = async (overrides: Partial<any> = {}) => {
    const defaultProxy = {
      device_name: 'Test Device',
      internal_ip: '192.168.1.100',
      public_ip: '203.0.113.1',
      port: 8080,
      username: 'testuser',
      password: 'testpass',
      status: 'online' as const,
      ...overrides
    };

    const result = await db.insert(proxiesTable)
      .values(defaultProxy)
      .returning()
      .execute();

    return result[0];
  };

  describe('reset specific proxy', () => {
    it('should reset IP for specific proxy', async () => {
      const proxy = await createTestProxy();
      const input: IpResetInput = { proxy_id: proxy.id };

      const result = await resetProxyIp(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Device');
      expect(result.affected_proxies).toBe(1);

      // Verify database changes
      const updatedProxy = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, proxy.id))
        .execute();

      expect(updatedProxy[0].public_ip).toBeNull();
      expect(updatedProxy[0].status).toBe('offline');
      expect(updatedProxy[0].updated_at).toBeInstanceOf(Date);
      expect(updatedProxy[0].updated_at > proxy.updated_at).toBe(true);
    });

    it('should handle non-existent proxy ID', async () => {
      const input: IpResetInput = { proxy_id: 999 };

      const result = await resetProxyIp(input);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(result.affected_proxies).toBe(0);
    });

    it('should reset offline proxy', async () => {
      const proxy = await createTestProxy({
        status: 'offline',
        public_ip: '203.0.113.2'
      });
      const input: IpResetInput = { proxy_id: proxy.id };

      const result = await resetProxyIp(input);

      expect(result.success).toBe(true);
      expect(result.affected_proxies).toBe(1);

      // Verify database changes
      const updatedProxy = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, proxy.id))
        .execute();

      expect(updatedProxy[0].public_ip).toBeNull();
      expect(updatedProxy[0].status).toBe('offline');
    });
  });

  describe('reset all proxies', () => {
    it('should reset all online proxies when no proxy_id provided', async () => {
      // Create multiple proxies with different statuses
      const onlineProxy1 = await createTestProxy({
        device_name: 'Online Device 1',
        status: 'online',
        public_ip: '203.0.113.1'
      });

      const onlineProxy2 = await createTestProxy({
        device_name: 'Online Device 2',
        status: 'online',
        public_ip: '203.0.113.2'
      });

      const offlineProxy = await createTestProxy({
        device_name: 'Offline Device',
        status: 'offline',
        public_ip: '203.0.113.3'
      });

      const input: IpResetInput = {};

      const result = await resetProxyIp(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('all online proxies');
      expect(result.affected_proxies).toBe(2);

      // Verify only online proxies were affected
      const updatedOnline1 = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, onlineProxy1.id))
        .execute();

      const updatedOnline2 = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, onlineProxy2.id))
        .execute();

      const updatedOffline = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, offlineProxy.id))
        .execute();

      // Online proxies should be reset
      expect(updatedOnline1[0].public_ip).toBeNull();
      expect(updatedOnline1[0].status).toBe('offline');

      expect(updatedOnline2[0].public_ip).toBeNull();
      expect(updatedOnline2[0].status).toBe('offline');

      // Offline proxy should remain unchanged
      expect(updatedOffline[0].public_ip).toBe('203.0.113.3');
      expect(updatedOffline[0].status).toBe('offline');
    });

    it('should handle case when no online proxies exist', async () => {
      // Create only offline proxies
      await createTestProxy({
        device_name: 'Offline Device 1',
        status: 'offline'
      });

      await createTestProxy({
        device_name: 'Offline Device 2',
        status: 'offline'
      });

      const input: IpResetInput = {};

      const result = await resetProxyIp(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No online proxies found');
      expect(result.affected_proxies).toBe(0);
    });

    it('should handle empty database', async () => {
      const input: IpResetInput = {};

      const result = await resetProxyIp(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No online proxies found');
      expect(result.affected_proxies).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle proxy with null public_ip', async () => {
      const proxy = await createTestProxy({
        status: 'online',
        public_ip: null
      });
      const input: IpResetInput = { proxy_id: proxy.id };

      const result = await resetProxyIp(input);

      expect(result.success).toBe(true);
      expect(result.affected_proxies).toBe(1);

      // Verify database changes
      const updatedProxy = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, proxy.id))
        .execute();

      expect(updatedProxy[0].public_ip).toBeNull();
      expect(updatedProxy[0].status).toBe('offline');
    });

    it('should update timestamps correctly', async () => {
      const proxy = await createTestProxy();
      const originalTimestamp = proxy.updated_at;
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const input: IpResetInput = { proxy_id: proxy.id };

      await resetProxyIp(input);

      const updatedProxy = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, proxy.id))
        .execute();

      expect(updatedProxy[0].updated_at).toBeInstanceOf(Date);
      expect(updatedProxy[0].updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });
  });
});