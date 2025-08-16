import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { type UpdateProxyStatusInput } from '../schema';
import { updateProxyStatus } from '../handlers/update_proxy_status';
import { eq } from 'drizzle-orm';

describe('updateProxyStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProxyId: number;

  beforeEach(async () => {
    // Create a test proxy
    const result = await db.insert(proxiesTable)
      .values({
        device_name: 'Test Device',
        internal_ip: '192.168.1.100',
        public_ip: '203.0.113.1',
        port: 8080,
        username: 'testuser',
        password: 'testpass',
        status: 'offline'
      })
      .returning()
      .execute();

    testProxyId = result[0].id;
  });

  it('should update proxy status from offline to online', async () => {
    const input: UpdateProxyStatusInput = {
      id: testProxyId,
      status: 'online'
    };

    const result = await updateProxyStatus(input);

    expect(result.id).toEqual(testProxyId);
    expect(result.status).toEqual('online');
    expect(result.device_name).toEqual('Test Device');
    expect(result.public_ip).toEqual('203.0.113.1');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update proxy status from online to offline', async () => {
    // First set proxy to online
    await db.update(proxiesTable)
      .set({ status: 'online' })
      .where(eq(proxiesTable.id, testProxyId))
      .execute();

    const input: UpdateProxyStatusInput = {
      id: testProxyId,
      status: 'offline'
    };

    const result = await updateProxyStatus(input);

    expect(result.id).toEqual(testProxyId);
    expect(result.status).toEqual('offline');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update public IP address', async () => {
    const newPublicIp = '198.51.100.42';
    const input: UpdateProxyStatusInput = {
      id: testProxyId,
      public_ip: newPublicIp
    };

    const result = await updateProxyStatus(input);

    expect(result.id).toEqual(testProxyId);
    expect(result.public_ip).toEqual(newPublicIp);
    expect(result.status).toEqual('offline'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both status and public IP simultaneously', async () => {
    const newPublicIp = '198.51.100.50';
    const input: UpdateProxyStatusInput = {
      id: testProxyId,
      status: 'online',
      public_ip: newPublicIp
    };

    const result = await updateProxyStatus(input);

    expect(result.id).toEqual(testProxyId);
    expect(result.status).toEqual('online');
    expect(result.public_ip).toEqual(newPublicIp);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only the updated_at timestamp when no fields are provided', async () => {
    const originalProxy = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, testProxyId))
      .execute();

    const input: UpdateProxyStatusInput = {
      id: testProxyId
    };

    const result = await updateProxyStatus(input);

    expect(result.id).toEqual(testProxyId);
    expect(result.status).toEqual(originalProxy[0].status);
    expect(result.public_ip).toEqual(originalProxy[0].public_ip);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalProxy[0].updated_at).toBe(true);
  });

  it('should save updated proxy to database', async () => {
    const input: UpdateProxyStatusInput = {
      id: testProxyId,
      status: 'online',
      public_ip: '203.0.113.99'
    };

    await updateProxyStatus(input);

    // Verify database was updated
    const proxies = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, testProxyId))
      .execute();

    expect(proxies).toHaveLength(1);
    expect(proxies[0].status).toEqual('online');
    expect(proxies[0].public_ip).toEqual('203.0.113.99');
    expect(proxies[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when proxy does not exist', async () => {
    const nonExistentId = 99999;
    const input: UpdateProxyStatusInput = {
      id: nonExistentId,
      status: 'online'
    };

    await expect(updateProxyStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should preserve other proxy fields when updating', async () => {
    const input: UpdateProxyStatusInput = {
      id: testProxyId,
      status: 'online'
    };

    const result = await updateProxyStatus(input);

    // Verify all original fields are preserved
    expect(result.device_name).toEqual('Test Device');
    expect(result.internal_ip).toEqual('192.168.1.100');
    expect(result.port).toEqual(8080);
    expect(result.username).toEqual('testuser');
    expect(result.password).toEqual('testpass');
    expect(result.created_at).toBeInstanceOf(Date);
  });
});