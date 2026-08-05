import { getAudioContext } from './sfx';
import { loadSettings } from './settings';

/**
 * Authored chiptune sequencer — two committed compositions, not random
 * placeholder noise (docs/07 music rule: silence beats bad placeholder; these
 * are deliberate, mixed low, and replaceable by licensed tracks later).
 * Voices: triangle bass, square lead (lowpassed), soft noise hat.
 */
interface Track {
  bpm: number;
  steps: number; // 16th-note steps per loop
  bass: Array<[step: number, midi: number, lenSteps: number]>;
  lead: Array<[step: number, midi: number, lenSteps: number]>;
  hats: number[];
  leadVol: number;
  bassVol: number;
}

const TRACKS: Record<string, Track> = {
  // Old Cobble: slow D-dorian tolling — long bass pedals, a lead that moves
  // like a bell ringer counting, almost no percussion. The hill is quiet.
  cloister: {
    bpm: 66,
    steps: 64,
    bassVol: 0.09,
    leadVol: 0.038,
    bass: [
      [0, 26, 30], // D1 pedal
      [32, 31, 14], // G1
      [48, 29, 14], // F1
    ],
    lead: [
      [0, 62, 6], [12, 69, 6],
      [24, 67, 4], [30, 64, 8],
      [40, 62, 6], [52, 57, 10],
    ],
    hats: [16, 48],
  },
  // Spicegate: D-phrygian sway — the flat second reads as market haze; busier
  // hats stand in for hand drums.
  market: {
    bpm: 96,
    steps: 64,
    bassVol: 0.10,
    leadVol: 0.042,
    bass: [
      [0, 38, 6], [8, 38, 3], [12, 41, 3],
      [16, 39, 6], [24, 38, 3], [28, 36, 3],
      [32, 38, 6], [40, 43, 3], [44, 41, 3],
      [48, 39, 6], [56, 38, 6],
    ],
    lead: [
      [0, 62, 3], [4, 63, 2], [8, 65, 4],
      [16, 67, 3], [20, 65, 2], [24, 63, 4],
      [32, 70, 3], [36, 69, 2], [40, 67, 4],
      [48, 63, 3], [52, 62, 8],
    ],
    hats: [0, 6, 8, 14, 16, 22, 24, 30, 32, 38, 40, 46, 48, 54, 56, 62],
  },
  // "Lowline Dawn" energy: sparse D-minor lull for title/story.
  harbor: {
    bpm: 84,
    steps: 64,
    bassVol: 0.10,
    leadVol: 0.045,
    bass: [
      [0, 38, 14], // D2
      [16, 34, 14], // Bb1
      [32, 41, 14], // F2
      [48, 36, 14], // C2
    ],
    lead: [
      [0, 69, 3], [6, 65, 2], [10, 62, 4],
      [18, 74, 3], [24, 72, 4],
      [32, 69, 3], [38, 72, 2], [44, 69, 3],
      [52, 67, 3], [56, 64, 6],
    ],
    hats: [8, 24, 40, 56],
  },
  // Match energy: driving Dm riff.
  match: {
    bpm: 118,
    steps: 64,
    bassVol: 0.11,
    leadVol: 0.05,
    bass: [
      [0, 38, 2], [4, 38, 2], [8, 50, 1], [10, 38, 2], [12, 45, 2],
      [16, 38, 2], [20, 38, 2], [24, 50, 1], [26, 38, 2], [28, 45, 2],
      [32, 34, 2], [36, 34, 2], [40, 46, 1], [42, 34, 2], [44, 41, 2],
      [48, 36, 2], [52, 36, 2], [56, 48, 1], [58, 43, 2], [60, 45, 2],
    ],
    lead: [
      [0, 62, 2], [4, 65, 2], [8, 69, 3], [12, 65, 2],
      [16, 62, 2], [20, 65, 2], [24, 72, 3], [28, 69, 2],
      [32, 70, 2], [36, 65, 2], [40, 62, 3],
      [48, 72, 2], [52, 71, 2], [56, 69, 4],
    ],
    hats: [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62],
  },
};

function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

class MusicEngine {
  private current: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;
  private master: GainNode | null = null;

  play(name: string): void {
    if (this.current === name) return;
    this.stop(150);
    const track = TRACKS[name];
    const ctx = getAudioContext();
    if (!track || !ctx) return;
    this.current = name;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.8);
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.05;
    const stepDur = 60 / track.bpm / 4;
    this.timer = setInterval(() => {
      const settings = loadSettings();
      const vol = settings.muted ? 0 : settings.musicVolume;
      if (!ctx || ctx.state !== 'running' || !this.master) return;
      while (this.nextStepTime < ctx.currentTime + 0.2) {
        const s = this.step % track.steps;
        if (vol > 0) {
          for (const [at, midi, len] of track.bass) {
            if (at === s) this.voice(ctx, 'triangle', midi, this.nextStepTime, len * stepDur, track.bassVol * vol);
          }
          for (const [at, midi, len] of track.lead) {
            if (at === s) this.voice(ctx, 'square', midi, this.nextStepTime, len * stepDur, track.leadVol * vol);
          }
          if (track.hats.includes(s)) this.hat(ctx, this.nextStepTime, 0.015 * vol);
        }
        this.nextStepTime += stepDur;
        this.step++;
      }
    }, 60);
  }

  stop(fadeMs = 400): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    const ctx = getAudioContext();
    const master = this.master;
    if (ctx && master) {
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
      setTimeout(() => master.disconnect(), fadeMs + 100);
    }
    this.master = null;
  }

  private voice(
    ctx: AudioContext,
    type: OscillatorType,
    midi: number,
    at: number,
    dur: number,
    vol: number,
  ): void {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = midiToHz(midi);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = type === 'square' ? 2200 : 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(vol, at + 0.01);
    gain.gain.setValueAtTime(vol, at + Math.max(0.02, dur - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  private hat(ctx: AudioContext, at: number, vol: number): void {
    if (!this.master) return;
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(at);
  }
}

export const music = new MusicEngine();
