import { SeededRng } from '../rng';
import { collideCircle, goalScored, GOAL_TOP, GOAL_BOTTOM, PITCH, reflect } from './geometry';
import { TUNING as T } from './tuning';
import type {
  BallState,
  MatchConfig,
  MatchEvent,
  MatchPhase,
  MatchSnapshot,
  PlayerCommand,
  PlayerState,
  Vec2,
} from './types';
import { NEUTRAL_COMMAND } from './types';
import { SimpleAi } from '../ai/simpleAi';

const GRAVITY = 500;

function vlen(x: number, y: number): number {
  return Math.hypot(x, y);
}

function norm(v: Vec2): Vec2 {
  const l = vlen(v.x, v.y);
  return l > 0.0001 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
}

function angleBetween(a: Vec2, b: Vec2): number {
  const la = vlen(a.x, a.y);
  const lb = vlen(b.x, b.y);
  if (la < 0.0001 || lb < 0.0001) return Math.PI;
  const dot = (a.x * b.x + a.y * b.y) / (la * lb);
  return Math.acos(Math.min(1, Math.max(-1, dot)));
}

function rotate(v: Vec2, rad: number): Vec2 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

interface Buffered {
  pass: number; // seconds remaining in buffer
  shoot: number;
}

/**
 * MatchCore — the single simulation authority (docs/05 §4). Pure and
 * deterministic: seed + human command stream reproduces a match exactly.
 * The human controls one player of team 0; every other player is driven by
 * the in-core AI through the same PlayerCommand interface.
 */
export class MatchCore {
  readonly config: MatchConfig;
  private rng: SeededRng;
  private players: PlayerState[] = [];
  private ball!: BallState;
  private phase: MatchPhase = 'kickoff';
  private phaseT = 0;
  private clockS: number;
  private score: [number, number] = [0, 0];
  private kickoffTeam: 0 | 1 = 1;
  private tickCount = 0;
  private events: MatchEvent[] = [];
  private controlledId: string;
  private prevCommands = new Map<string, PlayerCommand>();
  private buffers = new Map<string, Buffered>();
  private counters: Record<string, number> = {};
  private homeAi: SimpleAi;
  private awayAi: SimpleAi;

  constructor(config: MatchConfig) {
    this.config = config;
    this.rng = new SeededRng(config.seed);
    this.clockS = config.rules.durationS;
    for (const [team, setup] of [config.home, config.away].entries()) {
      for (const p of setup.players.slice(0, 3)) {
        this.players.push({
          id: p.id,
          team: team as 0 | 1,
          pos: { x: 0, y: 0 },
          vel: { x: 0, y: 0 },
          facing: { x: team === 0 ? 1 : -1, y: 0 },
          stamina: T.staminaMax * (0.8 + 0.04 * p.stats.engine),
          sprintLocked: false,
          sprinting: false,
          action: 'normal',
          actionT: 0,
          chargeT: 0,
          passHoldT: -1,
        });
      }
    }
    const first = this.players[0];
    if (!first) throw new Error('MatchCore: no players');
    this.controlledId = first.id;
    this.homeAi = new SimpleAi(0, config.home.aiProfile, config.home.reactionMs, this.rng);
    this.awayAi = new SimpleAi(1, config.away.aiProfile, config.away.reactionMs, this.rng);
    this.setupKickoff(this.rng.next() < 0.5 ? 0 : 1);
  }

  // ---- public API ---------------------------------------------------------

