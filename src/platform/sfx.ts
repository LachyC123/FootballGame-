import { loadSettings } from './settings';

/**
 * PH- placeholder SFX synth (docs/07 §6): tiny WebAudio recipes standing in for
 * the Kenney-derived event pools that land in Phase 2. Recipes are committed
 * code, so they're reproducible. All output respects the mute setting.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function blip(freq: number, durS: number, type: OscillatorType, gainV: number, slideTo?: number): void {
  if (loadSettings().muted) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), ac.currentTime + durS);
  }
  gain.gain.setValueAtTime(gainV, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + durS);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durS);
}

function noise(durS: number, gainV: number): void {
  if (loadSettings().muted) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  const len = Math.floor(ac.sampleRate * durS);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = gainV;
  src.connect(gain).connect(ac.destination);
  src.start();
}

export function resumeSfx(): void {
  const ac = audio();
  if (ac && ac.state === 'suspended') void ac.resume().catch(() => undefined);
}

export function getAudioContext(): AudioContext | null {
  return audio();
}

/** Lifecycle hooks: hard-suspend ALL game audio (sfx, crowd, music) on hide. */
export function suspendAllAudio(): void {
  if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
}

export function resumeAllAudio(): void {
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}

let crowdSrc: AudioBufferSourceNode | null = null;
let crowdGain: GainNode | null = null;
let crowdBase = 0.05;

/** Looping filtered-noise crowd bed (docs/07 §6 allows a generated crowd loop). */
export const crowd = {
  start(volume = 0.05): void {
    if (loadSettings().muted) return;
    const ac = audio();
    if (!ac || crowdSrc) return;
    crowdBase = volume;
    const len = Math.floor(ac.sampleRate * 2);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // Brown-ish noise reads as distant crowd once lowpassed.
      last = (last + (Math.random() * 2 - 1) * 0.02) * 0.98;
      data[i] = last * 8;
    }
    crowdSrc = ac.createBufferSource();
    crowdSrc.buffer = buffer;
    crowdSrc.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    crowdGain = ac.createGain();
    crowdGain.gain.value = volume;
    crowdSrc.connect(filter).connect(crowdGain).connect(ac.destination);
    crowdSrc.start();
  },
  stop(): void {
    crowdSrc?.stop();
    crowdSrc?.disconnect();
    crowdGain?.disconnect();
    crowdSrc = null;
    crowdGain = null;
  },
  /** Roar: the bed surges (goal = big, near-miss = short gasp) then settles. */
  swell(mult = 4, fallS = 1.8): void {
    const ac = audio();
    if (!ac || !crowdGain) return;
    const t = ac.currentTime;
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
    crowdGain.gain.linearRampToValueAtTime(crowdBase * mult, t + 0.1);
    crowdGain.gain.linearRampToValueAtTime(crowdBase, t + fallS);
  },
};

export const sfx = {
  pass: (pitchVar: number): void => blip(220 * (1 + pitchVar * 0.1), 0.07, 'triangle', 0.25, 140),
  kick: (charge: number): void => blip(140 + charge * 60, 0.12, 'square', 0.3, 60),
  wall: (speed: number): void => {
    blip(90, 0.09, 'sawtooth', Math.min(0.35, speed / 1400), 50);
    noise(0.05, Math.min(0.2, speed / 2000));
  },
  post: (): void => blip(1200, 0.2, 'sine', 0.3, 900),
  tackle: (): void => noise(0.09, 0.22),
  stumble: (): void => blip(160, 0.12, 'sine', 0.12, 80),
  bell: (): void => {
    blip(660, 0.5, 'sine', 0.35, 655);
    blip(1320, 0.35, 'sine', 0.18, 1310);
    noise(0.25, 0.12);
  },
  whistle: (): void => {
    blip(2200, 0.18, 'square', 0.14);
    blip(2200, 0.18, 'square', 0.14, 2100);
  },
  switch: (): void => blip(880, 0.04, 'triangle', 0.1),
  ui: (): void => blip(520, 0.05, 'triangle', 0.15),
};
