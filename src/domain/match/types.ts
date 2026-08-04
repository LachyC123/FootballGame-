/** Pure match types (docs/03). No Phaser, no DOM. */

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerStats {
  pace: number;
  power: number;
  touch: number;
  guard: number;
  engine: number;
}

export interface PlayerSetup {
  id: string;
  stats: PlayerStats;
}

export interface TeamSetup {
  teamId: string;
  players: PlayerSetup[]; // exactly 3 fielded
  human: boolean;
  aiProfile: AiProfile;
  reactionMs: number;
}

export interface AiProfile {
  press: number;
  line: number;
  tempo: number;
  risk: number;
  phys: number;
  show: number;
  wall: number;
  stam: number;
}

export interface MatchRules {
  durationS: number;
  scoreLimit: number;
  goldenGoal: boolean;
}

export interface MatchConfig {
  seed: number;
  rules: MatchRules;
  home: TeamSetup; // attacks RIGHT goal (scores into right)
  away: TeamSetup; // attacks LEFT goal
}

export type PlayerAction = 'normal' | 'lunge' | 'stumble' | 'kick';

export interface PlayerState {
  id: string;
  team: 0 | 1;
  pos: Vec2;
  vel: Vec2;
  facing: Vec2; // unit vector, last non-zero intent
  stamina: number;
  sprintLocked: boolean;
  sprinting: boolean;
  action: PlayerAction;
  actionT: number; // seconds remaining in action
  chargeT: number; // shot charge time held (s), 0 when not charging
  passHoldT: number; // pass button hold time (s), -1 when not held
}

export type BallMode = 'free' | 'firstTouch' | 'controlled' | 'passFlight' | 'shotFlight' | 'dead';

export interface BallState {
  pos: Vec2;
  vel: Vec2;
  z: number;
  vz: number;
  mode: BallMode;
  ownerId: string | null;
  firstTouchT: number;
  immunityId: string | null; // kicker who may not reclaim (cleared by wall bounce)
  immunityT: number;
  ownerProtectedT: number; // tackle immunity after a clean first touch
  receiveDelayT: number; // lofted-pass worse first touch (docs/03 §4.3)
  receiverHintId: string | null;
}

export type MatchPhase = 'kickoff' | 'play' | 'bell' | 'goldenGoal' | 'fullTime';

export interface MatchEvent {
  type:
    | 'kickoff'
    | 'pass'
    | 'loftedPass'
    | 'oneTouchPass'
    | 'firstTouch'
    | 'heavyTouch'
    | 'shotFired'
    | 'wallBounce'
    | 'postHit'
    | 'bell'
    | 'tackleWon'
    | 'tackleMissed'
    | 'rearContact'
    | 'shoulderWon'
    | 'switch'
    | 'fullTime'
    | 'goldenGoalStart';
  playerId?: string;
  team?: 0 | 1;
  pos?: Vec2;
  speed?: number;
}

export interface PlayerCommand {
  moveX: number; // -1..1
  moveY: number; // -1..1
  sprint: boolean;
  pass: boolean; // held state; edges derived in core
  shoot: boolean; // held state
}

export const NEUTRAL_COMMAND: PlayerCommand = {
  moveX: 0,
  moveY: 0,
  sprint: false,
  pass: false,
  shoot: false,
};

export interface MatchSnapshot {
  tick: number;
  clockS: number;
  phase: MatchPhase;
  phaseT: number;
  score: [number, number];
  kickoffTeam: 0 | 1;
  players: PlayerState[];
  ball: BallState;
  controlledId: string; // human-controlled player (team 0 in v1)
  counters: Record<string, number>; // ledger/promise counters (docs/04 §7)
}
