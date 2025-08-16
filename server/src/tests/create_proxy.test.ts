import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { type CreateProxyInput } from '../schema';
import { createProxy } from '../handlers/create_proxy';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateProxyInput = {
  device_name: 'Test Proxy Device',
  internal_ip: '192.168.1.100',
  port: 8080,
  username: 'testuser',
  password: 'testpass123'
};

const anotherTestInput: CreateProxyInput = {
  device_name: 'Another Test Device',
  internal_ip: '10.0.0.50',
  port: 3128,
  username: 'proxyuser',
  password: 'securepass456'
};

describe('createProxy', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a proxy with correct fields', async () => {
    const result = await createProxy(testInput);

    // Verify all fields are set correctly
    expect(result.device_name).toEqual('Test Proxy Device');
    expect(result.port).toEqual(8080);
    expect(result.username).toEqual('testuser');
    expect(result.password).toEqual('testpass123');
    expect(result.status).toEqual('offline');
    expect(result.public_ip).toEqual(''); // Should be empty string initially
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save proxy to database including internal_ip', async () => {
    const result = await createProxy(testInput);

    // Query database to verify record was saved
    const proxies = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, result.id))
      .execute();

    expect(proxies).toHaveLength(1);
    const savedProxy = proxies[0];
    
    expect(savedProxy.device_name).toEqual('Test Proxy Device');
    expect(savedProxy.internal_ip).toEqual('192.168.1.100'); // Should be saved in DB
    expect(savedProxy.port).toEqual(8080);
    expect(savedProxy.username).toEqual('testuser');
    expect(savedProxy.password).toEqual('testpass123');
    expect(savedProxy.status).toEqual('offline');
    expect(savedProxy.public_ip).toBeNull(); // Should be null in database
    expect(savedProxy.created_at).toBeInstanceOf(Date);
    expect(savedProxy.updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple proxies with unique IDs', async () => {
    const firstProxy = await createProxy(testInput);
    const secondProxy = await createProxy(anotherTestInput);

    // Verify both proxies have different IDs
    expect(firstProxy.id).not.toEqual(secondProxy.id);
    expect(firstProxy.device_name).toEqual('Test Proxy Device');
    expect(secondProxy.device_name).toEqual('Another Test Device');
    expect(secondProxy.port).toEqual(3128);
    expect(secondProxy.username).toEqual('proxyuser');
  });

  it('should set default status to offline', async () => {
    const result = await createProxy(testInput);
    expect(result.status).toEqual('offline');
  });

  it('should set public_ip to null in database but return empty string', async () => {
    const result = await createProxy(testInput);

    // Result should have empty string for public_ip
    expect(result.public_ip).toEqual('');

    // But database should store null
    const proxies = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, result.id))
      .execute();

    expect(proxies[0].public_ip).toBeNull();
  });

  it('should handle different port numbers correctly', async () => {
    const highPortInput: CreateProxyInput = {
      device_name: 'High Port Device',
      internal_ip: '172.16.0.10',
      port: 65535,
      username: 'highport',
      password: 'password123'
    };

    const result = await createProxy(highPortInput);
    expect(result.port).toEqual(65535);
    expect(typeof result.port).toEqual('number');

    // Verify internal_ip was saved to database
    const proxies = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, result.id))
      .execute();

    expect(proxies[0].internal_ip).toEqual('172.16.0.10');
  });

  it('should preserve all input data in created proxy', async () => {
    const complexInput: CreateProxyInput = {
      device_name: 'Complex Device Name with Spaces & Symbols!',
      internal_ip: '203.0.113.42',
      port: 1080,
      username: 'user_with_underscores',
      password: 'P@ssw0rd!WithSymbols'
    };

    const result = await createProxy(complexInput);
    
    expect(result.device_name).toEqual(complexInput.device_name);
    expect(result.port).toEqual(complexInput.port);
    expect(result.username).toEqual(complexInput.username);
    expect(result.password).toEqual(complexInput.password);

    // Verify internal_ip is stored in database even though not returned
    const proxies = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.id, result.id))
      .execute();

    expect(proxies[0].internal_ip).toEqual(complexInput.internal_ip);
  });

  it('should handle various valid IP addresses', async () => {
    const ipTestCases = [
      { internal_ip: '192.168.1.1', description: 'private class C' },
      { internal_ip: '10.0.0.1', description: 'private class A' },
      { internal_ip: '172.16.0.1', description: 'private class B' },
      { internal_ip: '127.0.0.1', description: 'localhost' }
    ];

    for (const testCase of ipTestCases) {
      const input: CreateProxyInput = {
        device_name: `Device for ${testCase.description}`,
        internal_ip: testCase.internal_ip,
        port: 8080,
        username: 'testuser',
        password: 'testpass'
      };

      const result = await createProxy(input);
      expect(result.id).toBeDefined();
      expect(result.device_name).toEqual(input.device_name);

      // Verify internal_ip was saved correctly
      const proxies = await db.select()
        .from(proxiesTable)
        .where(eq(proxiesTable.id, result.id))
        .execute();

      expect(proxies[0].internal_ip).toEqual(testCase.internal_ip);
    }
  });
});