import Phaser from 'phaser';
import { FONT_BODY, FS_BODY, GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import type { DialogueGraph, DialogueNode } from '../domain/progress/dialogue';
import { SfxPlayer } from '../platform/sfxPlayer';
import dialoguesRaw from '../content/data/dialogue/ch1.json';
import speakersRaw from '../content/data/speakers.json';

interface SpeakerMeta {
  name: string;
  portrait: string | null;
  blipDetune: number;
}

const SPEAKERS = speakersRaw as Record<string, SpeakerMeta>;
const DIALOGUES = dialoguesRaw as unknown as Record<string, DialogueGraph>;

export interface DialogueSceneData {
  dialogueId: string;
}

/**
 * Overlay dialogue scene (docs/02 §4, docs/05 §3): portrait, typewriter,
 * per-speaker blips, two-choice support. Emits 'dialogue-done' on the game
 * event bus with the flags collected during the conversation.
 */
export class DialogueScene extends Phaser.Scene {
  private graph!: DialogueGraph;
  private node!: DialogueNode;
  private dialogueId = '';
  private flags: string[] = [];
  private sfxp!: SfxPlayer;

  private panel!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private portraitImg!: Phaser.GameObjects.Image;
  private promptTri!: Phaser.GameObjects.Triangle;
  private choiceTexts: Phaser.GameObjects.Text[] = [];

  private fullText = '';
  private shownChars = 0;
  private typing = false;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private nodeFlagsApplied = false;

  constructor() {
    super('Dialogue');
  }

  create(data: DialogueSceneData): void {
    this.dialogueId = data.dialogueId;
    const graph = DIALOGUES[data.dialogueId];
    if (!graph) throw new Error(`Unknown dialogue: ${data.dialogueId}`);
    this.graph = graph;
    this.flags = [];
    this.sfxp = new SfxPlayer(this);

    const px = 10;
    const pw = GAME_WIDTH - 20;
    const ph = 78;
    const py = GAME_HEIGHT - ph - 8;
    this.add.rectangle(px + pw / 2 + 2, py + ph / 2 + 3, pw, ph, 0x000000, 0.45);
    this.panel = this.add
      .rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x131118, 0.96)
      .setStrokeStyle(1, 0xf2c14e, 0.85);
    this.add.rectangle(px + pw / 2, py + 1, pw - 2, 1, 0x2a2433, 1);
    this.portraitImg = this.add.image(px + 26, py + ph / 2, '__DEFAULT').setScale(2);
    this.nameText = this.add.text(px + 50, py + 4, '', {
      fontFamily: FONT_BODY,
      fontSize: FS_BODY,
      color: '#f2c14e',
    });
    this.bodyText = this.add.text(px + 50, py + 22, '', {
      fontFamily: FONT_BODY,
      fontSize: FS_BODY,
      color: '#e8e3d0',
      wordWrap: { width: pw - 64 },
      lineSpacing: 2,
    });
    this.promptTri = this.add
      .triangle(px + pw - 10, py + ph - 8, 0, 0, 6, 0, 3, 4, 0xf2c14e)
      .setVisible(false);
    this.tweens.add({
      targets: this.promptTri,
      y: py + ph - 6,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    this.input.on('pointerdown', this.advance, this);
    this.input.keyboard?.on('keydown-J', this.advance, this);
    this.input.keyboard?.on('keydown-SPACE', this.advance, this);
    this.input.keyboard?.on('keydown-ENTER', this.advance, this);

    this.showNode(this.graph.start);
    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Dialogue';
  }

  private showNode(id: string): void {
    const node = this.graph.nodes[id];
    if (!node) throw new Error(`Dialogue node missing: ${id}`);
    this.node = node;
    this.nodeFlagsApplied = false;
    this.clearChoices();

    const meta = SPEAKERS[node.speaker] ?? SPEAKERS['system']!;
    this.nameText.setText(meta.name);
    if (meta.portrait && this.textures.exists(meta.portrait)) {
      this.portraitImg.setTexture(meta.portrait).setVisible(true);
    } else {
      this.portraitImg.setVisible(false);
    }

    this.fullText = node.text;
    this.shownChars = 0;
    this.typing = true;
    this.promptTri.setVisible(false);
    this.bodyText.setText('');
    this.typeTimer?.remove();
    this.typeTimer = this.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        this.shownChars++;
        this.bodyText.setText(this.fullText.slice(0, this.shownChars));
        if (this.shownChars % 3 === 0 && this.node.speaker !== 'system') {
          this.sfxp.play('uiClick', 0.12, 60 + Math.abs(meta.blipDetune));
        }
        if (this.shownChars >= this.fullText.length) {
          this.finishTyping();
        }
      },
    });
  }

  private finishTyping(): void {
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.typing = false;
    this.bodyText.setText(this.fullText);
    if (this.node.choices && this.node.choices.length > 0) {
      this.showChoices();
    } else {
      this.promptTri.setVisible(true);
    }
  }

  private showChoices(): void {
    const choices = this.node.choices ?? [];
    choices.forEach((choice, i) => {
      const t = this.add
        .text(GAME_WIDTH - 24, GAME_HEIGHT - 92 - (choices.length - 1 - i) * 22, `▸ ${choice.text}`, {
          fontFamily: FONT_BODY,
          fontSize: FS_BODY,
          color: '#e8e3d0',
          backgroundColor: '#141218ee',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(1, 1)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#f2c14e'));
      t.on('pointerout', () => t.setColor('#e8e3d0'));
      t.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev?: { stopPropagation?: () => void }) => {
        ev?.stopPropagation?.();
        this.pickChoice(i);
      });
      this.choiceTexts.push(t);
    });
    this.input.keyboard?.once('keydown-ONE', () => this.pickChoice(0));
    this.input.keyboard?.once('keydown-TWO', () => this.pickChoice(1));
  }

  private clearChoices(): void {
    for (const t of this.choiceTexts) t.destroy();
    this.choiceTexts = [];
  }

  private pickChoice(index: number): void {
    const choice = this.node.choices?.[index];
    if (!choice) return;
    this.sfxp.play('uiSelect', 0.5);
    if (choice.flags) this.flags.push(...choice.flags);
    this.applyNodeFlags();
    this.clearChoices();
    this.showNode(choice.next);
  }

  private advance = (): void => {
    if (this.typing) {
      this.shownChars = this.fullText.length;
      this.finishTyping();
      return;
    }
    if (this.choiceTexts.length > 0) return; // must pick a choice
    this.applyNodeFlags();
    if (this.node.end || !this.node.next) {
      this.done();
    } else {
      this.sfxp.play('uiClick', 0.2);
      this.showNode(this.node.next);
    }
  };

  private applyNodeFlags(): void {
    if (this.node.setFlags && !this.nodeFlagsApplied) {
      this.flags.push(...this.node.setFlags);
      this.nodeFlagsApplied = true;
    }
  }

  private done(): void {
    this.typeTimer?.remove();
    const payload = { dialogueId: this.dialogueId, flags: [...this.flags] };
    // Stop BEFORE emitting: the listener may relaunch this scene for the next
    // conversation, and launching a still-active scene is a silent no-op.
    this.scene.stop();
    this.game.events.emit('dialogue-done', payload);
  }
}

export { DIALOGUES, SPEAKERS };
