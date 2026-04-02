import Phaser from 'phaser';
import { SaveSystem } from '../../meta/SaveSystem';
import { CHARACTERS } from '../../characters/CharacterSystem';
import { audioManager } from '../../audio/AudioManager';
import { createAudioPanel } from '../../ui/AudioPanel';

export class CharacterSelectScene extends Phaser.Scene {
  private saveSystem!: SaveSystem;
  private selectedCharacterId!: string;
  private currentPage = 0;
  private container!: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Container[] = [];
  private dots: Phaser.GameObjects.Graphics[] = [];
  private isDragging = false;
  private startX = 0;
  private containerStartX = 0;
  private cardWidth = 260;
  private cardSpacing = 20;
  private canInteract = true;
  private audioToggleBtn!: Phaser.GameObjects.Text;
  private audioNextBtn!: Phaser.GameObjects.Text;
  private trackText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  preload(): void {
    this.load.image('Background', 'Background.png');
    this.load.image('The First', 'The First.jpeg');
    this.load.image('AIELSA', 'AIELSA.jpeg');
    this.load.image('Ashley Sparks', 'Ashley Sparks.jpeg');
  }

  create(): void {
    this.saveSystem = new SaveSystem();
    this.selectedCharacterId = this.saveSystem.getSelectedCharacterId();
    this.currentPage = CHARACTERS.findIndex(c => c.id === this.selectedCharacterId);
    if (this.currentPage < 0) this.currentPage = 0;

    this.cameras.main.setBackgroundColor(0x0a0a1a);

    this.createBackground();
    this.createTitle();
    this.createCarousel();
    this.createDots();
    this.createArrowButtons();
    this.createBackButton();
    this.setupInput();
    this.goToPage(this.currentPage, false);
    // Initialize shared audio panel across scenes
    const ap = createAudioPanel(this);
    this.add.existing(ap.panel);
    ap.updateUI();
    (this as any).audioPanel = ap;
    
    audioManager.init(this);
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    const bg = this.add.image(width / 2, height / 2, 'Background');
    bg.setScale(Math.max(width / bg.width, height / bg.height));
  }

