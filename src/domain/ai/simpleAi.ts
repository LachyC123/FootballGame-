import type { SeededRng } from '../rng';
import { GOAL_BOTTOM, GOAL_TOP, PITCH } from '../match/geometry';
import type { AiView } from '../match/core';
import type { AiProfile, PlayerCommand, PlayerState, Vec2 } from '../match/types';

/**
 * Phase 1 AI (docs/03 §10 minimal set): CHASE / CARRY / SUPPORT / GUARD via the
 * same PlayerCommand interface as the human. Decisions refresh at the team's
 * reaction cadence; steering runs every tick toward the last decided target.
 * Deterministic: all randomness from the injected match RNG.
 */
interface Memory {
  target: Vec2;
  sprint: boolean;
  pressPass: boolean;
  shootHold: number; // seconds left to hold the shot button (0 = not shooting)
  decideIn: number;
}

export class SimpleAi {
  private readonly team: 0 | 1;
  private readonly profile: AiProfile;
  private readonly reactionS: number;
  private readonly rng: SeededRng;
  private memory = new Map<string, Memory>();

  constructor(team: 0 | 1, profile: AiProfile, reactionMs: number, rng: SeededRng) {
    this.team = team;
    this.profile = profile;
    this.reactionS = reactionMs / 1000;
    this.rng = rng;
  }

  decide(view: AiView, out: Map<string, PlayerCommand>, skipId: string | null): void {
    const mine = view.players.filter((p) => p.team === this.team);
    const dt = 1 / 60;
    for (const p of mine) {
      if (p.id === skipId) continue;
      let mem = this.memory.get(p.id);
      if (!mem) {
        mem = { target: { ...p.pos }, sprint: false, pressPass: false, shootHold: 0, decideIn: 0 };
        this.memory.set(p.id, mem);
      }
      mem.decideIn -= dt;
      if (mem.decideIn <= 0) {
        this.think(view, p, mine, mem);
        mem.decideIn = this.reactionS * this.rng.range(0.8, 1.2);
      }
      out.set(p.id, this.steer(p, mem, dt));
    }
  }

  private think(view: AiView, p: PlayerState, mine: PlayerState[], mem: Memory): void {
    const ball = view.ball;
    const owner = ball.ownerId ? view.players.find((q) => q.id === ball.ownerId) ?? null : null;
    const weOwn = owner !== null && owner.team === this.team;
    const iOwn = owner !== null && owner.id === p.id;
    const attackRight = this.team === 0;
    const goalX = attackRight ? PITCH.maxX : PITCH.minX;
    const ownGoalX = attackRight ? PITCH.minX : PITCH.maxX;

    mem.pressPass = false;
    mem.sprint = false;

    if (iOwn && ball.mode === 'controlled') {
      // CARRY.
      const distGoal = Math.hypot(goalX - p.pos.x, PITCH.centerY - p.pos.y);
      const nearestOpp = this.nearestOpponent(view, p.pos);
      const pressured = nearestOpp !== null && nearestOpp.dist < 26;
      if (distGoal < 130 && mem.shootHold <= 0) {
        // Plan a shot: charge longer from farther out, bounded by risk appetite.
        mem.shootHold = 0.12 + (distGoal / 130) * 0.35 * (0.6 + this.profile.risk * 0.8);
        mem.target = { x: goalX, y: PITCH.centerY };
        return;
      }
      if (pressured && this.rng.next() < 0.5 + this.profile.tempo * 0.4) {
        mem.pressPass = true; // tap = ground pass to best mate
        return;
      }
      // Drift toward goal, biased away from the nearest opponent.
      const away = nearestOpp
        ? { x: p.pos.x - nearestOpp.player.pos.x, y: p.pos.y - nearestOpp.player.pos.y }
        : { x: 0, y: 0 };
      mem.target = {
        x: goalX * 0.55 + p.pos.x * 0.45 + away.x * 1.2,
        y: PITCH.centerY * 0.4 + p.pos.y * 0.6 + away.y * 1.2,
      };
      mem.sprint = !pressured && p.stamina > 45 * (1 + this.profile.stam);
      return;
    }

    if (weOwn && owner) {
      // SUPPORT: two slots ahead of the carrier.
      const others = mine.filter((q) => q.id !== owner.id);
      const slot = others.indexOf(p); // 0 or 1
      const dirX = attackRight ? 1 : -1;
      const lateral = slot === 0 ? -60 : 60;
      mem.target = {
        x: owner.pos.x + dirX * 70,
        y: Math.min(PITCH.maxY - 20, Math.max(PITCH.minY + 20, owner.pos.y + lateral)),
      };
      mem.sprint = false;
      return;
    }

    if (!owner) {
      // Free ball: nearest chases, others take goal-side spots.
      const nearest = this.nearestOf(mine, ball.pos);
      if (nearest.id === p.id) {
        mem.target = { ...ball.pos };
        mem.sprint = p.stamina > 35;
        return;
      }
      mem.target = this.defensiveSpot(p, mine, ball.pos, ownGoalX);
      return;
    }

    // Opponent owns: PRESS / GUARD by pressAggression.
    const nearest = this.nearestOf(mine, owner.pos);
    const second = this.nearestOf(
      mine.filter((q) => q.id !== nearest.id),
      owner.pos,
    );
    const pressers = this.profile.press > 0.66 ? 2 : 1;
    const isPresser = p.id === nearest.id || (pressers === 2 && p.id === second.id);
    if (isPresser) {
      mem.target = { ...owner.pos };
      mem.sprint = p.stamina > 30;
      const d = Math.hypot(owner.pos.x - p.pos.x, owner.pos.y - p.pos.y);
      const facingAway = owner.facing.x * (p.pos.x - owner.pos.x) + owner.facing.y * (p.pos.y - owner.pos.y) < 0;
      // Lunge when the ball is exposed — or occasionally anyway, so a shielded
      // carrier is pressured rather than politely watched forever.
      const commit = facingAway || this.rng.next() < 0.35;
      if (d < 18 && commit && p.action === 'normal' && ball.ownerProtectedT <= 0) {
        // Lunge — via the same button the player uses.
        mem.shootHold = 0.01;
      }
      return;
    }
    mem.target = this.defensiveSpot(p, mine, owner.pos, ownGoalX);
  }

