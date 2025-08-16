import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { settingsTable } from '../db/schema';
import { getSettings } from '../handlers/get_settings';

describe('getSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no settings exist', async () => {
    const result = await getSettings();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch all settings from database', async () => {
    // Create test settings
    await db.insert(settingsTable)
      .values([
        {
          key: 'max_user_limit',
          value: '100',
          description: 'Maximum number of concurrent users'
        },
        {
          key: 'session_timeout',
          value: '3600',
          description: 'Session timeout in seconds'
        },
        {
          key: 'auto_reset_interval',
          value: '86400',
          description: 'Auto IP reset interval in seconds'
        }
      ])
      .execute();

    const result = await getSettings();

    expect(result).toHaveLength(3);
    
    // Verify all settings are returned
    const keys = result.map(setting => setting.key);
    expect(keys).toContain('max_user_limit');
    expect(keys).toContain('session_timeout');
    expect(keys).toContain('auto_reset_interval');
  });

  it('should return settings with correct structure', async () => {
    // Create a single test setting
    await db.insert(settingsTable)
      .values({
        key: 'test_setting',
        value: '42',
        description: 'A test configuration setting'
      })
      .execute();

    const result = await getSettings();

    expect(result).toHaveLength(1);
    
    const setting = result[0];
    expect(setting.id).toBeDefined();
    expect(typeof setting.id).toBe('number');
    expect(setting.key).toBe('test_setting');
    expect(setting.value).toBe('42');
    expect(setting.description).toBe('A test configuration setting');
    expect(setting.created_at).toBeInstanceOf(Date);
    expect(setting.updated_at).toBeInstanceOf(Date);
  });

  it('should handle settings with null descriptions', async () => {
    // Create setting without description
    await db.insert(settingsTable)
      .values({
        key: 'minimal_setting',
        value: 'test_value',
        description: null
      })
      .execute();

    const result = await getSettings();

    expect(result).toHaveLength(1);
    
    const setting = result[0];
    expect(setting.key).toBe('minimal_setting');
    expect(setting.value).toBe('test_value');
    expect(setting.description).toBeNull();
  });

  it('should return settings in database order', async () => {
    // Create multiple settings in specific order
    const testSettings = [
      { key: 'setting_alpha', value: '1', description: 'First setting' },
      { key: 'setting_beta', value: '2', description: 'Second setting' },
      { key: 'setting_gamma', value: '3', description: 'Third setting' }
    ];

    for (const setting of testSettings) {
      await db.insert(settingsTable)
        .values(setting)
        .execute();
    }

    const result = await getSettings();

    expect(result).toHaveLength(3);
    
    // Verify settings are returned (order may vary based on database)
    const resultKeys = result.map(s => s.key);
    expect(resultKeys).toContain('setting_alpha');
    expect(resultKeys).toContain('setting_beta');
    expect(resultKeys).toContain('setting_gamma');
    
    // Verify all values are strings as expected
    result.forEach(setting => {
      expect(typeof setting.value).toBe('string');
      expect(typeof setting.key).toBe('string');
    });
  });

  it('should handle large number of settings', async () => {
    // Create many settings to test performance
    const manySettings = Array.from({ length: 50 }, (_, i) => ({
      key: `setting_${i.toString().padStart(3, '0')}`,
      value: `value_${i}`,
      description: `Test setting number ${i}`
    }));

    await db.insert(settingsTable)
      .values(manySettings)
      .execute();

    const result = await getSettings();

    expect(result).toHaveLength(50);
    
    // Verify each setting has correct structure
    result.forEach(setting => {
      expect(setting.id).toBeDefined();
      expect(setting.key).toMatch(/^setting_\d{3}$/);
      expect(setting.value).toMatch(/^value_\d+$/);
      expect(setting.description).toMatch(/^Test setting number \d+$/);
      expect(setting.created_at).toBeInstanceOf(Date);
      expect(setting.updated_at).toBeInstanceOf(Date);
    });
  });
});