  private createTitle(): void {
    const { width } = this.cameras.main;
    this.add.text(width / 2, 35, 'SELECT HERO', {
      fontFamily: 'Orbitron',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private createCarousel(): void {
    const { width, height } = this.cameras.main;
    this.container = this.add.container(0, height / 2 + 15);

    for (let i = 0; i < CHARACTERS.length; i++) {
      const card = this.buildCard(CHARACTERS[i], i);
      card.x = i * (this.cardWidth + this.cardSpacing);
      this.cards.push(card);
      this.container.add(card);
    }
  }

  private buildCard(char: any, index: number): Phaser.GameObjects.Container {
    const card = this.add.container(0, 0);
    const isSelected = char.id === this.selectedCharacterId;

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2a, 1);
    bg.fillRoundedRect(-this.cardWidth / 2, -180, this.cardWidth, 360, 16);
    
    if (isSelected) {
      bg.lineStyle(2, 0x00ffff, 1);
      bg.strokeRoundedRect(-this.cardWidth / 2, -180, this.cardWidth, 360, 16);
    }
    card.add(bg);

    // Portrait
    const portrait = this.add.image(0, -120, char.image);
    const aspect = portrait.width / portrait.height;
    portrait.setDisplaySize(this.cardWidth - 24, (this.cardWidth - 24) / aspect);
    card.add(portrait);

    // ID
    const id = char.id.replace('rcs_', '');
    this.addText(card, 0, 15, `RCS#${id}`, 10, '#00ffff', 'id');

    // Name
    this.addText(card, 0, 32, char.shortName.toUpperCase(), 15, '#ffffff', 'name');

    // Description
    this.addText(card, 0, 55, char.description, 12, '#aaaaaa', 'desc', this.cardWidth - 30);

    // Ability title
    this.addText(card, 0, 85, 'LEGENDARY ABILITY', 8, '#aa00ff', 'aTitle');

    // Ability name
    this.addText(card, 0, 100, char.ability.name.toUpperCase(), 12, '#ff00ff', 'aName');

    // Ability desc
    this.addText(card, 0, 118, char.ability.description, 10, '#888888', 'aDesc', this.cardWidth - 30);

    // Button
    const btnY = 140;
    const btnColor = isSelected ? 0x00ff66 : 0xff00ff;
    const btnText = isSelected ? 'SELECTED' : 'SELECT';

    const btnBg = this.add.graphics();
    btnBg.fillStyle(btnColor, 0.2);
    btnBg.fillRoundedRect(-55, btnY - 12, 110, 28, 8);
    btnBg.lineStyle(2, btnColor, isSelected ? 1 : 0.7);
    btnBg.strokeRoundedRect(-55, btnY - 12, 110, 28, 8);
    card.add(btnBg);

    const btn = this.add.text(0, btnY, btnText, {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      fontStyle: 'bold',
      color: isSelected ? '#00ff66' : '#ff00ff',
    }).setOrigin(0.5);
    card.add(btn);

    if (!isSelected) {
      const btnZone = this.add.zone(0, btnY, 110, 30).setInteractive({ useHandCursor: true });
      card.add(btnZone);
      btnZone.on('pointerdown', () => {
        this.saveSystem.setSelectedCharacter(char.id);
        this.selectedCharacterId = char.id;
        this.scene.restart();
      });
    }

    return card;
  }

  private addText(
    container: Phaser.GameObjects.Container,
    x: number, y: number,
    text: string,
    size: number,
    color: string,
    name?: string,
    width?: number
  ): void {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Orbitron',
      fontSize: `${size}px`,
      color: color,
      wordWrap: width ? { width } : undefined,
      align: 'center',
    }).setOrigin(0.5);
    if (name) t.setName(name);
    container.add(t);
  }

