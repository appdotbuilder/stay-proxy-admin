import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteUser = async (userId: number): Promise<{ success: boolean; message: string }> => {
  try {
    // First check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (existingUser.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Delete the user
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      return {
        success: false,
        message: 'Failed to delete user'
      };
    }

    return {
      success: true,
      message: 'User deleted successfully'
    };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};