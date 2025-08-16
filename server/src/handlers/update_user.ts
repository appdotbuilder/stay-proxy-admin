import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

// Simple password hashing function using crypto
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // First, verify the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with ID ${input.id} not found`);
    }

    // Prepare update values - only include fields that are provided
    const updateValues: any = {};
    
    if (input.username !== undefined) {
      updateValues.username = input.username;
    }
    
    if (input.password !== undefined) {
      updateValues.password = hashPassword(input.password);
    }
    
    if (input.access_level !== undefined) {
      updateValues.access_level = input.access_level;
    }

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // If no fields to update (besides updated_at), just return the existing user
    if (Object.keys(updateValues).length === 1) {
      return existingUser[0];
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Failed to update user with ID ${input.id}`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};