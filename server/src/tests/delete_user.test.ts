import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { deleteUser } from '../handlers/delete_user';
import { eq } from 'drizzle-orm';

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete an existing user', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        access_level: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Delete the user
    const result = await deleteUser(userId);

    // Verify the response
    expect(result.success).toBe(true);
    expect(result.message).toBe('User deleted successfully');

    // Verify user is actually deleted from database
    const deletedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(deletedUser).toHaveLength(0);
  });

  it('should return error for non-existent user', async () => {
    const nonExistentId = 99999;

    const result = await deleteUser(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('User not found');
  });

  it('should handle multiple users correctly', async () => {
    // Create multiple test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          password: 'password123',
          access_level: 'user'
        },
        {
          username: 'user2',
          password: 'password456',
          access_level: 'admin'
        },
        {
          username: 'user3',
          password: 'password789',
          access_level: 'user'
        }
      ])
      .returning()
      .execute();

    const userToDeleteId = users[1].id; // Delete the admin user

    // Delete one user
    const result = await deleteUser(userToDeleteId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('User deleted successfully');

    // Verify only the targeted user was deleted
    const remainingUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(remainingUsers).toHaveLength(2);
    expect(remainingUsers.find(u => u.id === userToDeleteId)).toBeUndefined();
    expect(remainingUsers.find(u => u.username === 'user1')).toBeDefined();
    expect(remainingUsers.find(u => u.username === 'user3')).toBeDefined();
  });

  it('should delete admin users correctly', async () => {
    // Create an admin user
    const adminResult = await db.insert(usersTable)
      .values({
        username: 'admin',
        password: 'adminpass',
        access_level: 'admin'
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    // Delete the admin user
    const result = await deleteUser(adminId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('User deleted successfully');

    // Verify admin is deleted
    const deletedAdmin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminId))
      .execute();

    expect(deletedAdmin).toHaveLength(0);
  });

  it('should handle edge case with id 0', async () => {
    const result = await deleteUser(0);

    expect(result.success).toBe(false);
    expect(result.message).toBe('User not found');
  });

  it('should handle negative user ids', async () => {
    const result = await deleteUser(-1);

    expect(result.success).toBe(false);
    expect(result.message).toBe('User not found');
  });
});