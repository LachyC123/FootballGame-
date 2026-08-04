import {
  createDefaultSave,
  migrateSave,
  SaveMigrationError,
  type Save,
} from '../domain/progress/save';

/**
 * IndexedDB save store (docs/05 §7). Atomic commit keeps the previous snapshot
 * until the new one is written; corrupt data is quarantined, never destroyed.
 * Pure save logic lives in src/domain/progress/save.ts.
 */
const DB_NAME = 'solport';
const DB_VERSION = 1;
const STORE = 'saves';
const KEY_CURRENT = 'current';
const KEY_PREVIOUS = 'previous';
const KEY_QUARANTINE = 'quarantine';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function get(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
  });
}

function putMany(db: IDBDatabase, entries: Array<[string, unknown]>): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const [key, value] of entries) store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
}

export type LoadResult =
  | { kind: 'loaded'; save: Save }
  | { kind: 'fresh'; save: Save }
  | { kind: 'recovered'; save: Save };

/** Load the save, migrating forward; corrupt current falls back to previous. */
export async function loadSave(buildVersion: string): Promise<LoadResult> {
  const db = await openDb();
  try {
    const current = await get(db, KEY_CURRENT);
    if (current === undefined) {
      return { kind: 'fresh', save: createDefaultSave(buildVersion, Date.now()) };
    }
    try {
      return { kind: 'loaded', save: migrateSave(current) };
    } catch (err) {
      if (!(err instanceof SaveMigrationError)) throw err;
      // Quarantine the corrupt record for diagnostics, try the previous snapshot.
      await putMany(db, [[KEY_QUARANTINE, current]]);
      const previous = await get(db, KEY_PREVIOUS);
      if (previous !== undefined) {
        try {
          return { kind: 'recovered', save: migrateSave(previous) };
        } catch {
          // fall through to fresh
        }
      }
      return { kind: 'fresh', save: createDefaultSave(buildVersion, Date.now()) };
    }
  } finally {
    db.close();
  }
}

/** Atomic commit: current snapshot rotates into `previous` in one transaction. */
export async function commitSave(save: Save): Promise<void> {
  const db = await openDb();
  try {
    const current = await get(db, KEY_CURRENT);
    const entries: Array<[string, unknown]> = [[KEY_CURRENT, save]];
    if (current !== undefined) entries.push([KEY_PREVIOUS, current]);
    await putMany(db, entries);
  } finally {
    db.close();
  }
}
