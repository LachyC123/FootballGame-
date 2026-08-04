import type Phaser from 'phaser';

/**
 * Audio unlock stub (Master Plan P7): resume the Web Audio context from the first
 * intentional gesture. A blocked or failed unlock must never block play.
 */
export function unlockAudio(scene: Phaser.Scene): void {
  const sound = scene.sound;
  if ('context' in sound) {
    const ctx = (sound as { context?: AudioContext }).context;
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
  }
}
