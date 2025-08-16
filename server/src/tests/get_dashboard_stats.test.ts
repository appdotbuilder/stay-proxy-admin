import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxiesTable, usersTable, proxyLogsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no data exists', async () => {
    const result = await getDashboardStats();

    expect(result.active_proxies).toEqual(0);
    expect(result.total_proxies).toEqual(0);
    expect(result.online_proxies).toEqual(0);
    expect(result.offline_proxies).toEqual(0);
    expect(result.total_users).toEqual(0);
    expect(result.recent_logs).toEqual([]);
  });

  it('should correctly count proxy statistics', async () => {
    // Create test proxies with different statuses
    await db.insert(proxiesTable).values([
      {
        device_name: 'Proxy 1',
        internal_ip: '192.168.1.1',
        public_ip: '1.1.1.1',
        port: 8080,
        username: 'user1',
        password: 'pass1',
        status: 'online',
      },
      {
        device_name: 'Proxy 2',
        internal_ip: '192.168.1.2',
        public_ip: '2.2.2.2',
        port: 8081,
        username: 'user2',
        password: 'pass2',
        status: 'online',
      },
      {
        device_name: 'Proxy 3',
        internal_ip: '192.168.1.3',
        port: 8082,
        username: 'user3',
        password: 'pass3',
        status: 'offline',
      },
    ]).execute();

    const result = await getDashboardStats();

    expect(result.total_proxies).toEqual(3);
    expect(result.online_proxies).toEqual(2);
    expect(result.offline_proxies).toEqual(1);
    expect(result.active_proxies).toEqual(2); // Same as online_proxies
  });

  it('should correctly count users', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        username: 'admin',
        password: 'hashedpass1',
        access_level: 'admin',
      },
      {
        username: 'user1',
        password: 'hashedpass2',
        access_level: 'user',
      },
      {
        username: 'user2',
        password: 'hashedpass3',
        access_level: 'user',
      },
    ]).execute();

    const result = await getDashboardStats();

    expect(result.total_users).toEqual(3);
  });

  it('should return recent logs in correct order', async () => {
    // Create a test proxy first
    const proxyResult = await db.insert(proxiesTable).values({
      device_name: 'Test Proxy',
      internal_ip: '192.168.1.1',
      public_ip: '1.1.1.1',
      port: 8080,
      username: 'testuser',
      password: 'testpass',
      status: 'online',
    }).returning().execute();

    const proxyId = proxyResult[0].id;

    // Create test logs one by one with delays to ensure different created_at timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert first log
    await db.insert(proxyLogsTable).values({
      proxy_id: proxyId,
      client_ip: '10.0.0.1',
      login_time: twoHoursAgo,
      logout_time: oneHourAgo,
      bytes_transferred: 1000,
    }).execute();

    // Small delay to ensure different created_at
    await new Promise(resolve => setTimeout(resolve, 10));

    // Insert second log
    await db.insert(proxyLogsTable).values({
      proxy_id: proxyId,
      client_ip: '10.0.0.2',
      login_time: oneHourAgo,
      logout_time: null,
      bytes_transferred: 2000,
    }).execute();

    // Small delay to ensure different created_at
    await new Promise(resolve => setTimeout(resolve, 10));

    // Insert third log
    await db.insert(proxyLogsTable).values({
      proxy_id: proxyId,
      client_ip: '10.0.0.3',
      login_time: now,
      logout_time: null,
      bytes_transferred: 500,
    }).execute();

    const result = await getDashboardStats();

    expect(result.recent_logs).toHaveLength(3);
    
    // Check that logs are ordered by created_at descending (most recent first)
    const logs = result.recent_logs;
    expect(logs[0].client_ip).toEqual('10.0.0.3'); // Most recent
    expect(logs[1].client_ip).toEqual('10.0.0.2'); // Second most recent
    expect(logs[2].client_ip).toEqual('10.0.0.1'); // Oldest

    // Verify log properties
    logs.forEach(log => {
      expect(log.id).toBeDefined();
      expect(log.proxy_id).toEqual(proxyId);
      expect(log.login_time).toBeInstanceOf(Date);
      expect(log.created_at).toBeInstanceOf(Date);
      expect(typeof log.bytes_transferred).toBe('number');
    });
  });

  it('should limit recent logs to 10 entries', async () => {
    // Create a test proxy
    const proxyResult = await db.insert(proxiesTable).values({
      device_name: 'Test Proxy',
      internal_ip: '192.168.1.1',
      port: 8080,
      username: 'testuser',
      password: 'testpass',
      status: 'online',
    }).returning().execute();

    const proxyId = proxyResult[0].id;

    // Create 15 test logs
    const logsData = Array.from({ length: 15 }, (_, i) => ({
      proxy_id: proxyId,
      client_ip: `10.0.0.${i + 1}`,
      login_time: new Date(Date.now() - i * 1000), // Each log 1 second apart
      bytes_transferred: 100 * (i + 1),
    }));

    await db.insert(proxyLogsTable).values(logsData).execute();

    const result = await getDashboardStats();

    expect(result.recent_logs).toHaveLength(10);
    
    // Verify it returns the 10 most recent logs
    expect(result.recent_logs[0].client_ip).toEqual('10.0.0.1'); // Most recent
    expect(result.recent_logs[9].client_ip).toEqual('10.0.0.10'); // 10th most recent
  });

  it('should work correctly with mixed data', async () => {
    // Create comprehensive test data
    
    // Create users
    await db.insert(usersTable).values([
      { username: 'admin', password: 'pass1', access_level: 'admin' },
      { username: 'user1', password: 'pass2', access_level: 'user' },
    ]).execute();

    // Create proxies
    const proxyResult = await db.insert(proxiesTable).values([
      {
        device_name: 'Proxy 1',
        internal_ip: '192.168.1.1',
        public_ip: '1.1.1.1',
        port: 8080,
        username: 'user1',
        password: 'pass1',
        status: 'online',
      },
      {
        device_name: 'Proxy 2',
        internal_ip: '192.168.1.2',
        port: 8081,
        username: 'user2',
        password: 'pass2',
        status: 'offline',
      },
    ]).returning().execute();

    // Create logs for the first proxy
    await db.insert(proxyLogsTable).values([
      {
        proxy_id: proxyResult[0].id,
        client_ip: '10.0.0.1',
        login_time: new Date(),
        bytes_transferred: 1500,
      },
      {
        proxy_id: proxyResult[0].id,
        client_ip: '10.0.0.2',
        login_time: new Date(Date.now() - 60000), // 1 minute ago
        logout_time: new Date(),
        bytes_transferred: 2500,
      },
    ]).execute();

    const result = await getDashboardStats();

    // Verify all statistics
    expect(result.total_users).toEqual(2);
    expect(result.total_proxies).toEqual(2);
    expect(result.online_proxies).toEqual(1);
    expect(result.offline_proxies).toEqual(1);
    expect(result.active_proxies).toEqual(1);
    expect(result.recent_logs).toHaveLength(2);

    // Verify recent logs structure
    result.recent_logs.forEach(log => {
      expect(log.proxy_id).toBeDefined();
      expect(log.client_ip).toMatch(/^10\.0\.0\.[12]$/);
      expect(log.bytes_transferred).toBeGreaterThan(0);
      expect(log.login_time).toBeInstanceOf(Date);
      expect(log.created_at).toBeInstanceOf(Date);
    });
  });
});