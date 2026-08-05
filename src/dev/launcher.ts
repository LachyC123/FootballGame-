/**
 * Dev scene launcher (docs/05 §10): ?scene=<key>&seed=<n> jumps straight to a
 * scene in dev builds. Stripped from production by the DEV guard.
 */
const KNOWN_SCENES = new Set(['Boot', 'Preload', 'Title', 'Match', 'Hub']);

export function getStartOverride(): {
  scene: string;
  seed: number;
  district?: string;
  arena?: string;
} | null {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(location.search);
  const scene = params.get('scene');
  if (scene === null || !KNOWN_SCENES.has(scene)) return null;
  const seed = Number(params.get('seed') ?? '1');
  const district = params.get('district');
  const arena = params.get('arena');
  const out: { scene: string; seed: number; district?: string; arena?: string } = {
    scene,
    seed: Number.isFinite(seed) ? seed : 1,
  };
  if (district) out.district = district;
  if (arena) out.arena = arena;
  return out;
}
