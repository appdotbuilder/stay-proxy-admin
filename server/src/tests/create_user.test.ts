import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateUserInput = {
  username: 'testuser',
  password: 'testpass123',
  access_level: 'user'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.password).toEqual('testpass123');
    expect(result.access_level).toEqual('user');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].password).toEqual('testpass123');
    expect(users[0].access_level).toEqual('user');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create admin user', async () => {
    const adminInput: CreateUserInput = {
      username: 'admin',
      password: 'adminpass',
      access_level: 'admin'
    };

    const result = await createUser(adminInput);

    expect(result.username).toEqual('admin');
    expect(result.access_level).toEqual('admin');
  });

  it('should handle unique username constraint violation', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create another user with the same username
    await expect(createUser(testInput)).rejects.toThrow(/duplicate/i);
  });

  it('should create multiple users with different usernames', async () => {
    const user1Input: CreateUserInput = {
      username: 'user1',
      password: 'password1',
      access_level: 'user'
    };

    const user2Input: CreateUserInput = {
      username: 'user2',
      password: 'password2',
      access_level: 'admin'
    };

    const result1 = await createUser(user1Input);
    const result2 = await createUser(user2Input);

    expect(result1.username).toEqual('user1');
    expect(result1.access_level).toEqual('user');
    expect(result2.username).toEqual('user2');
    expect(result2.access_level).toEqual('admin');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});