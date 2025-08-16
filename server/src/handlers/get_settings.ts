import { db } from '../db';
import { settingsTable } from '../db/schema';
import { type Settings } from '../schema';

export const getSettings = async (): Promise<Settings[]> => {
  try {
    // Fetch all settings from the database
    const result = await db.select()
      .from(settingsTable)
      .execute();

    // Return settings - no numeric conversions needed as all fields are text/integers
    return result;
  } catch (error) {
    console.error('Settings retrieval failed:', error);
    throw error;
  }
};