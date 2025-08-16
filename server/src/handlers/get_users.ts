import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    // Return users as-is since no numeric conversions needed for this table
    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}