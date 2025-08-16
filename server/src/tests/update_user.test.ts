import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

// Helper function to create a test user
const createTestUser = async (userData: CreateUserInput) => {
  const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
  
  const result = await db.insert(usersTable)
    .values({
      username: userData.username,
      password: hashedPassword,
      access_level: userData.access_level
    })
    .returning()
    .execute();
    
  return result[0];
};

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  access_level: 'user'
};

const adminUser: CreateUserInput = {
  username: 'admin',
  password: 'adminpass',
  access_level: 'admin'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update username only', async () => {
    const createdUser = await createTestUser(testUser);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'updateduser'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual('updateduser');
    expect(result.password).toEqual(createdUser.password); // Password should remain unchanged
    expect(result.access_level).toEqual(createdUser.access_level);
    expect(result.created_at).toEqual(createdUser.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update password only', async () => {
    const createdUser = await createTestUser(testUser);
    const originalPassword = createdUser.password;
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      password: 'newpassword123'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(createdUser.username);
    expect(result.password).not.toEqual(originalPassword); // Password should be changed
    expect(result.password).toEqual(crypto.createHash('sha256').update('newpassword123').digest('hex'));
    expect(result.access_level).toEqual(createdUser.access_level);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update access level only', async () => {
    const createdUser = await createTestUser(testUser);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      access_level: 'admin'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(createdUser.username);
    expect(result.password).toEqual(createdUser.password);
    expect(result.access_level).toEqual('admin');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const createdUser = await createTestUser(testUser);
    const originalPassword = createdUser.password;
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'newusername',
      password: 'newpassword456',
      access_level: 'admin'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual('newusername');
    expect(result.password).not.toEqual(originalPassword);
    expect(result.password).toEqual(crypto.createHash('sha256').update('newpassword456').digest('hex'));
    expect(result.access_level).toEqual('admin');
    expect(result.created_at).toEqual(createdUser.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should save changes to database', async () => {
    const createdUser = await createTestUser(testUser);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'dbtest'
    };

    const result = await updateUser(updateInput);

    // Verify in database
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].username).toEqual('dbtest');
    expect(dbUsers[0].password).toEqual(createdUser.password);
    expect(dbUsers[0].access_level).toEqual(createdUser.access_level);
    expect(dbUsers[0].updated_at).toBeInstanceOf(Date);
    expect(dbUsers[0].updated_at > createdUser.updated_at).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      username: 'nonexistent'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const createdUser = await createTestUser(adminUser);
    
    // Update only password
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      password: 'partialupdate'
    };

    const result = await updateUser(updateInput);

    expect(result.username).toEqual(createdUser.username); // Should remain unchanged
    expect(result.access_level).toEqual(createdUser.access_level); // Should remain unchanged
    expect(result.password).toEqual(crypto.createHash('sha256').update('partialupdate').digest('hex'));
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should return existing user when no fields are provided for update', async () => {
    const createdUser = await createTestUser(testUser);
    
    const updateInput: UpdateUserInput = {
      id: createdUser.id
    };

    const result = await updateUser(updateInput);

    // Should return the exact same data since no fields were updated
    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(createdUser.username);
    expect(result.password).toEqual(createdUser.password);
    expect(result.access_level).toEqual(createdUser.access_level);
    expect(result.created_at).toEqual(createdUser.created_at);
    // updated_at might be the same since no actual update occurred
    expect(result.updated_at).toEqual(createdUser.updated_at);
  });

  it('should handle username uniqueness constraint', async () => {
    // Create two users
    const user1 = await createTestUser(testUser);
    const user2 = await createTestUser({
      username: 'user2',
      password: 'password456',
      access_level: 'user'
    });
    
    // Try to update user2 to have the same username as user1
    const updateInput: UpdateUserInput = {
      id: user2.id,
      username: user1.username // This should cause a unique constraint violation
    };

    expect(updateUser(updateInput)).rejects.toThrow();
  });
});