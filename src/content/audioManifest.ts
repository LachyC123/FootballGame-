/**
 * SFX family → variant files (docs/06 §8 variant-pool rule).
 * Sources: Kenney Impact/Interface Sounds (CC0) — provenance in docs/07 §5.
 * Files live in public/assets/audio/.
 */
export const SFX_FAMILIES: Record<string, string[]> = {
  pass: ['impactSoft_medium_000', 'impactSoft_medium_001', 'impactSoft_medium_002', 'impactSoft_medium_003', 'impactSoft_medium_004'],
  shot: ['impactPunch_heavy_000', 'impactPunch_heavy_001', 'impactPunch_heavy_002', 'impactPunch_heavy_003', 'impactPunch_heavy_004'],
  wall: ['impactMetal_light_000', 'impactMetal_light_001', 'impactMetal_light_002', 'impactMetal_light_003', 'impactMetal_light_004'],
  post: ['impactMetal_heavy_000', 'impactMetal_heavy_001', 'impactMetal_heavy_002'],
  tackle: ['impactSoft_heavy_000', 'impactSoft_heavy_001', 'impactSoft_heavy_002', 'impactSoft_heavy_003', 'impactSoft_heavy_004'],
  shoulder: ['impactPunch_medium_000', 'impactPunch_medium_001', 'impactPunch_medium_002'],
  bell: ['impactBell_heavy_000', 'impactBell_heavy_001', 'impactBell_heavy_002'],
  step: ['footstep_concrete_000', 'footstep_concrete_001', 'footstep_concrete_002', 'footstep_concrete_003', 'footstep_concrete_004'],
  uiClick: ['click_001', 'click_002', 'click_003'],
  uiConfirm: ['confirmation_001', 'confirmation_002'],
  uiSelect: ['select_001', 'select_002'],
};

export function allSfxEntries(): Array<{ key: string; url: string }> {
  const out: Array<{ key: string; url: string }> = [];
  for (const files of Object.values(SFX_FAMILIES)) {
    for (const name of files) {
      out.push({ key: name, url: `assets/audio/${name}.ogg` });
    }
  }
  return out;
}
