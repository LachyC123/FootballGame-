/**
 * Save model + pure migrations (docs/05 §7). Storage I/O lives in
 * src/platform/saveStore.ts — this module must stay pure and unit-testable.
 */
export const CURRENT_SCHEMA_VERSION = 1;

export interface SaveV1 {
  schemaVersion: 1;
  buildVersion: string;
  updatedAt: number;
  flags: string[];
  counters: Record<string, number>;
  trust: Record<string, number>;
  promises: Record<string, 'kept' | 'broken'>;
  stats: Record<string, number>;
  lineup: string[];
  inventory: string[];
  equipped: Record<string, string>;
  shells: number;
  chapter: number;
}

export type Save = SaveV1;

export function createDefaultSave(buildVersion: string, now: number): Save {
  return {
    schemaVersion: 1,
    buildVersion,
    updatedAt: now,
    flags: [],
    counters: {},
    trust: {},
    promises: {},
    stats: { pace: 5, power: 5, touch: 5, guard: 4, engine: 5 },
    lineup: ['chr_ash'],
    inventory: [],
    equipped: {},
    shells: 0,
    chapter: 1,
  };
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * migrations[n] upgrades a save FROM schemaVersion n TO n+1. Forward one
 * version at a time (Master Plan persistence contract). Keep fixtures under
 * tests/ for every shipped version.
 */
const migrations: Record<number, Migration> = {
  // Example shape for the future:
  // 1: (raw) => ({ ...raw, schemaVersion: 2, newField: defaultValue }),
};

export class SaveMigrationError extends Error {}

export function migrateSave(rawInput: unknown): Save {
  if (typeof rawInput !== 'object' || rawInput === null) {
    throw new SaveMigrationError('Save data is not an object');
  }
  let raw = rawInput as Record<string, unknown>;
  const initial = raw['schemaVersion'];
  if (typeof initial !== 'number' || !Number.isInteger(initial) || initial < 1) {
    throw new SaveMigrationError(`Invalid schemaVersion: ${String(initial)}`);
  }
  if (initial > CURRENT_SCHEMA_VERSION) {
    throw new SaveMigrationError(
      `Save schemaVersion ${initial} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
    );
  }
  let version: number = initial;
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) {
      throw new SaveMigrationError(`No migration from schemaVersion ${version}`);
    }
    raw = step(raw);
    const next = raw['schemaVersion'];
    if (typeof next !== 'number' || next !== version + 1) {
      throw new SaveMigrationError(`Migration from ${version} produced schemaVersion ${String(next)}`);
    }
    version = next;
  }
  if (!isValidSave(raw)) {
    throw new SaveMigrationError('Save failed validation after migration');
  }
  return raw;
}

export function isValidSave(input: unknown): input is Save {
  if (typeof input !== 'object' || input === null) return false;
  const raw = input as Record<string, unknown>;
  return (
    raw['schemaVersion'] === CURRENT_SCHEMA_VERSION &&
    typeof raw['buildVersion'] === 'string' &&
    typeof raw['updatedAt'] === 'number' &&
    Array.isArray(raw['flags']) &&
    typeof raw['counters'] === 'object' &&
    raw['counters'] !== null &&
    typeof raw['trust'] === 'object' &&
    raw['trust'] !== null &&
    typeof raw['promises'] === 'object' &&
    raw['promises'] !== null &&
    typeof raw['stats'] === 'object' &&
    raw['stats'] !== null &&
    Array.isArray(raw['lineup']) &&
    Array.isArray(raw['inventory']) &&
    typeof raw['equipped'] === 'object' &&
    raw['equipped'] !== null &&
    typeof raw['shells'] === 'number' &&
    typeof raw['chapter'] === 'number'
  );
}
