import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultSave,
  isValidSave,
  migrateSave,
  SaveMigrationError,
} from '../../src/domain/progress/save';

describe('save model', () => {
  it('default save is valid at the current schema version', () => {
    const save = createDefaultSave('0.1.0', 1000);
    expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(isValidSave(save)).toBe(true);
  });

  it('migrating a current-version save is the identity', () => {
    const save = createDefaultSave('0.1.0', 1000);
    expect(migrateSave(save)).toEqual(save);
  });

  it('rejects saves newer than the supported schema', () => {
    const save = { ...createDefaultSave('0.1.0', 1000), schemaVersion: 99 };
    expect(() => migrateSave(save)).toThrow(SaveMigrationError);
  });

  it('rejects non-object and versionless data', () => {
    expect(() => migrateSave(null)).toThrow(SaveMigrationError);
    expect(() => migrateSave('junk')).toThrow(SaveMigrationError);
    expect(() => migrateSave({})).toThrow(SaveMigrationError);
    expect(() => migrateSave({ schemaVersion: 0 })).toThrow(SaveMigrationError);
  });

  it('rejects a structurally invalid save at the current version', () => {
    expect(() => migrateSave({ schemaVersion: 1, shells: 'lots' })).toThrow(SaveMigrationError);
  });
});
