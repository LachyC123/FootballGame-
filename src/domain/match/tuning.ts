/**
 * Starting tuning values from docs/03 — expected to change during the Phase 1
 * device feel pass. Units: px, px/s, px/s², seconds. Update docs in the same
 * commit when these move (docs/08 standing rule 5).
 */
export const TUNING = {
  fixedDt: 1 / 60,

  // Movement (docs/03 §4.1)
  baseSpeed: 85,
  sprintMult: 1.45,
  accel: 600,
  friction: 800,
  statSpeedSpread: 0.04, // ±20% at stats 1..10 around 5

  // Ball (docs/03 §3, §4.2)
  ballRadius: 3,
  playerRadius: 5,
  ballDragFree: 0.985, // per tick
  wallRestitution: 0.82,
  shotWallRestitution: 0.88,
  controlRadius: 8,
  dribbleOffset: 6,
  sprintDribbleOffset: 10,
  dribbleSpring: 14, // 1/s pull toward dribble point
  firstTouchDuration: 0.15,
  firstTouchImmunity: 0.15,
  kickImmunityT: 0.12, // kicker cannot reclaim (unless wall bounce)
  maxControlSpeed: 260, // faster balls cannot be first-touched
  pressureMiscontrolChance: 0.25, // at touch 5, opponent within pressure radius
  pressureRadius: 14,
  ballTouchHeight: 10, // z below which players can play the ball

  // Passing (docs/03 §4.3)
  passSpeed: 240,
  passLead: 0.25,
  passConeDeg: 120,
  loftHoldS: 0.25,
  loftAirtime: 0.55,
  loftControlDelay: 0.3,
  throughLeadMin: 0.3,
  throughLeadMax: 0.6,
  manualAimAngleDeg: 40,
  manualPassDistance: 120,
  oneTouchErrorDeg: 10,
  inputBufferS: 0.12,

  // Shooting (docs/03 §4.4)
  shotMinSpeed: 260,
  shotMaxSpeed: 420,
  chargeMaxS: 0.6,
  chargeSweetS: 0.5,
  overchargeJitterDeg: 6,
  shotAssistDeg: 30,
  shotChargeSlowMult: 0.55, // carrier slows while charging

  // Tackling (docs/03 §4.4)
  lungeSpeed: 140,
  lungeDurationS: 0.12,
  lungeReach: 14,
  stumbleDurationS: 0.5,
  rearContactConeDeg: 60,
  shoulderRange: 6,
  shoulderStamina: 25,

  // Stamina (docs/03 §5)
  staminaMax: 100,
  sprintDrain: 18,
  staminaRecover: 12,
  staminaRecoverIdle: 20,
  sprintLockAt: 20,
  sprintUnlockAt: 40,

  // Match flow (docs/03 §1, §11)
  bellPauseS: 1.5,
  kickoffFreezeS: 0.8,
  goldenGoalCapS: 60,

  // Goalmouth scramble (docs/03 §4.6)
  scrambleAccelMult: 1.3,
} as const;
