import { db } from '../db';
import { settingsTable } from '../db/schema';
import { type UpdateSettingsInput, type Settings } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSettings = async (input: UpdateSettingsInput): Promise<Settings> => {
  try {
    // First, try to update an existing setting
    const updateResult = await db.update(settingsTable)
      .set({
        value: input.value,
        description: input.description ?? null, // Explicitly set to null if undefined
        updated_at: new Date()
      })
      .where(eq(settingsTable.key, input.key))
      .returning()
      .execute();

    // If a record was updated, return it
    if (updateResult.length > 0) {
      return updateResult[0];
    }

    // If no record was updated, create a new one
    const insertResult = await db.insert(settingsTable)
      .values({
        key: input.key,
        value: input.value,
        description: input.description
      })
      .returning()
      .execute();

    return insertResult[0];
  } catch (error) {
    console.error('Settings update failed:', error);
    throw error;
  }
};