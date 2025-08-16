import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxyLogsTable, proxiesTable } from '../db/schema';
import { type CreateProxyLogInput } from '../schema';
import { createProxyLog } from '../handlers/create_proxy_log';
import { eq } from 'drizzle-orm';

describe('createProxyLog', () => {
  let testProxyId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test proxy for our logs
    const proxyResult = await db.insert(proxiesTable)
      .values({
        device_name: 'Test Device',
        internal_ip: '192.168.1.100',
        public_ip: '203.0.113.1',
        port: 8080,
        username: 'testuser',
        password: 'testpass',
        status: 'online'
      })
      .returning()
      .execute();
    
    testProxyId = proxyResult[0].id;
  });

  afterEach(resetDB);

  it('should create a proxy log with all fields', async () => {
    const testInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '192.168.1.50',
      login_time: new Date('2024-01-15T10:30:00Z'),
      logout_time: new Date('2024-01-15T11:30:00Z'),
      bytes_transferred: 1048576
    };

    const result = await createProxyLog(testInput);

    // Verify all fields are correctly set
    expect(result.proxy_id).toEqual(testProxyId);
    expect(result.client_ip).toEqual('192.168.1.50');
    expect(result.login_time).toBeInstanceOf(Date);
    expect(result.logout_time).toBeInstanceOf(Date);
    expect(result.bytes_transferred).toEqual(1048576);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a proxy log with optional fields omitted', async () => {
    const testInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '192.168.1.75',
      login_time: new Date('2024-01-15T14:00:00Z'),
      bytes_transferred: 0 // Include the default value explicitly
      // logout_time is optional
    };

    const result = await createProxyLog(testInput);

    expect(result.proxy_id).toEqual(testProxyId);
    expect(result.client_ip).toEqual('192.168.1.75');
    expect(result.login_time).toBeInstanceOf(Date);
    expect(result.logout_time).toBeNull();
    expect(result.bytes_transferred).toEqual(0); // Default value
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a proxy log with logout_time as null', async () => {
    const testInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '10.0.0.25',
      login_time: new Date('2024-01-15T09:15:00Z'),
      logout_time: null,
      bytes_transferred: 500000
    };

    const result = await createProxyLog(testInput);

    expect(result.proxy_id).toEqual(testProxyId);
    expect(result.client_ip).toEqual('10.0.0.25');
    expect(result.logout_time).toBeNull();
    expect(result.bytes_transferred).toEqual(500000);
  });

  it('should save proxy log to database', async () => {
    const testInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '172.16.0.10',
      login_time: new Date('2024-01-15T16:45:00Z'),
      bytes_transferred: 2097152
    };

    const result = await createProxyLog(testInput);

    // Query the database to verify the log was saved
    const logs = await db.select()
      .from(proxyLogsTable)
      .where(eq(proxyLogsTable.id, result.id))
      .execute();

    expect(logs).toHaveLength(1);
    expect(logs[0].proxy_id).toEqual(testProxyId);
    expect(logs[0].client_ip).toEqual('172.16.0.10');
    expect(logs[0].login_time).toBeInstanceOf(Date);
    expect(logs[0].logout_time).toBeNull();
    expect(logs[0].bytes_transferred).toEqual(2097152);
    expect(logs[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple logs for the same proxy', async () => {
    const firstInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '192.168.1.100',
      login_time: new Date('2024-01-15T08:00:00Z'),
      bytes_transferred: 1000000
    };

    const secondInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '192.168.1.101',
      login_time: new Date('2024-01-15T09:00:00Z'),
      bytes_transferred: 2000000
    };

    const firstResult = await createProxyLog(firstInput);
    const secondResult = await createProxyLog(secondInput);

    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.proxy_id).toEqual(testProxyId);
    expect(secondResult.proxy_id).toEqual(testProxyId);
    expect(firstResult.client_ip).toEqual('192.168.1.100');
    expect(secondResult.client_ip).toEqual('192.168.1.101');

    // Verify both logs exist in database
    const allLogs = await db.select()
      .from(proxyLogsTable)
      .where(eq(proxyLogsTable.proxy_id, testProxyId))
      .execute();

    expect(allLogs).toHaveLength(2);
  });

  it('should throw error for non-existent proxy', async () => {
    const testInput: CreateProxyLogInput = {
      proxy_id: 99999, // Non-existent proxy ID
      client_ip: '192.168.1.200',
      login_time: new Date('2024-01-15T12:00:00Z'),
      bytes_transferred: 1024
    };

    await expect(createProxyLog(testInput)).rejects.toThrow(/Proxy with id 99999 does not exist/i);
  });

  it('should handle zero bytes transferred correctly', async () => {
    const testInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '203.0.113.50',
      login_time: new Date('2024-01-15T13:30:00Z'),
      bytes_transferred: 0
    };

    const result = await createProxyLog(testInput);

    expect(result.bytes_transferred).toEqual(0);
    expect(typeof result.bytes_transferred).toEqual('number');
  });

  it('should preserve exact login and logout times', async () => {
    const loginTime = new Date('2024-01-15T10:15:30.500Z');
    const logoutTime = new Date('2024-01-15T11:45:15.750Z');

    const testInput: CreateProxyLogInput = {
      proxy_id: testProxyId,
      client_ip: '198.51.100.25',
      login_time: loginTime,
      logout_time: logoutTime,
      bytes_transferred: 3145728
    };

    const result = await createProxyLog(testInput);

    // Verify timestamps are preserved with precision
    expect(result.login_time.getTime()).toEqual(loginTime.getTime());
    expect(result.logout_time?.getTime()).toEqual(logoutTime.getTime());
  });
});