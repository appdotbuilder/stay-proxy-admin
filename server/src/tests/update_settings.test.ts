import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { settingsTable } from '../db/schema';
import { type UpdateSettingsInput } from '../schema';
import { updateSettings } from '../handlers/update_settings';
import { eq } from 'drizzle-orm';

const testInput: UpdateSettingsInput = {
  key: 'test_setting',
  value: 'test_value',
  description: 'A test setting'
};

describe('updateSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new setting when key does not exist', async () => {
    const result = await updateSettings(testInput);

    // Basic field validation
    expect(result.key).toEqual('test_setting');
    expect(result.value).toEqual('test_value');
    expect(result.description).toEqual('A test setting');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save new setting to database', async () => {
    const result = await updateSettings(testInput);

    // Query using proper drizzle syntax
    const settings = await db.select()
      .from(settingsTable)
      .where(eq(settingsTable.id, result.id))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].key).toEqual('test_setting');
    expect(settings[0].value).toEqual('test_value');
    expect(settings[0].description).toEqual('A test setting');
    expect(settings[0].created_at).toBeInstanceOf(Date);
    expect(settings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update existing setting when key exists', async () => {
    // First, create a setting
    const initialResult = await updateSettings(testInput);

    // Then update it with new value
    const updateInput: UpdateSettingsInput = {
      key: 'test_setting',
      value: 'updated_value',
      description: 'Updated description'
    };

    const updatedResult = await updateSettings(updateInput);

    // Should be the same ID but updated values
    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.key).toEqual('test_setting');
    expect(updatedResult.value).toEqual('updated_value');
    expect(updatedResult.description).toEqual('Updated description');
    expect(updatedResult.created_at).toEqual(initialResult.created_at);
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(initialResult.updated_at.getTime());
  });

  it('should verify only one record exists after update', async () => {
    // Create initial setting
    await updateSettings(testInput);

    // Update the same setting
    const updateInput: UpdateSettingsInput = {
      key: 'test_setting',
      value: 'updated_value'
    };

    await updateSettings(updateInput);

    // Verify only one record exists with this key
    const settings = await db.select()
      .from(settingsTable)
      .where(eq(settingsTable.key, 'test_setting'))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].value).toEqual('updated_value');
  });

  it('should handle null description', async () => {
    const inputWithoutDescription: UpdateSettingsInput = {
      key: 'no_desc_setting',
      value: 'some_value'
    };

    const result = await updateSettings(inputWithoutDescription);

    expect(result.key).toEqual('no_desc_setting');
    expect(result.value).toEqual('some_value');
    expect(result.description).toBeNull();
  });

  it('should update description to null when not provided', async () => {
    // First create setting with description
    await updateSettings(testInput);

    // Then update without description
    const updateInput: UpdateSettingsInput = {
      key: 'test_setting',
      value: 'updated_value'
    };

    const result = await updateSettings(updateInput);

    expect(result.key).toEqual('test_setting');
    expect(result.value).toEqual('updated_value');
    expect(result.description).toBeNull(); // Should be explicitly set to null when not provided
  });

  it('should handle multiple different settings', async () => {
    const setting1: UpdateSettingsInput = {
      key: 'setting1',
      value: 'value1',
      description: 'First setting'
    };

    const setting2: UpdateSettingsInput = {
      key: 'setting2',
      value: 'value2',
      description: 'Second setting'
    };

    const result1 = await updateSettings(setting1);
    const result2 = await updateSettings(setting2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.key).toEqual('setting1');
    expect(result2.key).toEqual('setting2');

    // Verify both exist in database
    const allSettings = await db.select()
      .from(settingsTable)
      .execute();

    expect(allSettings).toHaveLength(2);
  });

  it('should preserve timestamps correctly on update', async () => {
    // Create initial setting
    const initialResult = await updateSettings(testInput);
    const initialCreatedAt = initialResult.created_at;
    const initialUpdatedAt = initialResult.updated_at;

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the setting
    const updateInput: UpdateSettingsInput = {
      key: 'test_setting',
      value: 'new_value'
    };

    const updatedResult = await updateSettings(updateInput);

    // created_at should remain the same, updated_at should be newer
    expect(updatedResult.created_at).toEqual(initialCreatedAt);
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });
});