  private createDots(): void {
    const { width, height } = this.cameras.main;
    const spacing = 14;
    const startX = width / 2 - ((CHARACTERS.length - 1) * spacing) / 2;
    const y = height - 45;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const dot = this.add.graphics();
      dot.x = startX + i * spacing;
      dot.y = y;
      this.dots.push(dot);
      this.updateDot(dot, i === this.currentPage);

      const dotZone = this.add.zone(startX + i * spacing, y, 20, 20).setInteractive({ useHandCursor: true });
      dotZone.on('pointerdown', () => this.goToPage(i, true));
    }
  }

  private createArrowButtons(): void {
    const { width, height } = this.cameras.main;
    const centerY = height / 2 + 15;

    const leftZone = this.add.zone(30, centerY, 60, 80).setInteractive({ useHandCursor: true });
    const leftArrow = this.add.text(30, centerY, '◀', {
      fontFamily: 'Orbitron',
      fontSize: '28px',
      color: '#00ffff',
    }).setOrigin(0.5);
    leftArrow.setDepth(100);
    leftZone.setDepth(101);
    leftZone.on('pointerdown', () => {
      if (this.currentPage > 0) this.goToPage(this.currentPage - 1, true);
    });

    const rightZone = this.add.zone(width - 30, centerY, 60, 80).setInteractive({ useHandCursor: true });
    const rightArrow = this.add.text(width - 30, centerY, '▶', {
      fontFamily: 'Orbitron',
      fontSize: '28px',
      color: '#00ffff',
    }).setOrigin(0.5);
    rightArrow.setDepth(100);
    rightZone.setDepth(101);
    rightZone.on('pointerdown', () => {
      if (this.currentPage < CHARACTERS.length - 1) this.goToPage(this.currentPage + 1, true);
    });
  }

  private updateDot(dot: Phaser.GameObjects.Graphics, active: boolean): void {
    dot.clear();
    if (active) {
      dot.fillStyle(0xff00ff, 1);
      dot.fillCircle(0, 0, 5);
    } else {
      dot.fillStyle(0x444466, 0.5);
      dot.fillCircle(0, 0, 3);
    }
  }

  private createBackButton(): void {
    const { height } = this.cameras.main;
    
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a3a, 0.8);
    btnBg.fillRoundedRect(10, height - 45, 80, 26, 8);
    btnBg.lineStyle(1, 0x00ffff, 0.5);
    btnBg.strokeRoundedRect(10, height - 45, 80, 26, 8);
    btnBg.setDepth(100);
    
    const btnText = this.add.text(50, height - 32, '← BACK', {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#00ffff',
    }).setOrigin(0.5);
    btnText.setDepth(101);

    const btnZone = this.add.zone(50, height - 32, 80, 30).setInteractive({ useHandCursor: true });
    btnZone.setDepth(102);
    btnZone.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private setupInput(): void {
    const { width } = this.cameras.main;
    const leftThreshold = 70;
    const rightThreshold = width - 70;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x < leftThreshold || p.x > rightThreshold) return;
      this.isDragging = true;
      this.startX = p.x;
      this.containerStartX = this.container.x;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const diff = p.x - this.startX;
      this.container.x = this.containerStartX + diff;
      this.updateCardPositions();
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const diff = p.x - this.startX;

      if (diff > 60 && this.currentPage > 0) {
        this.goToPage(this.currentPage - 1, true);
      } else if (diff < -60 && this.currentPage < CHARACTERS.length - 1) {
        this.goToPage(this.currentPage + 1, true);
      } else {
        this.snapBack();
      }
    });
  }

  private goToPage(page: number, animate: boolean): void {
    this.currentPage = page;
    const { width } = this.cameras.main;
    const targetX = -page * (this.cardWidth + this.cardSpacing) + width / 2;

    for (const dot of this.dots) {
      this.updateDot(dot, false);
    }
    this.updateDot(this.dots[page], true);

    if (animate) {
      this.canInteract = false;
      this.tweens.add({
        targets: this.container,
        x: targetX,
        duration: 280,
        ease: 'Power2',
        onComplete: () => {
          this.canInteract = true;
          this.updateCardPositions();
        },
      });
    } else {
      this.container.x = targetX;
      this.updateCardPositions();
    }
  }

  private snapBack(): void {
    this.goToPage(this.currentPage, true);
  }

  private updateCardPositions(): void {
    const { width } = this.cameras.main;
    const centerX = width / 2;

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const cardCenterX = this.container.x + card.x;
      const dist = Math.abs(cardCenterX - centerX);
      const maxDist = this.cardWidth / 2 + 40;

      const scale = Math.max(0.75, 1 - (dist / maxDist) * 0.25);
      const alpha = Math.max(0.5, 1 - (dist / maxDist) * 0.5);

      card.scaleX = scale;
      card.scaleY = scale;
      card.alpha = alpha;
    }
  }

  private createAudioPlayer(): void {
    const { width, height } = this.cameras.main;
    const playerY = height - 40;

    const playerBg = this.add.graphics();
    playerBg.fillStyle(0x1A1A2E, 0.7);
    playerBg.fillRoundedRect(width / 2 - 80, playerY - 15, 160, 30, 8);

    this.audioToggleBtn = this.add.text(width / 2 - 40, playerY, '🔊', {
      fontSize: '18px',
    }).setInteractive({ useHandCursor: true });
    this.audioToggleBtn.on('pointerdown', () => {
      audioManager.toggle();
      this.updateAudioButtons();
    });

    this.trackText = this.add.text(width / 2, playerY, '1/4', {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      color: '#00FFFF',
    }).setOrigin(0.5);

    this.audioNextBtn = this.add.text(width / 2 + 40, playerY, '⏭', {
      fontSize: '18px',
    }).setInteractive({ useHandCursor: true });
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
}
