import { describe, expect, it } from 'vitest';
import { MatchCore } from '../../../src/domain/match/core';
import { TUNING as T } from '../../../src/domain/match/tuning';
import { NEUTRAL_COMMAND } from '../../../src/domain/match/types';
import { run, testConfig, TICKS_PER_SECOND } from './helpers';

describe('match flow', () => {
  it('starts in kickoff freeze then enters play', () => {
    const core = new MatchCore(testConfig(5));
    expect(core.snapshot().phase).toBe('kickoff');
    run(core, Math.ceil(T.kickoffFreezeS * TICKS_PER_SECOND) + 2);
    expect(core.snapshot().phase).toBe('play');
  });

  it('kickoff gives the ball to the kickoff team at centre', () => {
    const core = new MatchCore(testConfig(5));
    const s = core.snapshot();
    expect(s.ball.ownerId).not.toBeNull();
    const owner = s.players.find((p) => p.id === s.ball.ownerId);
    expect(owner?.team).toBe(s.kickoffTeam);
    expect(Math.abs(s.ball.pos.x - 240)).toBeLessThan(1);
  });

  it('clock counts down only during play', () => {
    const core = new MatchCore(testConfig(5));
    const t0 = core.snapshot().clockS;
    run(core, 10); // still kickoff freeze
    expect(core.snapshot().clockS).toBe(t0);
    run(core, Math.ceil(T.kickoffFreezeS * TICKS_PER_SECOND));
    run(core, TICKS_PER_SECOND);
    expect(core.snapshot().clockS).toBeLessThan(t0 - 0.9);
  });

  it('a full AI-vs-AI match reaches fullTime and produces events', () => {
    const core = new MatchCore(testConfig(99, undefined));
    // Human flag off so the AI drives everyone.
    const cfg = testConfig(99);
    cfg.home.human = false;
    const auto = new MatchCore(cfg);
    let sawFullTime = false;
    let eventCount = 0;
    for (let i = 0; i < TICKS_PER_SECOND * 400 && !sawFullTime; i++) {
      auto.tick(NEUTRAL_COMMAND);
      for (const e of auto.drainEvents()) {
        eventCount++;
        if (e.type === 'fullTime') sawFullTime = true;
      }
    }
    expect(sawFullTime).toBe(true);
    expect(eventCount).toBeGreaterThan(10);
    const s = auto.snapshot();
    expect(s.phase).toBe('fullTime');
    // Score limit or clock ended the match legally.
    expect(Math.max(...s.score) <= 3).toBe(true);
    void core;
  });
});

describe('stamina', () => {
  it('sprint drains stamina and locks below threshold with hysteresis', () => {
    const core = new MatchCore(testConfig(11));
    run(core, Math.ceil(T.kickoffFreezeS * TICKS_PER_SECOND) + 2);
    const sprintCmd = { moveX: 1, moveY: 0, sprint: true, pass: false, shoot: false };
    // Sprint until locked.
    let locked = false;
    for (let i = 0; i < TICKS_PER_SECOND * 30 && !locked; i++) {
      core.tick(sprintCmd);
      const me = core.snapshot().players.find((p) => p.id === core.snapshot().controlledId);
      if (me && me.sprintLocked) locked = true;
    }
    expect(locked).toBe(true);
    // Rest: recovers and unlocks at the higher threshold.
    let unlocked = false;
    for (let i = 0; i < TICKS_PER_SECOND * 10 && !unlocked; i++) {
      core.tick(NEUTRAL_COMMAND);
      const s = core.snapshot();
      const me = s.players.find((p) => p.id === s.controlledId);
      if (me && !me.sprintLocked) {
        unlocked = true;
        expect(me.stamina).toBeGreaterThanOrEqual(T.sprintUnlockAt - 1);
      }
    }
    expect(unlocked).toBe(true);
  });
});

describe('ball truth invariants', () => {
  it('the ball is never owned while in shotFlight or passFlight', () => {
    const cfg = testConfig(21);
    cfg.home.human = false;
    const core = new MatchCore(cfg);
    for (let i = 0; i < TICKS_PER_SECOND * 60; i++) {
      core.tick(NEUTRAL_COMMAND);
      const b = core.snapshot().ball;
      if (b.mode === 'passFlight' || b.mode === 'shotFlight') {
        expect(b.ownerId).toBeNull();
      }
      if (core.snapshot().phase === 'fullTime') break;
    }
  });

  it('the ball stays inside the arena (incl. recesses) for a long AI match', () => {
    const cfg = testConfig(33);
    cfg.home.human = false;
    const core = new MatchCore(cfg);
    for (let i = 0; i < TICKS_PER_SECOND * 120; i++) {
      core.tick(NEUTRAL_COMMAND);
      const b = core.snapshot().ball;
      expect(b.pos.x).toBeGreaterThan(0);
      expect(b.pos.x).toBeLessThan(480);
      expect(b.pos.y).toBeGreaterThan(0);
      expect(b.pos.y).toBeLessThan(270);
      if (core.snapshot().phase === 'fullTime') break;
    }
  });

  it('kicker cannot instantly reclaim a pass (touch immunity)', () => {
    const core = new MatchCore(testConfig(55));
    run(core, Math.ceil(T.kickoffFreezeS * TICKS_PER_SECOND) + 2);
    const before = core.snapshot();
    const kicker = before.ball.ownerId;
    expect(kicker).not.toBeNull();
    // Tap pass (press then release).
    core.tick({ ...NEUTRAL_COMMAND, pass: true });
    core.tick(NEUTRAL_COMMAND);
    const after = core.snapshot();
    expect(after.ball.mode === 'passFlight' || after.ball.mode === 'firstTouch').toBe(true);
    // For the immunity window, the kicker may not re-own it.
    for (let i = 0; i < Math.floor(T.kickImmunityT * TICKS_PER_SECOND) - 1; i++) {
      core.tick(NEUTRAL_COMMAND);
      const b = core.snapshot().ball;
      if (b.ownerId === kicker && (b.mode === 'firstTouch' || b.mode === 'controlled')) {
        throw new Error('kicker reclaimed inside immunity window');
      }
    }
  });
});
