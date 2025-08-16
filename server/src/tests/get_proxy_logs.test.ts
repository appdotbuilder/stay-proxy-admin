import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxiesTable, proxyLogsTable } from '../db/schema';
import { getProxyLogs } from '../handlers/get_proxy_logs';

describe('getProxyLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no logs exist', async () => {
    const result = await getProxyLogs();
    expect(result).toEqual([]);
  });

  it('should fetch proxy logs with default pagination', async () => {
    // Create a proxy first
    const [proxy] = await db.insert(proxiesTable)
      .values({
        device_name: 'Test Device',
        internal_ip: '192.168.1.100',
        public_ip: '203.0.113.1',
        port: 3128,
        username: 'testuser',
        password: 'testpass',
        status: 'online'
      })
      .returning()
      .execute();

    // Create proxy logs with slight delay to ensure different created_at times
    const [firstLog] = await db.insert(proxyLogsTable)
      .values({
        proxy_id: proxy.id,
        client_ip: '192.168.1.50',
        login_time: new Date('2024-01-01T10:00:00Z'),
        logout_time: new Date('2024-01-01T11:00:00Z'),
        bytes_transferred: 1024000
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [secondLog] = await db.insert(proxyLogsTable)
      .values({
        proxy_id: proxy.id,
        client_ip: '192.168.1.51',
        login_time: new Date('2024-01-01T12:00:00Z'),
        logout_time: null,
        bytes_transferred: 512000
      })
      .returning()
      .execute();

    const result = await getProxyLogs();

    expect(result).toHaveLength(2);
    
    // Check that results are ordered by created_at DESC (most recent first)
    expect(result[0].client_ip).toEqual('192.168.1.51');
    expect(result[1].client_ip).toEqual('192.168.1.50');
    
    // Verify all fields are present and correct
    expect(result[0].proxy_id).toEqual(proxy.id);
    expect(result[0].login_time).toEqual(new Date('2024-01-01T12:00:00Z'));
    expect(result[0].logout_time).toBeNull();
    expect(result[0].bytes_transferred).toEqual(512000);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should support custom limit and offset parameters', async () => {
    // Create a proxy
    const [proxy] = await db.insert(proxiesTable)
      .values({
        device_name: 'Test Device',
        internal_ip: '192.168.1.100',
        port: 3128,
        username: 'testuser',
        password: 'testpass'
      })
      .returning()
      .execute();

    // Create multiple logs
    const testLogs = [];
    for (let i = 0; i < 5; i++) {
      testLogs.push({
        proxy_id: proxy.id,
        client_ip: `192.168.1.${50 + i}`,
        login_time: new Date(`2024-01-0${i + 1}T10:00:00Z`),
        logout_time: new Date(`2024-01-0${i + 1}T11:00:00Z`),
        bytes_transferred: 1000 * (i + 1)
      });
    }

    await db.insert(proxyLogsTable)
      .values(testLogs)
      .execute();

    // Test limit
    const limitedResult = await getProxyLogs(2);
    expect(limitedResult).toHaveLength(2);

    // Test offset
    const offsetResult = await getProxyLogs(2, 2);
    expect(offsetResult).toHaveLength(2);
    
    // Verify different results due to offset
    expect(limitedResult[0].client_ip).not.toEqual(offsetResult[0].client_ip);
  });

  it('should handle logs with null logout_time', async () => {
    // Create a proxy
    const [proxy] = await db.insert(proxiesTable)
      .values({
        device_name: 'Test Device',
        internal_ip: '192.168.1.100',
        port: 3128,
        username: 'testuser',
        password: 'testpass'
      })
      .returning()
      .execute();

    // Create log with active session (null logout_time)
    await db.insert(proxyLogsTable)
      .values({
        proxy_id: proxy.id,
        client_ip: '192.168.1.50',
        login_time: new Date('2024-01-01T10:00:00Z'),
        logout_time: null,
        bytes_transferred: 0
      })
      .execute();

    const result = await getProxyLogs();

    expect(result).toHaveLength(1);
    expect(result[0].logout_time).toBeNull();
    expect(result[0].bytes_transferred).toEqual(0);
  });

  it('should only return logs for existing proxies', async () => {
    // Create a proxy
    const [proxy] = await db.insert(proxiesTable)
      .values({
        device_name: 'Test Device',
        internal_ip: '192.168.1.100',
        port: 3128,
        username: 'testuser',
        password: 'testpass'
      })
      .returning()
      .execute();

    // Create log for existing proxy
    await db.insert(proxyLogsTable)
      .values({
        proxy_id: proxy.id,
        client_ip: '192.168.1.50',
        login_time: new Date('2024-01-01T10:00:00Z'),
        logout_time: null,
        bytes_transferred: 1000
      })
      .execute();

    // Should only return logs for valid proxies
    const result = await getProxyLogs();
    expect(result).toHaveLength(1);
    expect(result[0].proxy_id).toEqual(proxy.id);
    expect(result[0].client_ip).toEqual('192.168.1.50');
    expect(result[0].bytes_transferred).toEqual(1000);
  });


  it('should only return logs with valid proxy joins', async () => {
    // Create two proxies
    const [proxy1] = await db.insert(proxiesTable)
      .values({
        device_name: 'Proxy One',
        internal_ip: '192.168.1.100',
        port: 3128,
        username: 'user1',
        password: 'pass1'
      })
      .returning()
      .execute();

    const [proxy2] = await db.insert(proxiesTable)
      .values({
        device_name: 'Proxy Two',
        internal_ip: '192.168.1.101',
        port: 3129,
        username: 'user2',
        password: 'pass2'
      })
      .returning()
      .execute();

    // Create logs for both proxies
    await db.insert(proxyLogsTable)
      .values([
        {
          proxy_id: proxy1.id,
          client_ip: '192.168.1.50',
          login_time: new Date('2024-01-01T10:00:00Z'),
          logout_time: null,
          bytes_transferred: 1000
        },
        {
          proxy_id: proxy2.id,
          client_ip: '192.168.1.51',
          login_time: new Date('2024-01-01T11:00:00Z'),
          logout_time: new Date('2024-01-01T12:00:00Z'),
          bytes_transferred: 2000
        }
      ])
      .execute();

    const result = await getProxyLogs();

    expect(result).toHaveLength(2);
    
    // Verify both logs are returned with correct proxy associations
    const proxyIds = result.map(log => log.proxy_id);
    expect(proxyIds).toContain(proxy1.id);
    expect(proxyIds).toContain(proxy2.id);

    // Verify log details
    const log1 = result.find(log => log.proxy_id === proxy1.id);
    const log2 = result.find(log => log.proxy_id === proxy2.id);

    expect(log1).toBeDefined();
    expect(log1!.client_ip).toEqual('192.168.1.50');
    expect(log1!.bytes_transferred).toEqual(1000);

    expect(log2).toBeDefined();
    expect(log2!.client_ip).toEqual('192.168.1.51');
    expect(log2!.bytes_transferred).toEqual(2000);
  });

  it('should handle large byte transfer values correctly', async () => {
    // Create a proxy
    const [proxy] = await db.insert(proxiesTable)
      .values({
        device_name: 'Test Device',
        internal_ip: '192.168.1.100',
        port: 3128,
        username: 'testuser',
        password: 'testpass'
      })
      .returning()
      .execute();

    // Create log with large byte transfer
    const largeByteTransfer = 1073741824; // 1 GB
    await db.insert(proxyLogsTable)
      .values({
        proxy_id: proxy.id,
        client_ip: '192.168.1.50',
        login_time: new Date('2024-01-01T10:00:00Z'),
        logout_time: new Date('2024-01-01T11:00:00Z'),
        bytes_transferred: largeByteTransfer
      })
      .execute();

    const result = await getProxyLogs();

    expect(result).toHaveLength(1);
    expect(result[0].bytes_transferred).toEqual(largeByteTransfer);
    expect(typeof result[0].bytes_transferred).toEqual('number');
  });
});