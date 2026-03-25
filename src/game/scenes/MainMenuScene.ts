import Phaser from 'phaser';
import { SaveSystem } from '../../meta/SaveSystem';
import { audioManager } from '../../audio/AudioManager';

export class MainMenuScene extends Phaser.Scene {
  private saveSystem!: SaveSystem;
  private coinsText!: Phaser.GameObjects.Text;
  private starsText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private hammersText!: Phaser.GameObjects.Text;
  private audioToggleBtn!: Phaser.GameObjects.Text;
  private audioNextBtn!: Phaser.GameObjects.Text;
  private trackText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  preload(): void {
    this.load.image('Home', '/Home.png');
    this.load.image('LogoViolet', '/LogoViolet.png');
  }

  create(): void {
    this.saveSystem = new SaveSystem();
    this.cameras.main.setBackgroundColor(0x0A0A0F);
    
    this.createBackground();
    this.createHeader();
    this.createMenu();
    this.createFooter();
    this.createAudioPlayer();
    
    audioManager.init(this);
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    const homeBg = this.add.image(width / 2, height / 2, 'Home');
    const scaleX = width / homeBg.width;
    const scaleY = height / homeBg.height;
    const scale = Math.max(scaleX, scaleY);
    homeBg.setScale(scale);
    homeBg.setAlpha(0.4);

    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x1A1A2E, 0.3);
    
    for (let x = 0; x < width; x += 40) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 40) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(width, y);
    }
    gridGraphics.strokePath();

    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const color = Phaser.Math.RND.pick([0xFF00FF, 0x00FFFF, 0x0066FF, 0x00FF66]);
      const star = this.add.circle(x, y, Phaser.Math.Between(1, 3), color, 0.5);
      
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(500, 2000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createHeader(): void {
    const { width } = this.cameras.main;

    this.coinsText = this.add.text(20, 20, `💰 ${this.saveSystem.getCoins()}`, {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: '#FFFF00',
    });

    this.starsText = this.add.text(width - 20, 20, `⭐ ${this.saveSystem.getStars()}`, {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: '#FF00FF',
    }).setOrigin(1, 0);

    this.energyText = this.add.text(width / 2, 20, `⚡ ${this.saveSystem.getEnergy()}/30`, {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: '#00FFFF',
    }).setOrigin(0.5, 0);

    this.hammersText = this.add.text(20, 50, `🔨 ${this.saveSystem.getHammers()}`, {
      fontFamily: 'Orbitron',
      fontSize: '16px',
      color: '#FF6600',
    });

    const addHammerBtn = this.add.text(80, 52, '+', {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: '#FF6600',
    }).setInteractive({ useHandCursor: true });
    addHammerBtn.on('pointerdown', () => {
      this.saveSystem.addHammer();
    });
  }

  private createMenu(): void {
    const { width, height } = this.cameras.main;

    const logoContainer = this.add.container(width / 2, 160);

    const logo = this.add.image(0, 0, 'LogoViolet');
    logo.setScale(Math.min(width * 0.6 / logo.width, 0.35));
    logoContainer.add(logo);

    this.tweens.add({
      targets: logoContainer,
      scaleX: 1.015,
      scaleY: 1.015,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: logoContainer,
      y: 155,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(width / 2, 280, 'RCS', {
      fontFamily: 'Orbitron',
      fontSize: '36px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.add.text(width / 2, 320, 'ALPHA', {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0.5);

    const playBtn = this.createButton(width / 2, 420, 'PLAY', 0x00FF66, () => {
      this.scene.start('GameScene');
    });

    const characterBtn = this.createButton(width / 2, 495, 'HERO', 0x00FFFF, () => {
      this.scene.start('CharacterSelectScene');
    });

    const roomBtn = this.createButton(width / 2, 570, 'ROOM', 0xFF00FF, () => {
      this.scene.start('RoomScene');
    });

    const level = this.saveSystem.getCurrentLevel();
    this.add.text(width / 2, 640, `LEVEL ${level}`, {
      fontFamily: 'Orbitron',
      fontSize: '24px',
      color: '#666688',
    }).setOrigin(0.5);

    // Quick test: Tile showcase button
    const showcaseBtn = this.createButton(width / 2, 700, 'TILE TEST', 0x0066FF, () => {
      this.scene.start('TileShowcaseScene');
    });
  }

  private createButton(
    x: number, 
    y: number, 
    label: string, 
    color: number, 
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const width = 200;
    const height = 60;
    
    bg.fillStyle(color, 0.2);
    bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
    bg.lineStyle(3, color, 1);
    bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron',
      fontSize: '28px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.4);
      bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
      bg.lineStyle(3, color, 1);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 0.2);
      bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
      bg.lineStyle(3, color, 1);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);
    });

    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => onClick(),
      });
    });

    return container;
  }

  private createFooter(): void {
    const { width, height } = this.cameras.main;

    const version = this.add.text(width / 2, height - 20, 'v1.0.0', {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#333355',
    }).setOrigin(0.5);
  }

  private createAudioPlayer(): void {
    const { width, height } = this.cameras.main;
    const playerY = height - 60;

    const playerBg = this.add.graphics();
    playerBg.fillStyle(0x1A1A2E, 0.7);
    playerBg.fillRoundedRect(width / 2 - 100, playerY - 15, 200, 35, 10);
    playerBg.setScrollFactor(0);

    this.audioToggleBtn = this.add.text(width / 2 - 50, playerY, '🔊', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true });
    this.audioToggleBtn.setScrollFactor(0);
    this.audioToggleBtn.on('pointerdown', () => {
      const isEnabled = audioManager.toggle();
      this.updateAudioButtons();
    });

    this.trackText = this.add.text(width / 2, playerY, '1/4', {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#00FFFF',
    }).setOrigin(0.5);
    this.trackText.setScrollFactor(0);

    this.audioNextBtn = this.add.text(width / 2 + 50, playerY, '⏭', {
      fontSize: '20px',
    }).setInteractive({ useHandCursor: true });
    this.audioNextBtn.setScrollFactor(0);
    this.audioNextBtn.on('pointerdown', () => {
      audioManager.next();
      this.updateAudioButtons();
    });

    this.updateAudioButtons();
  }

  private updateAudioButtons(): void {
    const isEnabled = audioManager.isMusicEnabled();
    this.audioToggleBtn.setText(isEnabled ? '🔊' : '🔇');
    this.trackText.setText(`${audioManager.getCurrentTrackIndex()}/4`);
  }

  update(): void {
    if (this.energyText) {
      const energy = this.saveSystem.getEnergy();
      this.energyText.setText(`⚡ ${energy}/30`);
    }
    if (this.hammersText) {
      this.hammersText.setText(`🔨 ${this.saveSystem.getHammers()}`);
    }
    if (this.trackText) {
      this.trackText.setText(`${audioManager.getCurrentTrackIndex()}/4`);
    }
  }
}
