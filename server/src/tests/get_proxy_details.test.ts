import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { getProxyDetails } from '../handlers/get_proxy_details';
import { eq } from 'drizzle-orm';

// Test proxy data
const testProxy = {
  device_name: 'Test Device',
  internal_ip: '192.168.1.100',
  public_ip: '203.0.113.1',
  port: 8080,
  username: 'test_user',
  password: 'test_password',
  status: 'online' as const,
};

const testProxyNoPublicIp = {
  device_name: 'Offline Device',
  internal_ip: '192.168.1.101',
  public_ip: null, // No public IP
  port: 8081,
  username: 'offline_user',
  password: 'offline_password',
  status: 'offline' as const,
};

describe('getProxyDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return proxy details for existing proxy with public IP', async () => {
    // Insert test proxy
    const [insertedProxy] = await db.insert(proxiesTable)
      .values(testProxy)
      .returning()
      .execute();

    // Get proxy details
    const result = await getProxyDetails(insertedProxy.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.public_ip).toEqual('203.0.113.1');
    expect(result!.port).toEqual(8080);
    expect(result!.username).toEqual('test_user');
    expect(result!.password).toEqual('test_password');
  });

  it('should return null for non-existent proxy', async () => {
    // Try to get details for non-existent proxy
    const result = await getProxyDetails(999);

    // Should return null
    expect(result).toBeNull();
  });

  it('should return null for proxy without public IP', async () => {
    // Insert proxy without public IP
    const [insertedProxy] = await db.insert(proxiesTable)
      .values(testProxyNoPublicIp)
      .returning()
      .execute();

    // Get proxy details
    const result = await getProxyDetails(insertedProxy.id);

    // Should return null because no public IP
    expect(result).toBeNull();
  });

  it('should handle proxy with empty string public IP as null', async () => {
    // Insert proxy with empty string public IP
    const [insertedProxy] = await db.insert(proxiesTable)
      .values({
        ...testProxy,
        public_ip: '', // Empty string
      })
      .returning()
      .execute();

    // Get proxy details
    const result = await getProxyDetails(insertedProxy.id);

    // Should return null for empty string public IP
    expect(result).toBeNull();
  });

  it('should return correct details for multiple proxies', async () => {
    // Insert multiple test proxies
    const [proxy1, proxy2] = await db.insert(proxiesTable)
      .values([
        {
          ...testProxy,
          device_name: 'Device 1',
          public_ip: '203.0.113.10',
          port: 8080,
          username: 'user1',
          password: 'pass1',
        },
        {
          ...testProxy,
          device_name: 'Device 2',
          public_ip: '203.0.113.20',
          port: 8081,
          username: 'user2',
          password: 'pass2',
        }
      ])
      .returning()
      .execute();

    // Get details for first proxy
    const result1 = await getProxyDetails(proxy1.id);
    expect(result1).not.toBeNull();
    expect(result1!.public_ip).toEqual('203.0.113.10');
    expect(result1!.port).toEqual(8080);
    expect(result1!.username).toEqual('user1');
    expect(result1!.password).toEqual('pass1');

    // Get details for second proxy
    const result2 = await getProxyDetails(proxy2.id);
    expect(result2).not.toBeNull();
    expect(result2!.public_ip).toEqual('203.0.113.20');
    expect(result2!.port).toEqual(8081);
    expect(result2!.username).toEqual('user2');
    expect(result2!.password).toEqual('pass2');
  });

  it('should verify proxy details are saved correctly in database', async () => {
    // Insert test proxy
    const [insertedProxy] = await db.insert(proxiesTable)
      .values(testProxy)
      .returning()
      .execute();

    // Verify data was saved correctly in database
    const dbProxy = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, insertedProxy.id))
      .execute();

    expect(dbProxy).toHaveLength(1);
    expect(dbProxy[0].public_ip).toEqual('203.0.113.1');
    expect(dbProxy[0].port).toEqual(8080);
    expect(dbProxy[0].username).toEqual('test_user');
    expect(dbProxy[0].password).toEqual('test_password');

    // Get details via handler
    const result = await getProxyDetails(insertedProxy.id);
    expect(result).not.toBeNull();

    // Verify handler returns same data as stored in DB
    expect(result!.public_ip).toEqual(dbProxy[0].public_ip!); // We know it's not null since result is not null
    expect(result!.port).toEqual(dbProxy[0].port);
    expect(result!.username).toEqual(dbProxy[0].username);
    expect(result!.password).toEqual(dbProxy[0].password);
  });
});