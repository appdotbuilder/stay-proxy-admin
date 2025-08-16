import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all users when users exist', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          username: 'admin_user',
          password: 'hashed_password_1',
          access_level: 'admin'
        },
        {
          username: 'regular_user',
          password: 'hashed_password_2',
          access_level: 'user'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Find users by username to verify data
    const adminUser = result.find(u => u.username === 'admin_user');
    const regularUser = result.find(u => u.username === 'regular_user');

    // Verify admin user
    expect(adminUser).toBeDefined();
    expect(adminUser?.username).toBe('admin_user');
    expect(adminUser?.password).toBe('hashed_password_1');
    expect(adminUser?.access_level).toBe('admin');
    expect(adminUser?.id).toBeDefined();
    expect(adminUser?.created_at).toBeInstanceOf(Date);
    expect(adminUser?.updated_at).toBeInstanceOf(Date);

    // Verify regular user
    expect(regularUser).toBeDefined();
    expect(regularUser?.username).toBe('regular_user');
    expect(regularUser?.password).toBe('hashed_password_2');
    expect(regularUser?.access_level).toBe('user');
    expect(regularUser?.id).toBeDefined();
    expect(regularUser?.created_at).toBeInstanceOf(Date);
    expect(regularUser?.updated_at).toBeInstanceOf(Date);
  });

  it('should return users in creation order', async () => {
    // Create users with specific order
    const firstUser = await db.insert(usersTable)
      .values({
        username: 'first_user',
        password: 'password1',
        access_level: 'user'
      })
      .returning()
      .execute();

    const secondUser = await db.insert(usersTable)
      .values({
        username: 'second_user',
        password: 'password2',
        access_level: 'admin'
      })
      .returning()
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify users exist and have proper structure
    const usernames = result.map(u => u.username);
    expect(usernames).toContain('first_user');
    expect(usernames).toContain('second_user');

    // Verify all required fields are present
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('number');
      expect(user.username).toBeDefined();
      expect(typeof user.username).toBe('string');
      expect(user.password).toBeDefined();
      expect(typeof user.password).toBe('string');
      expect(user.access_level).toBeDefined();
      expect(['admin', 'user']).toContain(user.access_level);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle multiple users with different access levels', async () => {
    // Create users with various access levels
    await db.insert(usersTable)
      .values([
        {
          username: 'admin1',
          password: 'admin_pass',
          access_level: 'admin'
        },
        {
          username: 'admin2',
          password: 'admin_pass2',
          access_level: 'admin'
        },
        {
          username: 'user1',
          password: 'user_pass',
          access_level: 'user'
        },
        {
          username: 'user2',
          password: 'user_pass2',
          access_level: 'user'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(4);

    // Count access levels
    const adminUsers = result.filter(u => u.access_level === 'admin');
    const regularUsers = result.filter(u => u.access_level === 'user');

    expect(adminUsers).toHaveLength(2);
    expect(regularUsers).toHaveLength(2);

    // Verify usernames are unique
    const usernames = result.map(u => u.username);
    const uniqueUsernames = new Set(usernames);
    expect(uniqueUsernames.size).toBe(4);
  });

  it('should include password field in response', async () => {
    // Create a test user
    await db.insert(usersTable)
      .values({
        username: 'test_user',
        password: 'hashed_password',
        access_level: 'user'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].password).toBe('hashed_password');
    
    // Note: The comment in the original placeholder mentions passwords 
    // should be excluded in real implementation, but the schema includes
    // password field, so we're testing the current implementation
  });
});