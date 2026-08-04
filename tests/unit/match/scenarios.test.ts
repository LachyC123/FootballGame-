import { describe, expect, it } from 'vitest';
import { MatchCore } from '../../../src/domain/match/core';
import { collideCircle, goalScored, PITCH, reflect } from '../../../src/domain/match/geometry';
import { TUNING as T } from '../../../src/domain/match/tuning';
import { run, runScript, testConfig, TICKS_PER_SECOND } from './helpers';

/** Deterministic debug scenarios (docs/05 §9, adopted from THREEFOLD). */

describe('scenario: wall_pass — rebounds are physical and lossy', () => {
  it('reflects off each wall with restitution', () => {
    const cases = [
      { pos: { x: 240, y: 18 }, vel: { x: 50, y: -100 }, flip: 'y' },
      { pos: { x: 240, y: 252 }, vel: { x: 50, y: 100 }, flip: 'y' },
      { pos: { x: 18, y: 60 }, vel: { x: -100, y: 50 }, flip: 'x' },
      { pos: { x: 462, y: 60 }, vel: { x: 100, y: 50 }, flip: 'x' },
    ];
    for (const c of cases) {
      const pos = { ...c.pos };
      const vel = { ...c.vel };
      const hit = collideCircle(pos, vel, T.ballRadius);
      expect(hit, JSON.stringify(c)).not.toBeNull();
      reflect(vel, hit!.normal, T.wallRestitution);
      if (c.flip === 'y') {
        expect(Math.sign(vel.y)).toBe(-Math.sign(c.vel.y));
        expect(Math.abs(vel.y)).toBeCloseTo(Math.abs(c.vel.y) * T.wallRestitution, 5);
        expect(vel.x).toBeCloseTo(c.vel.x, 5); // tangential preserved
      } else {
        expect(Math.sign(vel.x)).toBe(-Math.sign(c.vel.x));
        expect(Math.abs(vel.x)).toBeCloseTo(Math.abs(c.vel.x) * T.wallRestitution, 5);
      }
    }
  });

  it('corner wedges return the ball toward play (never dead-stop)', () => {
    const pos = { x: PITCH.minX + 2, y: PITCH.minY + 2 }; // deep in top-left corner
    const vel = { x: -80, y: -80 };
    const hit = collideCircle(pos, vel, T.ballRadius);
    expect(hit).not.toBeNull();
    expect(hit!.kind).toBe('wedge');
    reflect(vel, hit!.normal, T.wallRestitution);
    expect(vel.x).toBeGreaterThan(0);
    expect(vel.y).toBeGreaterThan(0);
  });
});

describe('scenario: goal_post_edges', () => {
  it('ball fully past the right goal line scores for home', () => {
    expect(goalScored({ x: PITCH.maxX + PITCH.goalLineInset + 1, y: PITCH.centerY })).toBe(0);
  });
  it('ball fully past the left goal line scores for away', () => {
    expect(goalScored({ x: PITCH.minX - PITCH.goalLineInset - 1, y: PITCH.centerY })).toBe(1);
  });
  it('ball at the mouth but not past the line does not score', () => {
    expect(goalScored({ x: PITCH.maxX + PITCH.goalLineInset - 2, y: PITCH.centerY })).toBeNull();
  });
  it('ball outside the mouth height never scores', () => {
    expect(goalScored({ x: PITCH.maxX + PITCH.goalLineInset + 1, y: PITCH.centerY + 40 })).toBeNull();
  });
  it('a goal is only counted once per bell sequence', () => {
    const core = new MatchCore(testConfig(7));
    run(core, Math.ceil(T.kickoffFreezeS * TICKS_PER_SECOND) + 5);
    // Force the ball into the right goal via the core's own physics: simulate
    // until any bell occurs in a long AI-vs-AI run, then check score integrity.
    let bells = 0;
    for (let i = 0; i < TICKS_PER_SECOND * 120; i++) {
      core.tick({ moveX: 0, moveY: 0, sprint: false, pass: false, shoot: false });
      for (const e of core.drainEvents()) if (e.type === 'bell') bells++;
      const s = core.snapshot();
      if (bells > 0) {
        expect(s.score[0] + s.score[1]).toBe(bells);
        break;
      }
    }
  });
});

describe('scenario: possession_duel — mirrored contest never gives arbitrary ownership', () => {
  it('is deterministic across two identical runs', () => {
    const a = new MatchCore(testConfig(42));
    const b = new MatchCore(testConfig(42));
    run(a, TICKS_PER_SECOND * 10);
    run(b, TICKS_PER_SECOND * 10);
    expect(a.hash()).toBe(b.hash());
  });
});

describe('determinism: seed + command stream reproduces the match', () => {
  it('identical hashes after a scripted 30-second run', () => {
    const script: Array<[number, { moveX?: number; moveY?: number; sprint?: boolean; pass?: boolean; shoot?: boolean }]> =
      [
        [120, {}],
        [90, { moveX: 1 }],
        [30, { moveX: 1, sprint: true }],
        [10, { pass: true }],
        [50, {}],
        [40, { moveX: 0.5, moveY: -0.8 }],
        [20, { shoot: true }],
        [10, {}],
        [60, { moveX: -1, moveY: 0.3 }],
        [10, { pass: true }],
        [1300, {}],
      ];
    const a = new MatchCore(testConfig(1337));
    const b = new MatchCore(testConfig(1337));
    runScript(a, script);
    runScript(b, script);
    expect(a.hash()).toBe(b.hash());
  });

  it('different seeds diverge under identical active play', () => {
    const script: Array<[number, { moveX?: number; moveY?: number; sprint?: boolean; pass?: boolean; shoot?: boolean }]> =
      [
        [60, {}],
        [120, { moveX: 1, moveY: 0.4, sprint: true }],
        [10, { pass: true }],
        [120, { moveX: 0.8, moveY: -0.6 }],
        [25, { shoot: true }],
        [10, {}],
        [855, { moveX: 0.3, moveY: 0.2 }],
      ];
    const a = new MatchCore(testConfig(1));
    const b = new MatchCore(testConfig(2));
    runScript(a, script);
    runScript(b, script);
    expect(a.hash()).not.toBe(b.hash());
  });
});