  private defensiveSpot(p: PlayerState, mine: PlayerState[], threat: Vec2, ownGoalX: number): Vec2 {
    // GUARD: last player protects the mouth; middle player blocks the lane.
    const goalPos = { x: ownGoalX, y: PITCH.centerY };
    const byDist = [...mine].sort(
      (a, b) =>
        Math.hypot(a.pos.x - goalPos.x, a.pos.y - goalPos.y) -
        Math.hypot(b.pos.x - goalPos.x, b.pos.y - goalPos.y),
    );
    if (byDist[0]?.id === p.id) {
      const inset = ownGoalX === PITCH.minX ? 14 : -14;
      const y = Math.min(GOAL_BOTTOM - 4, Math.max(GOAL_TOP + 4, threat.y));
      return { x: ownGoalX + inset, y };
    }
    const line = 0.35 + this.profile.line * 0.3;
    return {
      x: goalPos.x + (threat.x - goalPos.x) * line,
      y: goalPos.y + (threat.y - goalPos.y) * line,
    };
  }

  private steer(p: PlayerState, mem: Memory, dt: number): PlayerCommand {
    const dx = mem.target.x - p.pos.x;
    const dy = mem.target.y - p.pos.y;
    const d = Math.hypot(dx, dy);
    const arrived = d < 6;
    let shoot = false;
    if (mem.shootHold > 0) {
      mem.shootHold -= dt;
      shoot = mem.shootHold > 0;
    }
    const pass = mem.pressPass;
    mem.pressPass = false; // one-tick pulse
    return {
      moveX: arrived ? 0 : dx / (d || 1),
      moveY: arrived ? 0 : dy / (d || 1),
      sprint: mem.sprint && d > 40,
      pass,
      shoot,
    };
  }

  private nearestOf(players: PlayerState[], pos: Vec2): PlayerState {
    let best = players[0];
    if (!best) throw new Error('SimpleAi: empty team');
    let bestD = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.pos.x - pos.x, p.pos.y - pos.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private nearestOpponent(
    view: AiView,
    pos: Vec2,
  ): { player: PlayerState; dist: number } | null {
    let best: PlayerState | null = null;
    let bestD = Infinity;
    for (const p of view.players) {
      if (p.team === this.team) continue;
      const d = Math.hypot(p.pos.x - pos.x, p.pos.y - pos.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best ? { player: best, dist: bestD } : null;
  }
}
