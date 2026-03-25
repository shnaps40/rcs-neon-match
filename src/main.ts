import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { MainMenuScene } from './game/scenes/MainMenuScene';
import { GameScene } from './game/scenes/GameScene';
import { RoomScene } from './game/scenes/RoomScene';
import { CharacterSelectScene } from './game/scenes/CharacterSelectScene';
import { audioManager } from './audio/AudioManager';

declare global {
  interface Window {
    audioManager: typeof audioManager;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 320, height: 480 },
    max: { width: 1080, height: 1920 },
  },
  backgroundColor: '#0A0A0F',
  parent: 'game-container',
  input: {
    activePointers: 3,
  },
  scene: [
    BootScene,
    MainMenuScene,
    GameScene,
    RoomScene,
    CharacterSelectScene,
  ],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};

const game = new Phaser.Game(config);

game.events.on('ready', () => {
  console.log('NEON MATCH ready!');
  window.audioManager = audioManager;
});

game.events.on('start', () => {
  const mainMenuScene = game.scene.getScene('MainMenuScene') as Phaser.Scene;
  if (mainMenuScene) {
    audioManager.init(mainMenuScene);
  }
});
