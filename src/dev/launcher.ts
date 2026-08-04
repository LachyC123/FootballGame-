/**
 * Dev scene launcher (docs/05 §10): ?scene=<key>&seed=<n> jumps straight to a
 * scene in dev builds. Stripped from production by the DEV guard.
 */
const KNOWN_SCENES = new Set(['Boot', 'Preload', 'Title', 'Match', 'Hub']);

export function getStartOverride(): { scene: string; seed: number } | null {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(location.search);
  const scene = params.get('scene');
  if (scene === null || !KNOWN_SCENES.has(scene)) return null;
  const seed = Number(params.get('seed') ?? '1');
  return { scene, seed: Number.isFinite(seed) ? seed : 1 };
}
