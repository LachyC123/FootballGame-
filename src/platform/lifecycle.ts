import type Phaser from 'phaser';
import { resumeAllAudio, suspendAllAudio } from './sfx';

/**
 * Lifecycle contract (Master Plan §4): on hide — pause simulation and audio.
 * On return — nothing may have advanced; large deltas are clamped by the
 * fixed-step accumulator (Phase 1). Held-input clearing hooks in at Phase 1's
 * input pipeline via the events emitted here.
 */
export function installLifecycle(game: Phaser.Game): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.loop.sleep();
      game.sound.mute = true;
      suspendAllAudio();
      game.events.emit('solport-suspend');
    } else {
      game.loop.wake();
      game.sound.mute = false;
      resumeAllAudio();
      game.events.emit('solport-resume');
    }
  });
}
