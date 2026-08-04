import Phaser from 'phaser';
import type { PlayerCommand } from '../../domain/match/types';

/**
 * Input pipeline (docs/03 §7, docs/05 §5): Pointer Events + keyboard map into
 * one semantic PlayerCommand. Floating stick on the left half; two buttons
 * (A=pass, B=shoot) on the right; sprint = stick pushed past 80% radius.
 * pointercancel / blur / suspend clears ALL held state (ghost-input rule).
 */
export interface TouchButtonLayout {
  x: number;
  y: number;
  r: number; // visible radius
  hitR: number; // forgiving hit radius
}

export interface TouchLayout {
  a: TouchButtonLayout;
  b: TouchButtonLayout;
}

const STICK_RADIUS = 34; // world px at 480×270 (≈48 CSS px on phones)
const STICK_DEAD = 0.12;
const SPRINT_AT = 0.8;

export class InputService {
  private scene: Phaser.Scene;
  private layout: TouchLayout;

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private stickPointerId = -1;
  private stickOrigin = { x: 0, y: 0 };
  private stickVec = { x: 0, y: 0 }; // -1..1
  private stickSprint = false;

  private aPointerId = -1;
  private bPointerId = -1;

  constructor(scene: Phaser.Scene, layout: TouchLayout) {
    this.scene = scene;
    this.layout = layout;

    const kb = scene.input.keyboard;
    if (kb) {
      const add = (name: string, code: number): void => {
        this.keys[name] = kb.addKey(code, false);
      };
      const K = Phaser.Input.Keyboard.KeyCodes;
      add('up', K.W);
      add('down', K.S);
      add('left', K.A);
      add('right', K.D);
      add('up2', K.UP);
      add('down2', K.DOWN);
      add('left2', K.LEFT);
      add('right2', K.RIGHT);
      add('pass', K.J);
      add('pass2', K.Z);
      add('shoot', K.K);
      add('shoot2', K.X);
      add('sprint', K.SHIFT);
    }

    scene.input.addPointer(3);
    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
    scene.input.on('pointerupoutside', this.onPointerUp, this);
    scene.game.events.on('solport-suspend', this.reset, this);
    scene.events.once('shutdown', () => {
      scene.game.events.off('solport-suspend', this.reset, this);
    });
  }

  /** Clear every held input — suspend, pause, scene change. */
  reset(): void {
    this.stickPointerId = -1;
    this.stickVec = { x: 0, y: 0 };
    this.stickSprint = false;
    this.aPointerId = -1;
    this.bPointerId = -1;
  }

  sample(): PlayerCommand {
    let x = this.stickVec.x;
    let y = this.stickVec.y;
    let sprint = this.stickSprint;
    let pass = this.aPointerId !== -1;
    let shoot = this.bPointerId !== -1;

    const down = (name: string): boolean => this.keys[name]?.isDown ?? false;
    const kx = (down('right') || down('right2') ? 1 : 0) - (down('left') || down('left2') ? 1 : 0);
    const ky = (down('down') || down('down2') ? 1 : 0) - (down('up') || down('up2') ? 1 : 0);
    if (kx !== 0 || ky !== 0) {
      const l = Math.hypot(kx, ky);
      x = kx / l;
      y = ky / l;
    }
    if (down('sprint')) sprint = true;
    if (down('pass') || down('pass2')) pass = true;
    if (down('shoot') || down('shoot2')) shoot = true;

    return { moveX: x, moveY: y, sprint, pass, shoot };
  }

  /** Live stick state for rendering the touch UI. */
  touchState(): {
    stick: { active: boolean; origin: { x: number; y: number }; vec: { x: number; y: number } };
    a: boolean;
    b: boolean;
  } {
    return {
      stick: {
        active: this.stickPointerId !== -1,
        origin: { ...this.stickOrigin },
        vec: { ...this.stickVec },
      },
      a: this.aPointerId !== -1,
      b: this.bPointerId !== -1,
    };
  }

  private hitButton(btn: TouchButtonLayout, px: number, py: number): boolean {
    return Math.hypot(px - btn.x, py - btn.y) <= btn.hitR;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const px = pointer.worldX;
    const py = pointer.worldY;
    if (this.hitButton(this.layout.a, px, py) && this.aPointerId === -1) {
      this.aPointerId = pointer.id;
      return;
    }
    if (this.hitButton(this.layout.b, px, py) && this.bPointerId === -1) {
      this.bPointerId = pointer.id;
      return;
    }
    if (px < 480 * 0.55 && this.stickPointerId === -1) {
      this.stickPointerId = pointer.id;
      this.stickOrigin = { x: px, y: py };
      this.stickVec = { x: 0, y: 0 };
      this.stickSprint = false;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId) return;
    const dx = pointer.worldX - this.stickOrigin.x;
    const dy = pointer.worldY - this.stickOrigin.y;
    const d = Math.hypot(dx, dy);
    if (d < STICK_RADIUS * STICK_DEAD) {
      this.stickVec = { x: 0, y: 0 };
      this.stickSprint = false;
      return;
    }
    const clamped = Math.min(1, d / STICK_RADIUS);
    this.stickVec = { x: (dx / d) * clamped, y: (dy / d) * clamped };
    this.stickSprint = clamped >= SPRINT_AT;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.stickPointerId) {
      this.stickPointerId = -1;
      this.stickVec = { x: 0, y: 0 };
      this.stickSprint = false;
    }
    if (pointer.id === this.aPointerId) this.aPointerId = -1;
    if (pointer.id === this.bPointerId) this.bPointerId = -1;
  }
}
