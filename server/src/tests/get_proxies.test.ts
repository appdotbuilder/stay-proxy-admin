import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { getProxies } from '../handlers/get_proxies';
import { eq } from 'drizzle-orm';

describe('getProxies', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no proxies exist', async () => {
    const result = await getProxies();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all proxies when they exist', async () => {
    // Create test proxies
    const testProxies = [
      {
        device_name: 'Test Device 1',
        internal_ip: '192.168.1.100',
        public_ip: '203.0.113.1',
        port: 8080,
        username: 'user1',
        password: 'pass1',
        status: 'online' as const
      },
      {
        device_name: 'Test Device 2',
        internal_ip: '192.168.1.101',
        public_ip: '203.0.113.2',
        port: 8081,
        username: 'user2',
        password: 'pass2',
        status: 'offline' as const
      }
    ];

    // Insert test proxies
    await db.insert(proxiesTable)
      .values(testProxies)
      .execute();

    const result = await getProxies();

    expect(result).toHaveLength(2);

    // Verify first proxy
    const proxy1 = result.find(p => p.device_name === 'Test Device 1');
    expect(proxy1).toBeDefined();
    expect(proxy1!.device_name).toEqual('Test Device 1');
    expect(proxy1!.public_ip).toEqual('203.0.113.1');
    expect(proxy1!.port).toEqual(8080);
    expect(proxy1!.username).toEqual('user1');
    expect(proxy1!.password).toEqual('pass1');
    expect(proxy1!.status).toEqual('online');
    expect(proxy1!.id).toBeDefined();
    expect(proxy1!.created_at).toBeInstanceOf(Date);
    expect(proxy1!.updated_at).toBeInstanceOf(Date);

    // Verify second proxy
    const proxy2 = result.find(p => p.device_name === 'Test Device 2');
    expect(proxy2).toBeDefined();
    expect(proxy2!.device_name).toEqual('Test Device 2');
    expect(proxy2!.public_ip).toEqual('203.0.113.2');
    expect(proxy2!.port).toEqual(8081);
    expect(proxy2!.username).toEqual('user2');
    expect(proxy2!.password).toEqual('pass2');
    expect(proxy2!.status).toEqual('offline');
    expect(proxy2!.id).toBeDefined();
    expect(proxy2!.created_at).toBeInstanceOf(Date);
    expect(proxy2!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle proxies with null public_ip', async () => {
    // Create test proxy without public IP
    const testProxy = {
      device_name: 'Test Device No IP',
      internal_ip: '192.168.1.102',
      public_ip: null,
      port: 8082,
      username: 'user3',
      password: 'pass3',
      status: 'offline' as const
    };

    await db.insert(proxiesTable)
      .values(testProxy)
      .execute();

    const result = await getProxies();

    expect(result).toHaveLength(1);
    const proxy = result[0];
    expect(proxy.device_name).toEqual('Test Device No IP');
    expect(proxy.public_ip).toEqual(''); // Should be converted to empty string
    expect(proxy.port).toEqual(8082);
    expect(proxy.status).toEqual('offline');
  });

  it('should return proxies in database insertion order', async () => {
    // Create multiple test proxies
    const testProxies = [
      {
        device_name: 'First Device',
        internal_ip: '192.168.1.100',
        public_ip: '203.0.113.1',
        port: 8080,
        username: 'first',
        password: 'pass1',
        status: 'online' as const
      },
      {
        device_name: 'Second Device',
        internal_ip: '192.168.1.101',
        public_ip: '203.0.113.2',
        port: 8081,
        username: 'second',
        password: 'pass2',
        status: 'offline' as const
      },
      {
        device_name: 'Third Device',
        internal_ip: '192.168.1.102',
        public_ip: '203.0.113.3',
        port: 8082,
        username: 'third',
        password: 'pass3',
        status: 'online' as const
      }
    ];

    await db.insert(proxiesTable)
      .values(testProxies)
      .execute();

    const result = await getProxies();

    expect(result).toHaveLength(3);
    expect(result[0].device_name).toEqual('First Device');
    expect(result[1].device_name).toEqual('Second Device');
    expect(result[2].device_name).toEqual('Third Device');
  });

  it('should verify data is actually stored in database', async () => {
    // Create test proxy
    const testProxy = {
      device_name: 'Database Test Device',
      internal_ip: '192.168.1.200',
      public_ip: '203.0.113.200',
      port: 9000,
      username: 'dbuser',
      password: 'dbpass',
      status: 'online' as const
    };

    await db.insert(proxiesTable)
      .values(testProxy)
      .execute();

    // Call handler
    const result = await getProxies();

    // Verify data exists in database independently
    const dbProxies = await db.select()
      .from(proxiesTable)
      .where(eq(proxiesTable.device_name, 'Database Test Device'))
      .execute();

    expect(dbProxies).toHaveLength(1);
    expect(result).toHaveLength(1);
    
    // Verify handler result matches database record
    const handlerProxy = result[0];
    const dbProxy = dbProxies[0];
    
    expect(handlerProxy.id).toEqual(dbProxy.id);
    expect(handlerProxy.device_name).toEqual(dbProxy.device_name);
    expect(handlerProxy.public_ip).toEqual(dbProxy.public_ip || '');
    expect(handlerProxy.port).toEqual(dbProxy.port);
    expect(handlerProxy.username).toEqual(dbProxy.username);
    expect(handlerProxy.password).toEqual(dbProxy.password);
    expect(handlerProxy.status).toEqual(dbProxy.status);
  });

  it('should handle mixed proxy statuses correctly', async () => {
    // Create proxies with different statuses
    const testProxies = [
      {
        device_name: 'Online Device 1',
        internal_ip: '192.168.1.100',
        public_ip: '203.0.113.1',
        port: 8080,
        username: 'online1',
        password: 'pass1',
        status: 'online' as const
      },
      {
        device_name: 'Online Device 2',
        internal_ip: '192.168.1.101',
        public_ip: '203.0.113.2',
        port: 8081,
        username: 'online2',
        password: 'pass2',
        status: 'online' as const
      },
      {
        device_name: 'Offline Device 1',
        internal_ip: '192.168.1.102',
        public_ip: null,
        port: 8082,
        username: 'offline1',
        password: 'pass3',
        status: 'offline' as const
      },
      {
        device_name: 'Offline Device 2',
        internal_ip: '192.168.1.103',
        public_ip: null,
        port: 8083,
        username: 'offline2',
        password: 'pass4',
        status: 'offline' as const
      }
    ];

    await db.insert(proxiesTable)
      .values(testProxies)
      .execute();

    const result = await getProxies();

    expect(result).toHaveLength(4);
    
    const onlineProxies = result.filter(p => p.status === 'online');
    const offlineProxies = result.filter(p => p.status === 'offline');
    
    expect(onlineProxies).toHaveLength(2);
    expect(offlineProxies).toHaveLength(2);
    
    // Verify online proxies have public IPs
    onlineProxies.forEach(proxy => {
      expect(proxy.public_ip).not.toEqual('');
      expect(proxy.public_ip).toBeTruthy();
    });
    
    // Verify offline proxies have empty public IPs (converted from null)
    offlineProxies.forEach(proxy => {
      expect(proxy.public_ip).toEqual('');
    });
  });
});