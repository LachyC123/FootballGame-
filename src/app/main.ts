import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { TitleScene } from '../scenes/TitleScene';
import { MatchScene } from '../scenes/MatchScene';
import { DialogueScene } from '../scenes/DialogueScene';
import { StoryScene } from '../scenes/StoryScene';
import { installLifecycle } from '../platform/lifecycle';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0e0e14',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, TitleScene, StoryScene, MatchScene, DialogueScene],
});

installLifecycle(game);

// Exposed for Playwright journeys and the dev console only.
declare global {
  interface Window {
    __SOLPORT__?: { game: Phaser.Game; scene?: string };
  }
}
window.__SOLPORT__ = { game };
