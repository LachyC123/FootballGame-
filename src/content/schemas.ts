/**
 * Content validation (docs/05 §6). Hand-rolled (no runtime dependency) —
 * validators throw ContentError with a path so CI failures are actionable.
 * Runs at boot (dev) and in CI over every shipped JSON file.
 */
export class ContentError extends Error {
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function req<T>(obj: Record<string, unknown>, key: string, check: (v: unknown) => v is T, path: string): T {
  const v = obj[key];
  if (!check(v)) throw new ContentError(`${path}.${key}`, `missing or invalid`);
  return v;
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isUnit(v: unknown): v is number {
  return isNumber(v) && v >= 0 && v <= 1;
}

export interface TeamData {
  id: string;
  name: string;
  crewName: string;
  players: Array<{ characterId: string; stats: Record<string, number> }>;
  aiProfile: Record<string, number>;
  reactionMs: number;
}

const STAT_KEYS = ['pace', 'power', 'touch', 'guard', 'engine'] as const;
const AI_KEYS = ['press', 'line', 'tempo', 'risk', 'phys', 'show', 'wall', 'stam'] as const;

export function validateTeam(raw: unknown, path: string): TeamData {
  if (!isRecord(raw)) throw new ContentError(path, 'team must be an object');
  const id = req(raw, 'id', isString, path);
  if (!/^team_[a-z0-9_]+$/.test(id)) throw new ContentError(`${path}.id`, `bad id format: ${id}`);
  const name = req(raw, 'name', isString, path);
  const crewName = req(raw, 'crewName', isString, path);
  const playersRaw = raw['players'];
  if (!Array.isArray(playersRaw) || playersRaw.length < 3 || playersRaw.length > 5) {
    throw new ContentError(`${path}.players`, 'must be an array of 3..5 players');
  }
  const players = playersRaw.map((p, i) => {
    const ppath = `${path}.players[${i}]`;
    if (!isRecord(p)) throw new ContentError(ppath, 'player must be an object');
    const characterId = req(p, 'characterId', isString, ppath);
    if (!/^chr_[a-z0-9_]+$/.test(characterId)) {
      throw new ContentError(`${ppath}.characterId`, `bad id format: ${characterId}`);
    }
    const stats = p['stats'];
    if (!isRecord(stats)) throw new ContentError(`${ppath}.stats`, 'missing stats');
    for (const key of STAT_KEYS) {
      const v = stats[key];
      if (!isNumber(v) || v < 1 || v > 10) {
        throw new ContentError(`${ppath}.stats.${key}`, 'must be a number 1..10');
      }
    }
    return { characterId, stats: stats as Record<string, number> };
  });
  const aiProfile = raw['aiProfile'];
  if (!isRecord(aiProfile)) throw new ContentError(`${path}.aiProfile`, 'missing aiProfile');
  for (const key of AI_KEYS) {
    if (!isUnit(aiProfile[key])) {
      throw new ContentError(`${path}.aiProfile.${key}`, 'must be a number 0..1');
    }
  }
  const reactionMs = req(raw, 'reactionMs', isNumber, path);
  if (reactionMs < 50 || reactionMs > 1000) {
    throw new ContentError(`${path}.reactionMs`, 'must be 50..1000');
  }
  return { id, name, crewName, players, aiProfile: aiProfile as Record<string, number>, reactionMs };
}

export function validateTeams(raw: unknown): TeamData[] {
  if (!Array.isArray(raw)) throw new ContentError('teams', 'must be an array');
  const teams = raw.map((t, i) => validateTeam(t, `teams[${i}]`));
  const ids = new Set<string>();
  for (const t of teams) {
    if (ids.has(t.id)) throw new ContentError('teams', `duplicate id ${t.id}`);
    ids.add(t.id);
  }
  return teams;
}

export function validateStrings(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) throw new ContentError('strings', 'must be an object');
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[a-z0-9]+(\.[a-z0-9_]+)+$/.test(key)) {
      throw new ContentError(`strings.${key}`, 'keys must be dot-namespaced lowercase');
    }
    if (typeof value !== 'string') {
      throw new ContentError(`strings.${key}`, 'value must be a string');
    }
  }
  return raw as Record<string, string>;
}