  tick(humanCommand: PlayerCommand): void {
    const dt = T.fixedDt;
    this.tickCount++;

    if (this.phase === 'fullTime') return;

    if (this.phase === 'kickoff' || this.phase === 'bell') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        if (this.phase === 'bell') {
          this.setupKickoff(this.kickoffTeam);
        } else {
          this.beginPlay();
        }
      }
      return;
    }

    // Clock.
    this.clockS -= dt;
    if (this.phase === 'play' && this.clockS <= 0) {
      this.clockS = 0;
      const [h, a] = this.score;
      if (h === a && this.config.rules.goldenGoal) {
        this.phase = 'goldenGoal';
        this.events.push({ type: 'goldenGoalStart' });
      } else {
        this.endMatch();
        return;
      }
    }

    // Commands: human for controlled player, AI for everyone else.
    const commands = new Map<string, PlayerCommand>();
    const state = this.internalView();
    this.homeAi.decide(state, commands, this.config.home.human ? this.controlledId : null);
    this.awayAi.decide(state, commands, null);
    if (this.config.home.human) commands.set(this.controlledId, humanCommand);

    for (const player of this.players) {
      this.applyCommand(player, commands.get(player.id) ?? NEUTRAL_COMMAND, dt);
    }
    this.separatePlayers();
    this.updateBall(dt);
    this.updateBuffers(dt);

    for (const player of this.players) {
      this.prevCommands.set(player.id, { ...(commands.get(player.id) ?? NEUTRAL_COMMAND) });
    }
  }

  drainEvents(): MatchEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  snapshot(): MatchSnapshot {
    return {
      tick: this.tickCount,
      clockS: this.clockS,
      phase: this.phase,
      phaseT: this.phaseT,
      score: [...this.score] as [number, number],
      kickoffTeam: this.kickoffTeam,
      players: this.players.map((p) => ({
        ...p,
        pos: { ...p.pos },
        vel: { ...p.vel },
        facing: { ...p.facing },
      })),
      ball: { ...this.ball, pos: { ...this.ball.pos }, vel: { ...this.ball.vel } },
      controlledId: this.controlledId,
      counters: { ...this.counters },
    };
  }

  /** Stable string for determinism tests. */
  hash(): string {
    const s = this.snapshot();
    const round = (n: number): number => Math.round(n * 1000) / 1000;
    return JSON.stringify({
      t: s.tick,
      c: round(s.clockS),
      ph: s.phase,
      sc: s.score,
      p: s.players.map((p) => [p.id, round(p.pos.x), round(p.pos.y), round(p.stamina)]),
      b: [s.ball.mode, s.ball.ownerId, round(s.ball.pos.x), round(s.ball.pos.y)],
      k: s.counters,
    });
  }

  // ---- setup & flow -------------------------------------------------------

  private setupKickoff(team: 0 | 1): void {
    this.kickoffTeam = team;
    this.phase = 'kickoff';
    this.phaseT = T.kickoffFreezeS;
    const cx = PITCH.centerX;
    const cy = PITCH.centerY;
    const spots: Array<[number, number]> = [
      [-100, 0],
      [-140, -60],
      [-140, 60],
    ];
    for (const player of this.players) {
      const idx = this.players.filter((p) => p.team === player.team).indexOf(player);
      const spot = spots[idx] ?? spots[0]!;
      const mirror = player.team === 0 ? 1 : -1;
      player.pos = { x: cx + spot[0] * mirror, y: cy + spot[1] };
      player.vel = { x: 0, y: 0 };
      player.facing = { x: mirror, y: 0 };
      player.action = 'normal';
      player.actionT = 0;
      player.chargeT = 0;
      player.passHoldT = -1;
    }
    // Kickoff carrier stands at centre with the ball.
    const carrier = this.players.find((p) => p.team === team);
    if (carrier) {
      carrier.pos = { x: cx + (team === 0 ? -12 : 12), y: cy };
    }
    this.ball = {
      pos: { x: cx, y: cy },
      vel: { x: 0, y: 0 },
      z: 0,
      vz: 0,
      mode: 'dead',
      ownerId: carrier?.id ?? null,
      firstTouchT: 0,
      immunityId: null,
      immunityT: 0,
      ownerProtectedT: 0,
      receiveDelayT: 0,
      receiverHintId: null,
    };
    if (this.config.home.human) {
      this.controlledId = team === 0 && carrier ? carrier.id : this.nearestToBall(0).id;
    }
    this.events.push({ type: 'kickoff', team });
  }

  private beginPlay(): void {
    this.phase = this.clockS <= 0 ? 'goldenGoal' : 'play';
    if (this.ball.mode === 'dead') {
      this.ball.mode = this.ball.ownerId ? 'controlled' : 'free';
    }
  }

  private endMatch(): void {
    this.phase = 'fullTime';
    this.ball.mode = 'dead';
    this.events.push({ type: 'fullTime' });
  }

  private onBell(scoringTeam: 0 | 1): void {
    this.score[scoringTeam]++;
    this.counters['bells'] = (this.counters['bells'] ?? 0) + 1;
    this.events.push({ type: 'bell', team: scoringTeam, pos: { ...this.ball.pos } });
    this.ball.mode = 'dead';
    this.ball.ownerId = null;
    const limit = this.config.rules.scoreLimit;
    const finished =
      this.score[scoringTeam] >= limit || this.phase === 'goldenGoal';
    if (finished) {
      this.endMatch();
      return;
    }
    this.phase = 'bell';
    this.phaseT = T.bellPauseS;
    this.kickoffTeam = scoringTeam === 0 ? 1 : 0;
  }

  // ---- players ------------------------------------------------------------

  private maxSpeed(p: PlayerState): number {
    const stats = this.statsOf(p.id);
    const base = T.baseSpeed * (1 + (stats.pace - 5) * T.statSpeedSpread);
    return p.sprinting ? base * T.sprintMult : base;
  }

  private statsOf(id: string): { pace: number; power: number; touch: number; guard: number; engine: number } {
    for (const setup of [this.config.home, this.config.away]) {
      const found = setup.players.find((p) => p.id === id);
      if (found) return found.stats;
    }
    return { pace: 5, power: 5, touch: 5, guard: 5, engine: 5 };
  }

  private applyCommand(p: PlayerState, cmd: PlayerCommand, dt: number): void {
    const prev = this.prevCommands.get(p.id) ?? NEUTRAL_COMMAND;
    const hasBall = this.ball.ownerId === p.id && this.ball.mode === 'controlled';
    const move = { x: cmd.moveX, y: cmd.moveY };
    const moveLen = vlen(move.x, move.y);
    const moving = moveLen > 0.15;
    const aim = moving ? norm(move) : p.facing;

    // Action-state timers.
    if (p.action !== 'normal') {
      p.actionT -= dt;
      if (p.actionT <= 0) {
        if (p.action === 'lunge') {
          // Lunge ended without a win → recovery stumble.
          p.action = 'stumble';
          p.actionT = T.stumbleDurationS;
          this.events.push({ type: 'tackleMissed', playerId: p.id });
        } else {
          p.action = 'normal';
          p.actionT = 0;
        }
      }
    }

    // Stamina.
    const wantsSprint = cmd.sprint && moving && !p.sprintLocked;
    p.sprinting = wantsSprint && p.action === 'normal';
    if (p.sprinting) {
      p.stamina -= T.sprintDrain * dt;
      if (p.stamina <= T.sprintLockAt) p.sprintLocked = true;
    } else {
      p.stamina += (moving ? T.staminaRecover : T.staminaRecoverIdle) * dt;
      if (p.stamina >= T.sprintUnlockAt) p.sprintLocked = false;
    }
    const engineScale = 0.8 + 0.04 * this.statsOf(p.id).engine;
    p.stamina = Math.min(T.staminaMax * engineScale, Math.max(0, p.stamina));

    // Movement.
    if (p.action === 'lunge') {
      // velocity locked during lunge
    } else if (p.action === 'stumble') {
      p.vel.x *= 1 - Math.min(1, 6 * dt);
      p.vel.y *= 1 - Math.min(1, 6 * dt);
    } else {
      let accel = T.accel;
      if (this.inOwnMouthArea(p)) accel *= T.scrambleAccelMult;
      let speed = this.maxSpeed(p);
      if (hasBall && p.chargeT > 0) speed *= T.shotChargeSlowMult;
      if (moving) {
        const target = { x: aim.x * speed * Math.min(1, moveLen), y: aim.y * speed * Math.min(1, moveLen) };
        p.vel.x = this.approach(p.vel.x, target.x, accel * dt);
        p.vel.y = this.approach(p.vel.y, target.y, accel * dt);
        p.facing = aim;
      } else {
        p.vel.x = this.approach(p.vel.x, 0, T.friction * dt);
        p.vel.y = this.approach(p.vel.y, 0, T.friction * dt);
      }
    }
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    const hit = collideCircle(p.pos, p.vel, T.playerRadius);
    if (hit) reflect(p.vel, hit.normal, 0);

    // ---- Actions ----------------------------------------------------------
    const passDown = cmd.pass && !prev.pass;
    const passUp = !cmd.pass && prev.pass;
    const shootDown = cmd.shoot && !prev.shoot;
    const shootUp = !cmd.shoot && prev.shoot;
    const buf = this.buffers.get(p.id) ?? { pass: 0, shoot: 0 };

    if (hasBall) {
      // Pass hold tracking (tap = ground, hold = loft).
      if (passDown || (buf.pass > 0 && p.passHoldT < 0)) {
        p.passHoldT = 0;
        buf.pass = 0;
      } else if (cmd.pass && p.passHoldT >= 0) {
        p.passHoldT += dt;
      }
      if ((passUp || (p.passHoldT >= 0 && !cmd.pass)) && p.passHoldT >= 0) {
        this.executePass(p, aim, p.passHoldT >= T.loftHoldS, false);
        p.passHoldT = -1;
      }
      // Shot charge.
      if (shootDown || (buf.shoot > 0 && p.chargeT === 0)) {
        p.chargeT = 0.001;
        buf.shoot = 0;
      } else if (cmd.shoot && p.chargeT > 0) {
        p.chargeT = Math.min(T.chargeMaxS, p.chargeT + dt);
      }
      if ((shootUp || (p.chargeT > 0 && !cmd.shoot)) && p.chargeT > 0) {
        this.executeShot(p, aim);
        p.chargeT = 0;
      }
    } else {
      p.passHoldT = -1;
      p.chargeT = 0;
      // One-touch pass: press pass while our incoming ball is in FirstTouch.
      if (passDown && this.ball.mode === 'firstTouch' && this.ball.ownerId === p.id) {
        this.executePass(p, aim, false, true);
      } else if (passDown && p.team === 0 && this.config.home.human && p.id === this.controlledId) {
        // Switch control (docs/03 §4.3) when we don't own the ball.
        const owner = this.ballOwner();
        if (!owner || owner.team !== 0) {
          this.switchControl();
        } else {
          buf.pass = T.inputBufferS;
        }
      } else if (passDown) {
        buf.pass = T.inputBufferS;
      }
      // Tackle / shoulder charge.
      if (shootDown && p.action === 'normal') {
        this.startTackle(p, aim, cmd.sprint);
      } else if (shootDown) {
        buf.shoot = T.inputBufferS;
      }
    }
    this.buffers.set(p.id, buf);

    // Active lunge contact resolution.
    if (p.action === 'lunge') this.resolveLunge(p);
  }

  private approach(current: number, target: number, delta: number): number {
    if (current < target) return Math.min(target, current + delta);
    return Math.max(target, current - delta);
  }

  private inOwnMouthArea(p: PlayerState): boolean {
    const ownLeft = p.team === 1 ? false : true; // team 0 defends LEFT goal
    const x = ownLeft ? PITCH.minX : PITCH.maxX;
    return (
      Math.abs(p.pos.x - x) < 26 && p.pos.y > GOAL_TOP - 10 && p.pos.y < GOAL_BOTTOM + 10
    );
  }

  private separatePlayers(): void {
    const r2 = T.playerRadius * 2;
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i]!;
        const b = this.players[j]!;
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const d = vlen(dx, dy);
        if (d > 0.001 && d < r2) {
          const push = (r2 - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.pos.x -= nx * push;
          a.pos.y -= ny * push;
          b.pos.x += nx * push;
          b.pos.y += ny * push;
        }
      }
    }
  }

  // ---- ball ---------------------------------------------------------------

  private ballOwner(): PlayerState | null {
    if (!this.ball.ownerId) return null;
    return this.players.find((p) => p.id === this.ball.ownerId) ?? null;
  }

  private nearestToBall(team: 0 | 1, excludeId?: string): PlayerState {
    let best: PlayerState | null = null;
    let bestD = Infinity;
    for (const p of this.players) {
      if (p.team !== team || p.id === excludeId) continue;
      const d = vlen(p.pos.x - this.ball.pos.x, p.pos.y - this.ball.pos.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best) throw new Error('nearestToBall: no players on team');
    return best;
  }

  private switchControl(): void {
    const next = this.nearestToBall(0, this.controlledId);
    if (next.id !== this.controlledId) {
      this.controlledId = next.id;
      this.events.push({ type: 'switch', playerId: next.id });
    }
  }

  private updateBall(dt: number): void {
    const b = this.ball;
    b.immunityT = Math.max(0, b.immunityT - dt);
    if (b.immunityT === 0) b.immunityId = null;
    b.ownerProtectedT = Math.max(0, b.ownerProtectedT - dt);
    b.receiveDelayT = Math.max(0, b.receiveDelayT - dt);

    if (b.mode === 'dead') return;

    if (b.mode === 'controlled') {
      const owner = this.ballOwner();
      if (!owner) {
        b.mode = 'free';
      } else {
        const offset = owner.sprinting ? T.sprintDribbleOffset : T.dribbleOffset;
        const target = {
          x: owner.pos.x + owner.facing.x * offset,
          y: owner.pos.y + owner.facing.y * offset,
        };
        // Spring toward the dribble point — the ball stays an independent body.
        b.vel.x = (target.x - b.pos.x) * T.dribbleSpring;
        b.vel.y = (target.y - b.pos.y) * T.dribbleSpring;
        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;
        const d = vlen(b.pos.x - owner.pos.x, b.pos.y - owner.pos.y);
        if (d > T.controlRadius * 1.8) {
          // Heavy touch — lost it.
          b.mode = 'free';
          b.ownerId = null;
          this.events.push({ type: 'heavyTouch', playerId: owner.id, pos: { ...b.pos } });
        }
      }
    } else {
      // Free flight physics.
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      if (b.z > 0 || b.vz !== 0) {
        b.vz -= GRAVITY * dt;
        b.z += b.vz * dt;
        if (b.z <= 0) {
          b.z = 0;
          b.vz = b.vz < -40 ? -b.vz * 0.4 : 0;
        }
      }
      const drag = Math.pow(b.mode === 'free' ? T.ballDragFree : 0.995, 60 * dt);
      b.vel.x *= drag;
      b.vel.y *= drag;

      if (b.mode === 'firstTouch') {
        const owner = this.ballOwner();
        if (!owner) {
          b.mode = 'free';
        } else {
          // Damp toward the receiver's feet.
          b.vel.x = this.approach(b.vel.x, 0, 900 * dt);
          b.vel.y = this.approach(b.vel.y, 0, 900 * dt);
          b.firstTouchT -= dt;
          const d = vlen(b.pos.x - owner.pos.x, b.pos.y - owner.pos.y);
          if (d > T.controlRadius * 2) {
            b.mode = 'free';
            b.ownerId = null;
          } else if (b.firstTouchT <= 0 && b.receiveDelayT <= 0) {
            b.mode = 'controlled';
            b.ownerProtectedT = T.firstTouchImmunity;
            this.events.push({ type: 'firstTouch', playerId: owner.id });
          }
        }
      }
    }

    // Walls / posts / wedges.
    const hit = collideCircle(b.pos, b.vel, T.ballRadius);
    if (hit) {
      const rest = b.mode === 'shotFlight' ? T.shotWallRestitution : T.wallRestitution;
      const speed = vlen(b.vel.x, b.vel.y);
      reflect(b.vel, hit.normal, rest);
      if (hit.kind === 'post') {
        this.events.push({ type: 'postHit', pos: { ...b.pos }, speed });
        this.counters['postHits'] = (this.counters['postHits'] ?? 0) + 1;
      } else if (speed > 25) {
        this.events.push({ type: 'wallBounce', pos: { ...b.pos }, speed });
      }
      // Wall rebounds clear kicker immunity — wall self-passes are intended.
      b.immunityId = null;
      b.immunityT = 0;
      if (b.mode === 'passFlight' || b.mode === 'shotFlight') {
        if (b.mode === 'passFlight') b.receiverHintId = null;
        b.mode = 'free';
      }
    }

    // Goals.
    const scorer = goalScored(b.pos);
    if (scorer !== null && this.phase !== 'bell') {
      this.onBell(scorer);
      return;
    }

    // Possession acquisition.
    if (b.mode === 'free' || b.mode === 'passFlight') {
      this.tryAcquire();
    }

    // Flight decay → free.
    if ((b.mode === 'passFlight' || b.mode === 'shotFlight') && vlen(b.vel.x, b.vel.y) < 60) {
      b.mode = 'free';
      b.receiverHintId = null;
    }
  }

  private tryAcquire(): void {
    const b = this.ball;
    if (b.z >= T.ballTouchHeight) return;
    const speed = vlen(b.vel.x, b.vel.y);
    if (speed > T.maxControlSpeed) return;

    interface Candidate {
      player: PlayerState;
      score: number;
    }
    const candidates: Candidate[] = [];
    for (const p of this.players) {
      if (p.action === 'stumble') continue;
      if (b.immunityId === p.id) continue;
      const d = vlen(p.pos.x - b.pos.x, p.pos.y - b.pos.y);
      if (d > T.controlRadius) continue;
      const toBall = { x: b.pos.x - p.pos.x, y: b.pos.y - p.pos.y };
      const facingDot = d > 0.5 ? (p.facing.x * toBall.x + p.facing.y * toBall.y) / d : 1;
      let score = T.controlRadius - d + facingDot * 2;
      if (b.receiverHintId === p.id) score += 1.5;
      candidates.push({ player: p, score });
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b2) => b2.score - a.score);
    const best = candidates[0]!;
    const second = candidates[1];
    if (second && second.player.team !== best.player.team && best.score - second.score < 0.35) {
      // Genuine 50/50 → loose ball, never arbitrary ownership (docs/03 §4.2).
      const kick = this.rng.range(0, Math.PI * 2);
      b.vel.x += Math.cos(kick) * 40;
      b.vel.y += Math.sin(kick) * 40;
      b.immunityId = null;
      return;
    }

    const receiver = best.player;
    // Pressure miscontrol (docs/03 §4.2 FirstTouch).
    const nearOpp = this.players.some(
      (o) =>
        o.team !== receiver.team &&
        vlen(o.pos.x - receiver.pos.x, o.pos.y - receiver.pos.y) < T.pressureRadius,
    );
    if (nearOpp) {
      const touch = this.statsOf(receiver.id).touch;
      const chance = T.pressureMiscontrolChance * (1 - (touch - 5) * 0.06);
      if (this.rng.next() < chance) {
        const dir = this.rng.range(0, Math.PI * 2);
        b.vel.x = Math.cos(dir) * this.rng.range(60, 120);
        b.vel.y = Math.sin(dir) * this.rng.range(60, 120);
        b.mode = 'free';
        b.ownerId = null;
        b.immunityId = receiver.id;
        b.immunityT = 0.3;
        this.events.push({ type: 'heavyTouch', playerId: receiver.id, pos: { ...b.pos } });
        return;
      }
    }

    b.mode = 'firstTouch';
    b.ownerId = receiver.id;
    b.firstTouchT = T.firstTouchDuration;
    b.receiverHintId = null;
    // Human auto-switch to the receiver (setting-gated at the scene level).
    if (this.config.home.human && receiver.team === 0 && receiver.id !== this.controlledId) {
      this.controlledId = receiver.id;
      this.events.push({ type: 'switch', playerId: receiver.id });
    }
  }

  // ---- actions ------------------------------------------------------------

  private executePass(p: PlayerState, aim: Vec2, lofted: boolean, oneTouch: boolean): void {
    const b = this.ball;
    const mates = this.players.filter((m) => m.team === p.team && m.id !== p.id);
    const coneRad = (T.passConeDeg / 2) * (Math.PI / 180);
    let best: PlayerState | null = null;
    let bestScore = -Infinity;
    for (const m of mates) {
      const to = { x: m.pos.x - p.pos.x, y: m.pos.y - p.pos.y };
      const ang = angleBetween(aim, to);
      if (ang > coneRad) continue;
      const d = vlen(to.x, to.y);
      const score = -ang * 60 - d * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    let target: Vec2;
    let receiverId: string | null = null;
    if (best) {
      const bestAngle = angleBetween(aim, {
        x: best.pos.x - p.pos.x,
        y: best.pos.y - p.pos.y,
      });
      const manual = bestAngle > (T.manualAimAngleDeg * Math.PI) / 180;
      if (manual) {
        target = { x: p.pos.x + aim.x * T.manualPassDistance, y: p.pos.y + aim.y * T.manualPassDistance };
      } else {
        // Contextual through pass: lead a sprinting runner (docs/03 §4.3).
        const mateSpeed = vlen(best.vel.x, best.vel.y);
        const runDot =
          mateSpeed > 40 ? (best.vel.x * aim.x + best.vel.y * aim.y) / mateSpeed : 0;
        const lead =
          runDot > 0.5
            ? this.rng.range(T.throughLeadMin, T.throughLeadMax)
            : T.passLead;
        target = { x: best.pos.x + best.vel.x * lead, y: best.pos.y + best.vel.y * lead };
        receiverId = best.id;
        if (runDot > 0.5) this.counters['throughPasses'] = (this.counters['throughPasses'] ?? 0) + 1;
      }
    } else {
      const near = this.nearestToBall(p.team, p.id);
      target = { x: near.pos.x, y: near.pos.y };
      receiverId = near.id;
    }

    let dir = norm({ x: target.x - p.pos.x, y: target.y - p.pos.y });
    if (oneTouch) {
      const err = ((this.rng.next() * 2 - 1) * T.oneTouchErrorDeg * Math.PI) / 180;
      dir = rotate(dir, err);
      this.events.push({ type: 'oneTouchPass', playerId: p.id });
    }
    const dist = vlen(target.x - p.pos.x, target.y - p.pos.y);
    const speed = T.passSpeed * Math.min(1.35, 0.75 + dist / 200);

    b.pos = { x: p.pos.x + dir.x * (T.playerRadius + 2), y: p.pos.y + dir.y * (T.playerRadius + 2) };
    b.vel = { x: dir.x * speed, y: dir.y * speed };
    b.mode = 'passFlight';
    b.ownerId = null;
    b.receiverHintId = receiverId;
    b.immunityId = p.id;
    b.immunityT = T.kickImmunityT;
    if (lofted) {
      b.vz = GRAVITY * (T.loftAirtime / 2);
      b.z = 0.01;
      b.receiveDelayT = T.loftControlDelay;
      this.events.push({ type: 'loftedPass', playerId: p.id, pos: { ...b.pos } });
    } else {
      b.z = 0;
      b.vz = 0;
      this.events.push({ type: 'pass', playerId: p.id, pos: { ...b.pos } });
    }
    this.counters['passes'] = (this.counters['passes'] ?? 0) + 1;
    p.action = 'kick';
    p.actionT = 0.1;
  }

  private executeShot(p: PlayerState, aim: Vec2): void {
    const b = this.ball;
    const charge = Math.min(1, p.chargeT / T.chargeMaxS);
    const stats = this.statsOf(p.id);
    const goalX = p.team === 0 ? PITCH.maxX + PITCH.goalDepth : PITCH.minX - PITCH.goalDepth;
    const goalDir = norm({ x: goalX - p.pos.x, y: PITCH.centerY - p.pos.y });
    let dir = aim;
    if (angleBetween(aim, goalDir) < (T.shotAssistDeg * Math.PI) / 180) {
      dir = norm({ x: aim.x * 0.4 + goalDir.x * 0.6, y: aim.y * 0.4 + goalDir.y * 0.6 });
    }
    if (p.chargeT > T.chargeSweetS) {
      const jitter = ((this.rng.next() * 2 - 1) * T.overchargeJitterDeg * Math.PI) / 180;
      dir = rotate(dir, jitter);
    }
    const maxSpeed = T.shotMaxSpeed * (1 + (stats.power - 5) * 0.03);
    const speed = T.shotMinSpeed + (maxSpeed - T.shotMinSpeed) * charge;

    b.pos = { x: p.pos.x + dir.x * (T.playerRadius + 2), y: p.pos.y + dir.y * (T.playerRadius + 2) };
    b.vel = { x: dir.x * speed, y: dir.y * speed };
    b.z = 0.01;
    b.vz = charge > 0.6 ? 70 * charge : 0;
    b.mode = 'shotFlight';
    b.ownerId = null;
    b.receiverHintId = null;
    b.immunityId = p.id;
    b.immunityT = T.kickImmunityT;
    this.events.push({ type: 'shotFired', playerId: p.id, team: p.team, speed, pos: { ...b.pos } });
    this.counters['shots'] = (this.counters['shots'] ?? 0) + 1;
    p.action = 'kick';
    p.actionT = 0.12;
  }

  private startTackle(p: PlayerState, aim: Vec2, sprinting: boolean): void {
    const owner = this.ballOwner();
    // Shoulder charge: sprint + tackle right next to the carrier (docs/03 §4.4).
    if (
      owner &&
      owner.team !== p.team &&
      sprinting &&
      vlen(owner.pos.x - p.pos.x, owner.pos.y - p.pos.y) <
        T.playerRadius * 2 + T.shoulderRange
    ) {
      p.stamina = Math.max(0, p.stamina - T.shoulderStamina);
      const myGuard = this.statsOf(p.id).guard + this.rng.range(0, 3);
      const theirGuard = this.statsOf(owner.id).guard + this.rng.range(0, 3);
      if (myGuard > theirGuard && this.ball.ownerProtectedT <= 0) {
        this.stealBall(p, owner);
        this.events.push({ type: 'shoulderWon', playerId: p.id });
        return;
      }
      // Lost the contest: brief stumble.
      p.action = 'stumble';
      p.actionT = T.stumbleDurationS * 0.6;
      return;
    }
    p.action = 'lunge';
    p.actionT = T.lungeDurationS;
    p.vel = { x: aim.x * T.lungeSpeed, y: aim.y * T.lungeSpeed };
    p.facing = aim;
  }

  private resolveLunge(p: PlayerState): void {
    const b = this.ball;
    const owner = this.ballOwner();
    const dBall = vlen(b.pos.x - p.pos.x, b.pos.y - p.pos.y);

    if (owner && owner.team !== p.team) {
      const toCarrier = { x: owner.pos.x - p.pos.x, y: owner.pos.y - p.pos.y };
      const dCarrier = vlen(toCarrier.x, toCarrier.y);
      if (dCarrier < T.lungeReach) {
        // Rear contact never steals cleanly (docs/03 §4.4).
        const behindDot =
          (p.facing.x * owner.facing.x + p.facing.y * owner.facing.y);
        const approachingFromBehind =
          behindDot > Math.cos((T.rearContactConeDeg * Math.PI) / 180) && dBall > dCarrier;
        if (approachingFromBehind) {
          p.action = 'stumble';
          p.actionT = T.stumbleDurationS;
          owner.vel.x += owner.facing.x * 30;
          owner.vel.y += owner.facing.y * 30;
          this.events.push({ type: 'rearContact', playerId: p.id });
          return;
        }
        if (b.ownerProtectedT <= 0 && dBall < T.lungeReach) {
          this.stealBall(p, owner);
          return;
        }
      }
    } else if (!owner && dBall < T.lungeReach && b.z < T.ballTouchHeight && b.immunityId !== p.id) {
      // Free-ball toe poke.
      b.mode = 'firstTouch';
      b.ownerId = p.id;
      b.firstTouchT = T.firstTouchDuration;
      b.ownerProtectedT = T.firstTouchImmunity;
      p.action = 'normal';
      p.actionT = 0;
      this.events.push({ type: 'tackleWon', playerId: p.id });
      this.counters['tackles'] = (this.counters['tackles'] ?? 0) + 1;
    }
  }

  private stealBall(winner: PlayerState, loser: PlayerState): void {
    const b = this.ball;
    b.ownerId = winner.id;
    b.mode = 'firstTouch';
    b.firstTouchT = T.firstTouchDuration;
    b.ownerProtectedT = T.firstTouchImmunity;
    // Ball pops toward the winner (docs/03 §6 feel row).
    const dir = norm({ x: winner.pos.x - loser.pos.x, y: winner.pos.y - loser.pos.y });
    b.pos.x = winner.pos.x + dir.x * 4;
    b.pos.y = winner.pos.y + dir.y * 4;
    b.vel = { x: 0, y: 0 };
    if (winner.action === 'lunge') {
      winner.action = 'normal';
      winner.actionT = 0;
    }
    this.events.push({ type: 'tackleWon', playerId: winner.id });
    this.counters['tackles'] = (this.counters['tackles'] ?? 0) + 1;
    if (this.config.home.human && winner.team === 0) {
      this.controlledId = winner.id;
      this.events.push({ type: 'switch', playerId: winner.id });
    }
  }

  private updateBuffers(dt: number): void {
    for (const buf of this.buffers.values()) {
      buf.pass = Math.max(0, buf.pass - dt);
      buf.shoot = Math.max(0, buf.shoot - dt);
    }
  }

  // ---- AI view ------------------------------------------------------------

  private internalView(): AiView {
    return {
      players: this.players,
      ball: this.ball,
      phase: this.phase,
      controlledId: this.controlledId,
    };
  }
}

export interface AiView {
  players: PlayerState[];
  ball: BallState;
  phase: MatchPhase;
  controlledId: string;
}
