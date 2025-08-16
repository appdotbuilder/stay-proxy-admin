import { db } from '../db';
import { proxiesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateProxyStatusInput } from '../schema';
import { type Proxy as DBProxy } from '../db/schema';

export const updateProxyStatus = async (input: UpdateProxyStatusInput): Promise<DBProxy> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<{
      status: 'online' | 'offline';
      public_ip: string | null;
      updated_at: Date;
    }> = {
      updated_at: new Date(),
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.public_ip !== undefined) {
      updateData.public_ip = input.public_ip;
    }

    // Update proxy record
    const result = await db
      .update(proxiesTable)
      .set(updateData)
      .where(eq(proxiesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Proxy with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Proxy status update failed:', error);
    throw error;
  }
};