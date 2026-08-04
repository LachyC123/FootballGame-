import { MatchCore } from '../../../src/domain/match/core';
import type { MatchConfig, PlayerCommand } from '../../../src/domain/match/types';
import { NEUTRAL_COMMAND } from '../../../src/domain/match/types';

export function testConfig(seed: number, overrides?: Partial<MatchConfig>): MatchConfig {
  const stats = { pace: 5, power: 5, touch: 5, guard: 5, engine: 5 };
  return {
    seed,
    rules: { durationS: 180, scoreLimit: 3, goldenGoal: true },
    home: {
      teamId: 'team_home',
      human: true,
      reactionMs: 200,
      aiProfile: { press: 0.5, line: 0.5, tempo: 0.5, risk: 0.4, phys: 0.3, show: 0, wall: 0.4, stam: 0.6 },
      players: [
        { id: 'chr_h1', stats: { ...stats } },
        { id: 'chr_h2', stats: { ...stats } },
        { id: 'chr_h3', stats: { ...stats } },
      ],
    },
    away: {
      teamId: 'team_away',
      human: false,
      reactionMs: 250,
      aiProfile: { press: 0.6, line: 0.5, tempo: 0.4, risk: 0.4, phys: 0.4, show: 0, wall: 0.3, stam: 0.5 },
      players: [
        { id: 'chr_a1', stats: { ...stats } },
        { id: 'chr_a2', stats: { ...stats } },
        { id: 'chr_a3', stats: { ...stats } },
      ],
    },
    ...overrides,
  };
}

export function run(core: MatchCore, ticks: number, command: PlayerCommand = NEUTRAL_COMMAND): void {
  for (let i = 0; i < ticks; i++) core.tick(command);
}

/** Scripted command stream: array of [ticks, command] pairs. */
export function runScript(core: MatchCore, script: Array<[number, Partial<PlayerCommand>]>): void {
  for (const [ticks, partial] of script) {
    const cmd = { ...NEUTRAL_COMMAND, ...partial };
    for (let i = 0; i < ticks; i++) core.tick(cmd);
  }
}

export const TICKS_PER_SECOND = 60;
