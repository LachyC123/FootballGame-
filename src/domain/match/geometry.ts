import type { Vec2 } from './types';

/**
 * Pitch geometry (docs/03 §2): 480×270 world, single screen. Playable area
 * inside walls; goal recesses in left/right walls; 45° corner wedges so the
 * ball never dead-stops in a corner.
 */
export const PITCH = {
  width: 480,
  height: 270,
  minX: 16,
  maxX: 464,
  minY: 16,
  maxY: 254,
  centerX: 240,
  centerY: 135,
  goalHalf: 20, // mouth y ∈ [115, 155]
  goalDepth: 12,
  goalLineInset: 7, // ball centre beyond wall-x ± this = bell
  wedge: 20,
  postRadius: 2,
} as const;

export const GOAL_TOP = PITCH.centerY - PITCH.goalHalf;
export const GOAL_BOTTOM = PITCH.centerY + PITCH.goalHalf;

export function inMouthY(y: number, radius: number): boolean {
  return y > GOAL_TOP + radius && y < GOAL_BOTTOM - radius;
}

export function insideLeftRecess(p: Vec2): boolean {
  return p.x < PITCH.minX && p.y > GOAL_TOP && p.y < GOAL_BOTTOM;
}

export function insideRightRecess(p: Vec2): boolean {
  return p.x > PITCH.maxX && p.y > GOAL_TOP && p.y < GOAL_BOTTOM;
}

export interface WallHit {
  kind: 'wall' | 'wedge' | 'post';
  normal: Vec2;
}

/**
 * Collide a circle at pos/vel with walls, wedges, posts and goal recesses.
 * Mutates pos to the corrected position and returns the hit (or null).
 * Restitution is applied by the caller (ball vs player differ).
 */
export function collideCircle(pos: Vec2, vel: Vec2, radius: number): WallHit | null {
  const { minX, maxX, minY, maxY, wedge, goalDepth } = PITCH;

  // Corner wedges (45°) — checked first so corners never dead-stop.
  const w = wedge;
  // top-left: x + y >= minX + minY + w
  if (pos.x + pos.y < minX + minY + w + radius * Math.SQRT1_2 * 0 + radius) {
    const d = minX + minY + w + radius - (pos.x + pos.y);
    pos.x += d / 2;
    pos.y += d / 2;
    return { kind: 'wedge', normal: { x: Math.SQRT1_2, y: Math.SQRT1_2 } };
  }
  // top-right: (maxX - x) + y >= w  →  x - y <= maxX - minY - w
  if (pos.x - pos.y > maxX - minY - w - radius) {
    const d = pos.x - pos.y - (maxX - minY - w - radius);
    pos.x -= d / 2;
    pos.y += d / 2;
    return { kind: 'wedge', normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 } };
  }
  // bottom-left: y - x <= maxY - minX - w
  if (pos.y - pos.x > maxY - minX - w - radius) {
    const d = pos.y - pos.x - (maxY - minX - w - radius);
    pos.x += d / 2;
    pos.y -= d / 2;
    return { kind: 'wedge', normal: { x: Math.SQRT1_2, y: -Math.SQRT1_2 } };
  }
  // bottom-right: x + y <= maxX + maxY - w
  if (pos.x + pos.y > maxX + maxY - w - radius) {
    const d = pos.x + pos.y - (maxX + maxY - w - radius);
    pos.x -= d / 2;
    pos.y -= d / 2;
    return { kind: 'wedge', normal: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 } };
  }

  // Posts at the four mouth corners.
  for (const px of [minX, maxX]) {
    for (const py of [GOAL_TOP, GOAL_BOTTOM]) {
      const dx = pos.x - px;
      const dy = pos.y - py;
      const rr = radius + PITCH.postRadius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < rr * rr) {
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        pos.x = px + nx * rr;
        pos.y = py + ny * rr;
        return { kind: 'post', normal: { x: nx, y: ny } };
      }
    }
  }

  // Left wall / recess.
  if (pos.x < minX + radius) {
    if (pos.y > GOAL_TOP && pos.y < GOAL_BOTTOM) {
      // Inside mouth: recess side walls + back wall.
      if (pos.y < GOAL_TOP + radius) {
        pos.y = GOAL_TOP + radius;
        return { kind: 'wall', normal: { x: 0, y: 1 } };
      }
      if (pos.y > GOAL_BOTTOM - radius) {
        pos.y = GOAL_BOTTOM - radius;
        return { kind: 'wall', normal: { x: 0, y: -1 } };
      }
      const back = minX - goalDepth;
      if (pos.x < back + radius) {
        pos.x = back + radius;
        return { kind: 'wall', normal: { x: 1, y: 0 } };
      }
      return null; // free inside recess
    }
    pos.x = minX + radius;
    return { kind: 'wall', normal: { x: 1, y: 0 } };
  }

  // Right wall / recess (mirror).
  if (pos.x > maxX - radius) {
    if (pos.y > GOAL_TOP && pos.y < GOAL_BOTTOM) {
      if (pos.y < GOAL_TOP + radius) {
        pos.y = GOAL_TOP + radius;
        return { kind: 'wall', normal: { x: 0, y: 1 } };
      }
      if (pos.y > GOAL_BOTTOM - radius) {
        pos.y = GOAL_BOTTOM - radius;
        return { kind: 'wall', normal: { x: 0, y: -1 } };
      }
      const back = maxX + goalDepth;
      if (pos.x > back - radius) {
        pos.x = back - radius;
        return { kind: 'wall', normal: { x: -1, y: 0 } };
      }
      return null;
    }
    pos.x = maxX - radius;
    return { kind: 'wall', normal: { x: -1, y: 0 } };
  }

  // Top/bottom walls.
  if (pos.y < minY + radius) {
    pos.y = minY + radius;
    return { kind: 'wall', normal: { x: 0, y: 1 } };
  }
  if (pos.y > maxY - radius) {
    pos.y = maxY - radius;
    return { kind: 'wall', normal: { x: 0, y: -1 } };
  }
  return null;
}

export function reflect(vel: Vec2, normal: Vec2, restitution: number): void {
  // Reverse and damp only the normal component; tangential speed is preserved
  // (a ball rolling along a wall must not slow on contact).
  const dot = vel.x * normal.x + vel.y * normal.y;
  if (dot < 0) {
    vel.x -= (1 + restitution) * dot * normal.x;
    vel.y -= (1 + restitution) * dot * normal.y;
  }
}

/** Bell check: ball centre fully past the goal line inside a recess. */
export function goalScored(pos: Vec2): 0 | 1 | null {
  if (insideLeftRecess(pos) && pos.x < PITCH.minX - PITCH.goalLineInset) return 1; // away's goal is LEFT? no:
  if (insideRightRecess(pos) && pos.x > PITCH.maxX + PITCH.goalLineInset) return 0;
  return null;
}
// Note: goalScored returns the TEAM THAT SCORED: home (0) attacks RIGHT,
// so a ball past the right line is a home bell; past the left line is away's.
