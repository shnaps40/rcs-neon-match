import Phaser from 'phaser';
import { Board, MatchInfo, FallInfo } from '../models/Board';
import { Tile, TileColor, TileState, BonusType } from '../models/Tile';
import { SaveSystem } from '../../meta/SaveSystem';
import { generateLevel, LevelConfig, LevelGoalType } from '../../meta/LevelSystem';
import { getCharacterById, AbilityType, CHARACTERS } from '../../characters/CharacterSystem';
import { audioManager } from '../../audio/AudioManager';
import { createAudioPanel } from '../../ui/AudioPanel';

const TILE_SIZE = 48;
const TILE_COLORS: Record<TileColor, number> = {
  [TileColor.CYAN]: 0xFF3333,
  [TileColor.PINK]: 0x3366FF,
  [TileColor.BLUE]: 0x33FF66,
  [TileColor.GREEN]: 0xFFFF33,
  [TileColor.YELLOW]: 0xFF9933,
  [TileColor.PURPLE]: 0xCC33FF,
  [TileColor.BOOSTER]: 0x000000,
};

const BONUS_COLORS: Record<BonusType, number> = {
  [BonusType.ROCKET_H]: 0xFF6600,
  [BonusType.ROCKET_V]: 0xFF6600,
  [BonusType.CROSS]: 0xFF00FF,
  [BonusType.BOMB]: 0xFF0000,
  [BonusType.COLOR_BOMB]: 0xFFFFFF,
  [BonusType.SUPER_ROCKET]: 0xFFFF00,
  [BonusType.SUPER_BOMB]: 0xFF8800,
  [BonusType.SUPER_CROSS]: 0x00FFFF,
  [BonusType.MEGA_BOMB]: 0xFF0000,
  [BonusType.HYPER_BOMB]: 0xFF00FF,
  [BonusType.ULTRA_CROSS]: 0x00FF00,
  [BonusType.NONE]: 0xFFFFFF,
};

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private tileViews: Phaser.GameObjects.Container[][] = [];
  private levelConfig!: LevelConfig;
  private saveSystem!: SaveSystem;
  private characterId!: string;
  private characterAbilityType!: AbilityType;
  private abilityReady = false;
  
  private selectedTile: { row: number; col: number } | null = null;
  private isProcessing = false;
  private movesLeft = 0;
  private score = 0;
  private collectedColor = 0;
  private goalProgress = 0;
  private comboCount = 0;
  private abilityButton!: Phaser.GameObjects.Container;
  private hammerButton!: Phaser.GameObjects.Container;
  private hammerMode = false;
  private comboText!: Phaser.GameObjects.Text;
  private audioPanel?: any;
  private audioToggleBtn!: Phaser.GameObjects.Text;
  private audioNextBtn!: Phaser.GameObjects.Text;
  private trackText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image('Background', '/Background.png');
    for (const char of CHARACTERS) {
      this.load.image(char.image, `${char.image}.jpeg`);
    }
  }

  create(): void {
    this.saveSystem = new SaveSystem();
    this.characterId = this.saveSystem.getSelectedCharacterId();
    const character = getCharacterById(this.characterId);
    if (character) {
      this.characterAbilityType = character.ability.type;
    }
    
    this.comboCount = 0;
    this.abilityReady = false;
    this.saveSystem.setComboCount(0);
    this.saveSystem.setAbilityActive(false);
    
    this.levelConfig = generateLevel(this.saveSystem.getCurrentLevel());
    this.board = new Board(this.levelConfig.gridSize, this.levelConfig.gridSize);
    this.movesLeft = this.levelConfig.moves;
    this.score = 0;
    this.collectedColor = 0;

    this.cameras.main.setBackgroundColor(0x0A0A0F);
    this.createBackground();
    this.createUI();
    this.createBoard();
    this.createAbilityUI();
    this.createInput();
    // Initialize shared AudioPanel UI across scenes
    const ap = createAudioPanel(this);
    this.add.existing(ap.panel);
    ap.updateUI();
    this.audioPanel = ap as any;
    
    audioManager.init(this);
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    
    const bg = this.add.image(width / 2, height / 2, 'Background');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    bg.setAlpha(0.4);

    const glow1 = this.add.graphics();
    glow1.fillGradientStyle(0x00FFFF, 0x00FFFF, 0x000000, 0x000000, 0.15);
    glow1.fillRect(0, 0, width, height * 0.3);
    glow1.setScrollFactor(0);

    const glow2 = this.add.graphics();
    glow2.fillGradientStyle(0xFF00FF, 0xFF00FF, 0x000000, 0x000000, 0.1);
    glow2.fillRect(0, height * 0.7, width, height * 0.3);
    glow2.setScrollFactor(0);

    const line1 = this.add.graphics();
    line1.lineStyle(1, 0x00FFFF, 0.3);
    line1.lineBetween(0, height * 0.3, width, height * 0.3);
    line1.setScrollFactor(0);

    const line2 = this.add.graphics();
    line2.lineStyle(1, 0xFF00FF, 0.3);
    line2.lineBetween(0, height * 0.7, width, height * 0.7);
    line2.setScrollFactor(0);

    this.tweens.add({
      targets: [glow1, glow2],
      alpha: 0.5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createUI(): void {
    const { width } = this.cameras.main;
    
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1A1A2E, 0.8);
    headerBg.fillRect(0, 0, width, 55);

    const characterY = 130;
    const character = getCharacterById(this.characterId);
    if (character) {
      const portraitBg = this.add.graphics();
      portraitBg.fillStyle(0x0A0A1A, 1);
      portraitBg.fillRoundedRect(20, characterY - 50, 104, 104, 8);
      portraitBg.lineStyle(3, 0x00FFFF, 1);
      portraitBg.strokeRoundedRect(20, characterY - 50, 104, 104, 8);
      portraitBg.lineStyle(1, 0xFF00FF, 0.5);
      portraitBg.strokeRoundedRect(18, characterY - 52, 108, 108, 10);
      
      const portrait = this.add.image(72, characterY, character.image);
      portrait.setDisplaySize(100, 100);
      
      this.add.text(140, characterY - 40, character.shortName.toUpperCase(), {
        fontFamily: 'Orbitron',
        fontSize: '16px',
        color: '#00FFFF',
      });
      
      this.add.text(140, characterY - 18, `RCS#${character.id.replace('rcs_', '')}`, {
        fontFamily: 'Orbitron',
        fontSize: '12px',
        color: '#FF00FF',
      });
    }

    this.add.text(170, 42, `LVL ${this.levelConfig.level}`, {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#00FFFF',
    });

    this.add.text(220, 42, `MOVES: ${this.movesLeft}`, {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#FF00FF',
    });

    let goalText = '';
    switch (this.levelConfig.goalType) {
      case LevelGoalType.SCORE:
        goalText = `SCORE: ${this.score}/${this.levelConfig.goalValue}`;
        break;
      case LevelGoalType.COLLECT_COLOR:
        const colorHex = TILE_COLORS[this.levelConfig.targetColor!].toString(16).padStart(6, '0');
        goalText = `COLLECT: ${this.collectedColor}/${this.levelConfig.goalValue}`;
        break;
    }

    this.add.text(width - 15, 42, goalText, {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#00FF66',
    }).setOrigin(1, 0);

    const backBtn = this.add.text(20, this.cameras.main.height - 30, '← BACK', {
      fontFamily: 'Orbitron',
      fontSize: '16px',
      color: '#666688',
    }).setInteractive({ useHandCursor: true });
    
    backBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private createBoard(): void {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;

    const boardBg = this.add.graphics();
    boardBg.fillStyle(0x1A1A2E, 0.7);
    boardBg.fillRoundedRect(
      startX - TILE_SIZE / 2 - 10,
      startY - TILE_SIZE / 2 - 10,
      boardWidth + 20,
      boardHeight + 20,
      10
    );

    this.tileViews = [];
    for (let row = 0; row < boardSize; row++) {
      this.tileViews[row] = [];
      for (let col = 0; col < boardSize; col++) {
        const x = startX + col * TILE_SIZE;
        const y = startY + row * TILE_SIZE;
        this.tileViews[row][col] = this.createTileView(row, col, x, y);
      }
    }
  }

  private createAbilityUI(): void {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardHeight = boardSize * TILE_SIZE;
    const boardStartY = (height - boardHeight) / 2 + 60;
    const bottomY = boardStartY + boardHeight + 30;

    this.comboText = this.add.text(width / 2 - 80, bottomY, `COMBO: ${this.comboCount}/3`, {
      fontFamily: 'Orbitron',
      fontSize: '16px',
      color: this.abilityReady ? '#00FF66' : '#888888',
    }).setOrigin(0.5);

    this.abilityButton = this.createAbilityButton(width / 2 + 60, bottomY);
    this.hammerButton = this.createHammerButton(width / 2 + 120, bottomY);
  }

  private createAbilityButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const size = 50;
    const color = this.abilityReady ? 0xFF00FF : 0x333333;
    
    bg.fillStyle(color, 0.3);
    bg.fillCircle(0, 0, size / 2);
    bg.lineStyle(3, color, 1);
    bg.strokeCircle(0, 0, size / 2);

    const text = this.add.text(0, 0, '★', {
      fontFamily: 'Orbitron',
      fontSize: '24px',
      color: this.abilityReady ? '#FFFFFF' : '#555555',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(size, size);

    if (this.abilityReady) {
      container.setInteractive({ useHandCursor: true });
      
      this.tweens.add({
        targets: container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      container.on('pointerdown', () => {
        this.activateAbility();
      });
    }

    return container;
  }

  private createHammerButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const size = 40;
    const hammerCount = this.saveSystem.getHammers();
    const color = hammerCount > 0 ? 0xFF6600 : 0x333333;
    
    bg.fillStyle(color, 0.3);
    bg.fillCircle(0, 0, size / 2);
    bg.lineStyle(3, color, 1);
    bg.strokeCircle(0, 0, size / 2);

    const text = this.add.text(0, 0, '🔨', {
      fontSize: '20px',
    }).setOrigin(0.5);

    const countText = this.add.text(0, 18, `${hammerCount}`, {
      fontFamily: 'Orbitron',
      fontSize: '10px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    container.add([bg, text, countText]);
    container.setSize(size, size);

    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      if (!this.isProcessing) {
        this.hammerMode = !this.hammerMode;
        this.updateHammerButtonState();
      }
    });

    return container;
  }

  private updateHammerButtonState(): void {
    if (!this.hammerButton) return;
    
    const bg = this.hammerButton.list[0] as Phaser.GameObjects.Graphics;
    const countText = this.hammerButton.list[2] as Phaser.GameObjects.Text;
    bg.clear();
    
    const size = 40;
    const currentHammers = this.saveSystem?.getHammers() ?? 100;
    const color = this.hammerMode ? 0xFF0000 : 0xFF6600; // Всегда оранжевый если активен
    
    bg.fillStyle(color, 0.5);
    bg.fillCircle(0, 0, size / 2);
    bg.lineStyle(3, color, 1);
    bg.strokeCircle(0, 0, size / 2);
    
    if (countText) {
      countText.setText(`${currentHammers}`);
    }
  }

  private updateAbilityUI(): void {
    if (!this.abilityButton || !this.comboText) return;

    this.comboText.setText(`COMBO: ${this.comboCount}/3`);
    this.comboText.setColor(this.abilityReady ? '#00FF66' : '#888888');

    this.abilityButton.destroy();
    this.abilityButton = this.createAbilityButton(this.abilityButton.x, this.abilityButton.y);

    if (this.hammerButton) {
      this.hammerButton.destroy();
      this.hammerButton = this.createHammerButton(this.hammerButton.x, this.hammerButton.y);
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

  private async activateAbility(): Promise<void> {
    if (!this.abilityReady || this.isProcessing) return;

    this.isProcessing = true;
    this.saveSystem.useAbility();
    this.abilityReady = false;
    this.comboCount = 0;

    const result = this.board.activateAbility(this.characterAbilityType);

    if (result.tiles.length > 0 || result.bonusTiles) {
      for (const tile of result.tiles) {
        tile.state = TileState.DESTROYED;
      }

      if (result.bonusTiles) {
        for (const tile of result.bonusTiles) {
          this.updateTileViewForBonus(tile.row, tile.col);
        }
      }

      await this.animateAbilityEffect(result.tiles, result.bonusTiles || []);

      const fallInfo = this.board.removeDestroyedTiles();
      await this.animateFall(fallInfo);

      if (!this.board.hasPossibleMoves()) {
        this.board.reshuffle();
        await this.animateReshuffle();
      }

      const matches = this.board.findMatches();
      if (matches.length > 0) {
        await this.processMatches();
      }
    }

    this.updateAbilityUI();
    this.checkWinLose();
    this.isProcessing = false;
  }

  private async animateAbilityEffect(tiles: Tile[], bonusTiles: Tile[]): Promise<void> {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;

    const flash = this.add.graphics();
    flash.fillStyle(0xFF00FF, 0.5);
    flash.fillRect(0, 0, width, height);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    for (const tile of tiles) {
      const container = this.tileViews[tile.row]?.[tile.col];
      if (container) {
        this.tweens.add({
          targets: container,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 200,
        });
      }
    }

    await this.delay(250);
  }

  private updateTileViewForBonus(row: number, col: number): void {
    const container = this.tileViews[row]?.[col];
    const tile = this.board.getTile(row, col);
    if (!container || !tile) return;

    const isBooster = tile.bonus !== BonusType.NONE;
    const color = isBooster ? 0x000000 : TILE_COLORS[tile.color];
    const half = TILE_SIZE / 2 - 2;
    
    const bg = container.list[0] as Phaser.GameObjects.Graphics;
    const border = container.list[1] as Phaser.GameObjects.Graphics;
    
    bg.clear();
    bg.fillStyle(color, isBooster ? 0.9 : 0.6);
    
    if (isBooster) {
      this.drawHexagon(bg, 0, 0, half);
    } else {
      bg.fillRoundedRect(-half, -half, TILE_SIZE - 4, TILE_SIZE - 4, 8);
    }
    
    border.clear();
    const borderColor = isBooster ? 0xFFFFFF : color;
    border.lineStyle(2, borderColor, 1);
    
    if (isBooster) {
      this.drawHexagonOutline(border, 0, 0, half);
    } else {
      border.strokeRoundedRect(-half, -half, TILE_SIZE - 4, TILE_SIZE - 4, 8);
    }

    if (tile.bonus !== BonusType.NONE) {
      this.clearBonusIcon(container);
      this.addBonusIcon(container, tile.bonus);
      this.addBoosterPulseEffect(container);
    }
  }

  private createTileView(row: number, col: number, x: number, y: number): Phaser.GameObjects.Container {
    const tile = this.board.getTile(row, col)!;
    const container = this.add.container(x, y);
    container.setSize(TILE_SIZE, TILE_SIZE);

    const isBooster = tile.bonus !== BonusType.NONE;
    const color = isBooster ? 0x000000 : TILE_COLORS[tile.color];
    const half = TILE_SIZE / 2 - 2;
    const s = TILE_SIZE - 4;
    
    const bg = this.add.graphics();
    bg.fillStyle(color, isBooster ? 0.9 : 0.6);
    
    if (isBooster) {
      this.drawHexagon(bg, 0, 0, half);
    } else {
      switch (tile.color) {
        case TileColor.CYAN:
          this.drawHexagon(bg, 0, 0, half);
          break;
        case TileColor.PINK:
          this.drawDiamond(bg, 0, 0, half);
          break;
        case TileColor.BLUE:
          this.drawOctagon(bg, 0, 0, half);
          break;
        case TileColor.GREEN:
          this.drawChamferedSquare(bg, -half, -half, s);
          break;
        case TileColor.YELLOW:
          this.drawParallelogram(bg, -half, -half, s);
          break;
        case TileColor.PURPLE:
        default:
          bg.fillRoundedRect(-half, -half, s, s, 6);
          break;
      }
    }
    
    const border = this.add.graphics();
    const borderColor = isBooster ? 0xFFFFFF : color;
    border.lineStyle(2, borderColor, 1);
    
    if (isBooster) {
      this.drawHexagonOutline(border, 0, 0, half);
    } else {
      switch (tile.color) {
        case TileColor.CYAN:
          this.drawHexagonOutline(border, 0, 0, half);
          break;
        case TileColor.PINK:
          this.drawDiamondOutline(border, 0, 0, half);
          break;
        case TileColor.BLUE:
          this.drawOctagonOutline(border, 0, 0, half);
          break;
        case TileColor.GREEN:
          this.drawChamferedSquareOutline(border, -half, -half, s);
          break;
        case TileColor.YELLOW:
          this.drawParallelogramOutline(border, -half, -half, s);
          break;
        case TileColor.PURPLE:
        default:
          border.strokeRoundedRect(-half, -half, s, s, 6);
          break;
      }
    }

    container.add([bg, border]);
    container.setData('row', row);
    container.setData('col', col);

    if (tile.bonus !== BonusType.NONE) {
      this.addBonusIcon(container, tile.bonus);
      this.addBoosterPulseEffect(container);
    }

    return container;
  }

  private drawHexagon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
  }

  private drawHexagonOutline(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
  }

  private drawDiamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.fillTriangle(cx - r, cy, cx, cy - r, cx + r, cy);
    g.fillTriangle(cx + r, cy, cx, cy + r, cx - r, cy);
  }

  private drawDiamondOutline(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.beginPath();
    g.moveTo(cx - r, cy);
    g.lineTo(cx, cy - r);
    g.lineTo(cx + r, cy);
    g.lineTo(cx, cy + r);
    g.closePath();
    g.strokePath();
  }

  private drawOctagon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    const r2 = r * 0.7;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 8;
      const radius = i % 2 === 0 ? r : r2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
  }

  private drawOctagonOutline(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    const r2 = r * 0.7;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 8;
      const radius = i % 2 === 0 ? r : r2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
  }

  private drawChamferedSquare(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    const c = s * 0.2;
    g.beginPath();
    g.moveTo(x + c, y);
    g.lineTo(x + s, y);
    g.lineTo(x + s, y + s - c);
    g.lineTo(x + s - c, y + s);
    g.lineTo(x, y + s);
    g.lineTo(x, y + c);
    g.closePath();
    g.fillPath();
  }

  private drawChamferedSquareOutline(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    const c = s * 0.2;
    g.beginPath();
    g.moveTo(x + c, y);
    g.lineTo(x + s, y);
    g.lineTo(x + s, y + s - c);
    g.lineTo(x + s - c, y + s);
    g.lineTo(x, y + s);
    g.lineTo(x, y + c);
    g.closePath();
    g.strokePath();
  }

  private drawParallelogram(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    const o = s * 0.25;
    g.beginPath();
    g.moveTo(x + o, y);
    g.lineTo(x + s, y);
    g.lineTo(x + s - o, y + s);
    g.lineTo(x, y + s);
    g.closePath();
    g.fillPath();
  }

  private drawParallelogramOutline(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    const o = s * 0.25;
    g.beginPath();
    g.moveTo(x + o, y);
    g.lineTo(x + s, y);
    g.lineTo(x + s - o, y + s);
    g.lineTo(x, y + s);
    g.closePath();
    g.strokePath();
  }

  private drawTechCorners(container: Phaser.GameObjects.Container, color: number, half: number): void {
    const corners = this.add.graphics();
    const c = half * 0.3;
    const len = half * 0.6;
    
    corners.lineStyle(2, color, 0.8);
    
    corners.beginPath();
    corners.moveTo(-half, -half + c);
    corners.lineTo(-half, -half);
    corners.lineTo(-half + c, -half);
    corners.strokePath();
    
    corners.beginPath();
    corners.moveTo(half - c, -half);
    corners.lineTo(half, -half);
    corners.lineTo(half, -half + c);
    corners.strokePath();
    
    corners.beginPath();
    corners.moveTo(half, half - c);
    corners.lineTo(half, half);
    corners.lineTo(half - c, half);
    corners.strokePath();
    
    corners.beginPath();
    corners.moveTo(-half + c, half);
    corners.lineTo(-half, half);
    corners.lineTo(-half, half - c);
    corners.strokePath();
    
    corners.lineStyle(1, color, 0.4);
    corners.strokeRect(-half + 4, -half + 4, half * 2 - 8, half * 2 - 8);
    
    container.add(corners);
  }

  private playGlitchEffect(container: Phaser.GameObjects.Container): void {
    const originalX = container.x;
    const originalY = container.y;
    const originalScaleX = container.scaleX;
    const originalScaleY = container.scaleY;
    
    const color = Phaser.Math.Between(0, 1) ? 0xFF00FF : 0x00FFFF;
    
    const glitchRect = this.add.graphics();
    glitchRect.fillStyle(color, 0.5);
    const gY = Phaser.Math.Between(-10, 10);
    glitchRect.fillRect(-TILE_SIZE/2, gY, TILE_SIZE, 4);
    container.add(glitchRect);

    const glitchRect2 = this.add.graphics();
    glitchRect2.fillStyle(0xFF0000, 0.3);
    const gY2 = Phaser.Math.Between(-10, 10);
    glitchRect2.fillRect(-TILE_SIZE/2 + 2, gY2, TILE_SIZE - 4, 2);
    container.add(glitchRect2);

    this.tweens.add({
      targets: container,
      x: originalX + Phaser.Math.Between(-8, 8),
      y: originalY + Phaser.Math.Between(-8, 8),
      scaleX: originalScaleX * 1.2,
      scaleY: originalScaleY * 1.2,
      angle: Phaser.Math.Between(-15, 15),
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        container.x = originalX;
        container.y = originalY;
        container.scaleX = 0;
        container.scaleY = 0;
        container.angle = 0;
      }
    });

    this.tweens.add({
      targets: [glitchRect, glitchRect2],
      alpha: 0,
      duration: 250,
      onComplete: () => {
        glitchRect.destroy();
        glitchRect2.destroy();
      }
    });
  }

  private addBoosterPulseEffect(container: Phaser.GameObjects.Container): void {
    const pulse = this.add.graphics();
    pulse.lineStyle(2, 0xFFFFFF, 0.8);
    pulse.strokeRoundedRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE, 8);
    container.add(pulse);
    
    this.tweens.add({
      targets: pulse,
      alpha: 0.3,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private addBonusIcon(container: Phaser.GameObjects.Container, bonus: BonusType): void {
    let text = '';
    let color = BONUS_COLORS[bonus] || 0xFFFFFF;
    
    switch (bonus) {
      case BonusType.ROCKET_H:
        text = '→';
        break;
      case BonusType.ROCKET_V:
        text = '↓';
        break;
      case BonusType.CROSS:
        text = '✚';
        break;
      case BonusType.BOMB:
        text = '💥';
        break;
      case BonusType.COLOR_BOMB:
        text = '★';
        color = 0xFFFFFF;
        break;
      case BonusType.SUPER_ROCKET:
        text = '⬡';
        color = 0xFFFF00;
        break;
      case BonusType.SUPER_BOMB:
        text = '⚡';
        color = 0xFF8800;
        break;
      case BonusType.SUPER_CROSS:
        text = '✪';
        color = 0x00FFFF;
        break;
      case BonusType.MEGA_BOMB:
        text = '💣';
        color = 0xFF0000;
        break;
      case BonusType.HYPER_BOMB:
        text = '☢';
        color = 0xFF00FF;
        break;
      case BonusType.ULTRA_CROSS:
        text = '✿';
        color = 0x00FF00;
        break;
    }

    const icon = this.add.text(0, 0, text, {
      fontSize: '24px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
    }).setOrigin(0.5);
    
    container.add(icon);
  }

  private createInput(): void {
    for (let row = 0; row < this.tileViews.length; row++) {
      for (let col = 0; col < this.tileViews[row].length; col++) {
        const tileView = this.tileViews[row][col];
        tileView.setData('currentRow', row);
        tileView.setData('currentCol', col);
        tileView.setInteractive();
        
        tileView.on('pointerdown', () => {
          this.onTileClick(tileView);
        });
      }
    }
  }

  private onTileClick(container: Phaser.GameObjects.Container): void {
    const row = container.getData('currentRow') as number;
    const col = container.getData('currentCol') as number;
    
    if (this.isProcessing || row === undefined || col === undefined) {
      return;
    }

    if (this.hammerMode === true) {
      this.useHammer(row, col);
      return;
    }

    if (!this.selectedTile) {
      this.selectedTile = { row, col };
      this.highlightTile(row, col, true);
    } else {
      const { row: r1, col: c1 } = this.selectedTile;
      
      if (r1 === row && c1 === col) {
        this.highlightTile(row, col, false);
        this.selectedTile = null;
        return;
      }
      
      if (Math.abs(r1 - row) + Math.abs(c1 - col) === 1) {
        this.attemptSwap(r1, c1, row, col);
      } else {
        this.highlightTile(r1, c1, false);
        this.selectedTile = { row, col };
        this.highlightTile(row, col, true);
      }
    }
  }

  private async useHammer(row: number, col: number): Promise<void> {
    const used = this.saveSystem?.useHammer() ?? false;
    
    if (!used) {
      this.hammerMode = false;
      this.updateHammerButtonState();
      return;
    }
    
    this.hammerMode = false;
    this.updateHammerButtonState();
    this.isProcessing = true;

    const tile = this.board.getTile(row, col);
    if (!tile) {
      this.isProcessing = false;
      return;
    }

    const affected: Tile[] = [];
    affected.push(tile);
    tile.state = TileState.DESTROYED;

    await this.animateBoosterActivation(affected, row, col, BonusType.BOMB);
    
    this.score += affected.length * 50;
    this.movesLeft--;
    this.updateUI();
    
    const fallInfo = this.board.removeDestroyedTiles();
    await this.animateFall(fallInfo);
    
    if (!this.board.hasPossibleMoves()) {
      this.board.reshuffle();
      await this.animateReshuffle();
    }
    
    const matches = this.board.findMatches();
    if (matches.length > 0) {
      await this.processMatches();
    }
    
    this.checkWinLose();
    this.isProcessing = false;
  }

  private async activateBooster(row: number, col: number): Promise<void> {
    const tile = this.board.getTile(row, col);
    if (!tile || tile.bonus === BonusType.NONE) return;
    
    this.isProcessing = true;
    
    const affected = this.board.activateBonus(tile.bonus, row, col);
    await this.animateBoosterActivation(affected, row, col, tile.bonus);
    
    this.score += affected.length * 100;
    this.movesLeft--;
    
    if (!this.abilityReady && this.comboCount < 3) {
      this.comboCount++;
      this.saveSystem.incrementComboCount();
      if (this.comboCount >= 3) {
        this.abilityReady = true;
      }
      this.updateAbilityUI();
    }
    
    this.updateUI();
    
    const fallInfo = this.board.removeDestroyedTiles();
    await this.animateFall(fallInfo);
    
    if (!this.board.hasPossibleMoves()) {
      this.board.reshuffle();
      await this.animateReshuffle();
    }
    
    const matches = this.board.findMatches();
    if (matches.length > 0) {
      await this.processMatches();
    }
    
    this.checkWinLose();
    this.isProcessing = false;
  }

  private async animateBoosterActivation(affected: Tile[], row: number, col: number, bonus?: BonusType): Promise<void> {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;

    const centerX = startX + col * TILE_SIZE;
    const centerY = startY + row * TILE_SIZE;

    const flash = this.add.graphics();
    flash.fillStyle(0xFFFFFF, 0.5);
    flash.fillCircle(centerX, centerY, TILE_SIZE * 1.5);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    let randomTarget: Tile | null = null;
    if (bonus === BonusType.CROSS && affected.length > 5) {
      randomTarget = affected[affected.length - 1];
    }

    for (const tile of affected) {
      const container = this.tileViews[tile.row]?.[tile.col];
      if (!container) continue;
      
      if (tile === randomTarget) {
        await this.animateRocketToTarget(container, tile.row, tile.col);
      } else {
        this.tweens.add({
          targets: container,
          scaleX: 1.3,
          scaleY: 1.3,
          alpha: 0,
          duration: 150,
          ease: 'Power2',
        });
      }
    }
    
    await this.delay(200);
  }

  private async animateRocketToTarget(container: Phaser.GameObjects.Container, targetRow: number, targetCol: number): Promise<void> {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;

    const targetX = startX + targetCol * TILE_SIZE;
    const targetY = startY + targetRow * TILE_SIZE;

    const rocket = this.add.text(container.x, container.y, '🚀', {
      fontSize: '24px',
    }).setOrigin(0.5);

    const promise = new Promise<void>((resolve) => {
      this.tweens.add({
        targets: rocket,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          const explosion = this.add.graphics();
          explosion.fillStyle(0xFF6600, 0.8);
          explosion.fillCircle(targetX, targetY, TILE_SIZE);
          this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            onComplete: () => explosion.destroy(),
          });
          rocket.destroy();
          this.tweens.add({
            targets: container,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
          });
          resolve();
        },
      });
    });

    await promise;
  }

  private highlightTile(row: number, col: number, highlight: boolean): void {
    const container = this.tileViews[row][col];
    const tile = this.board.getTile(row, col)!;
    const color = TILE_COLORS[tile.color];
    
    const border = container.list[1] as Phaser.GameObjects.Graphics;
    if (!border) return;
    border.clear();
    
    if (highlight) {
      border.lineStyle(4, 0xFFFFFF, 1);
    } else {
      border.lineStyle(2, color, 1);
    }
    
    const half = TILE_SIZE / 2 - 2;
    
    switch (tile.color) {
      case TileColor.CYAN:
        this.drawHexagonOutline(border, 0, 0, half);
        break;
      case TileColor.PINK:
        this.drawDiamondOutline(border, 0, 0, half);
        break;
      case TileColor.BLUE:
        this.drawOctagonOutline(border, 0, 0, half);
        break;
      case TileColor.GREEN:
        this.drawChamferedSquareOutline(border, -half, -half, TILE_SIZE - 4);
        break;
      case TileColor.YELLOW:
        this.drawParallelogramOutline(border, -half, -half, TILE_SIZE - 4);
        break;
      case TileColor.PURPLE:
      default:
        border.strokeRoundedRect(-half, -half, TILE_SIZE - 4, TILE_SIZE - 4, 6);
        break;
    }
  }

  private async attemptSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    this.isProcessing = true;
    
    if (this.selectedTile) {
      this.highlightTile(this.selectedTile.row, this.selectedTile.col, false);
      this.selectedTile = null;
    }
    
    await this.animateSwap(r1, c1, r2, c2);
    this.board.swapTiles(r1, c1, r2, c2);
    
    const combo = this.board.checkComboAfterSwap(r1, c1, r2, c2);
    
    if (combo && combo.isCombo) {
      const superResult = this.board.createSuperBooster(r1, c1, r2, c2);
      
      if (superResult.created && superResult.newBonus) {
        this.score += 200;
        this.updateTileViewForBonus(r2, c2);
        this.updateTileViewForBonus(r1, c1);
        this.updateUI();
        this.isProcessing = false;
        return;
      }
    }
    
    const tile1 = this.board.getTile(r1, c1);
    const tile2 = this.board.getTile(r2, c2);
    
    if (tile1 && tile1.bonus !== BonusType.NONE) {
      const affected = this.board.activateBonus(tile1.bonus, r1, c1);
      await this.animateBoosterActivation(affected, r1, c1, tile1.bonus);
      await this.handlePostBooster();
      this.isProcessing = false;
      return;
    }
    
    if (tile2 && tile2.bonus !== BonusType.NONE) {
      const affected = this.board.activateBonus(tile2.bonus, r2, c2);
      await this.animateBoosterActivation(affected, r2, c2, tile2.bonus);
      await this.handlePostBooster();
      this.isProcessing = false;
      return;
    }
    
    const matches = this.board.findMatches();
    
    if (matches.length === 0) {
      await this.animateSwap(r1, c1, r2, c2);
      this.board.swapTiles(r1, c1, r2, c2);
      this.isProcessing = false;
      return;
    }

    this.movesLeft--;
    this.updateUI();

    await this.processMatches();
    
    this.checkWinLose();
    this.isProcessing = false;
  }

  private async handlePostBooster(): Promise<void> {
    this.score += 100;
    this.movesLeft--;
    
    if (!this.abilityReady && this.comboCount < 3) {
      this.comboCount++;
      this.saveSystem.incrementComboCount();
      if (this.comboCount >= 3) {
        this.abilityReady = true;
      }
      this.updateAbilityUI();
    }
    
    this.updateUI();
    
    const fallInfo = this.board.removeDestroyedTiles();
    await this.animateFall(fallInfo);
    
    if (!this.board.hasPossibleMoves()) {
      this.board.reshuffle();
      await this.animateReshuffle();
    }
    
    const matches = this.board.findMatches();
    if (matches.length > 0) {
      await this.processMatches();
    }
    
    this.checkWinLose();
  }

  private updateTileViewPositions(): void {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;
    
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const container = this.tileViews[row]?.[col];
        if (container) {
          container.setData('currentRow', row);
          container.setData('currentCol', col);
        }
      }
    }
  }

  private animateSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    return new Promise((resolve) => {
      const tile1 = this.tileViews[r1][c1];
      const tile2 = this.tileViews[r2][c2];
      
      const x1 = tile1.x;
      const y1 = tile1.y;
      const x2 = tile2.x;
      const y2 = tile2.y;

      this.tweens.add({
        targets: tile1,
        x: x2,
        y: y2,
        duration: 200,
        ease: 'Power2',
      });

      this.tweens.add({
        targets: tile2,
        x: x1,
        y: y1,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.tileViews[r1][c1] = tile2;
          this.tileViews[r2][c2] = tile1;
          tile1.setData('currentRow', r2);
          tile1.setData('currentCol', c2);
          tile2.setData('currentRow', r1);
          tile2.setData('currentCol', c1);
          resolve();
        },
      });
    });
  }

  private getTilePosition(row: number, col: number): { x: number; y: number } {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;
    
    return {
      x: startX + col * TILE_SIZE,
      y: startY + row * TILE_SIZE,
    };
  }

  private async processMatches(): Promise<void> {
    let matches = this.board.findMatches();
    
    while (matches.length > 0) {
      for (const match of matches) {
        await this.processMatch(match);
      }
      
      const fallInfo = this.board.removeDestroyedTiles();
      await this.animateFall(fallInfo);
      
      if (!this.board.hasPossibleMoves()) {
        this.board.reshuffle();
        await this.animateReshuffle();
      }
      
      matches = this.board.findMatches();
    }
  }

  private async animateFall(fallInfo: FallInfo): Promise<void> {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;

    // Animate falling tiles
    const fallPromises: Promise<void>[] = [];
    const clearedPositions = new Set<string>();
    
    for (const { tile, fromRow, toRow, toCol } of fallInfo.fallingTiles) {
      const container = this.tileViews[fromRow][tile.col];
      if (!container) continue;
      
      const key = `${fromRow},${tile.col}`;
      if (!clearedPositions.has(key)) {
        this.tileViews[fromRow][tile.col] = null as any;
        clearedPositions.add(key);
      }
      
      // Update the view reference
      this.tileViews[toRow][toCol] = container;
      container.setData('currentRow', toRow);
      container.setData('currentCol', toCol);
      
      const targetY = startY + toRow * TILE_SIZE;
      const distance = toRow - fromRow;
      const duration = Math.min(150 + distance * 30, 350);
      
      const promise = new Promise<void>((resolve) => {
        this.tweens.add({
          targets: container,
          y: targetY,
          duration: duration,
          ease: 'Power1.easeIn',
          onComplete: () => resolve(),
        });
      });
      fallPromises.push(promise);
    }

    // Create new tiles above the board and animate them falling
    for (const { row, col } of fallInfo.newTiles) {
      const x = (width - boardWidth) / 2 + TILE_SIZE / 2 + col * TILE_SIZE;
      const container = this.createTileView(row, col, x, startY - TILE_SIZE * (fallInfo.newTiles.length - fallInfo.newTiles.indexOf({ row, col })));
      container.setData('currentRow', row);
      container.setData('currentCol', col);
      container.alpha = 0;
      container.setInteractive();
      container.on('pointerdown', () => {
        this.onTileClick(container);
      });
      
      this.tileViews[row][col] = container;
      
      const targetY = startY + row * TILE_SIZE;
      const delay = Math.random() * 100;
      const duration = 250 + Math.random() * 100;
      
      const promise = new Promise<void>((resolve) => {
        this.tweens.add({
          targets: container,
          y: targetY,
          alpha: 1,
          duration: duration,
          delay: delay,
          ease: 'Power2.easeOut',
          onComplete: () => resolve(),
        });
      });
      fallPromises.push(promise);
    }

    // Wait for all animations to complete
    await Promise.all(fallPromises);
  }

  private async animateReshuffle(): Promise<void> {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;

    // Fade out all tiles
    const fadePromises: Promise<void>[] = [];
    
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const container = this.tileViews[row][col];
        if (!container) continue;
        
        const promise = new Promise<void>((resolve) => {
          this.tweens.add({
            targets: container,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              container.destroy();
              resolve();
            },
          });
        });
        fadePromises.push(promise);
      }
    }
    
    await Promise.all(fadePromises);
    
    // Clear view references
    this.tileViews = [];
    for (let row = 0; row < boardSize; row++) {
      this.tileViews[row] = [];
      for (let col = 0; col < boardSize; col++) {
        const tile = this.board.getTile(row, col);
        if (!tile) continue;
        
        const x = startX + col * TILE_SIZE;
        const y = startY + row * TILE_SIZE;
        const container = this.createTileView(row, col, x, y);
        container.setData('currentRow', row);
        container.setData('currentCol', col);
        container.setInteractive();
        container.on('pointerdown', () => {
          this.onTileClick(container);
        });
        
        container.alpha = 0;
        this.tileViews[row][col] = container;
        
        this.tweens.add({
          targets: container,
          alpha: 1,
          duration: 200,
          delay: Math.random() * 100,
        });
      }
    }
    
    await this.delay(300);
  }

  private async processMatch(match: MatchInfo): Promise<void> {
    this.board.applyMatches([match]);

    const tilesToAnimate = match.tiles.filter(t => t.state === TileState.DESTROYED);

    for (const tile of tilesToAnimate) {
      const container = this.tileViews[tile.row][tile.col];
      if (!container) continue;
      
      this.playGlitchEffect(container);

      if (this.levelConfig.goalType === LevelGoalType.COLLECT_COLOR && 
          tile.color === this.levelConfig.targetColor) {
        this.collectedColor++;
      }
    }

    for (const tile of match.tiles) {
      const boardTile = this.board.getTile(tile.row, tile.col);
      if (boardTile && boardTile.bonus !== BonusType.NONE) {
        const container = this.tileViews[tile.row][tile.col];
        if (container) {
          this.clearBonusIcon(container);
          this.addBonusIcon(container, boardTile.bonus);
          this.addBoosterPulseEffect(container);
          this.tweens.add({
            targets: container,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 200,
            yoyo: true,
            ease: 'Power2',
          });
        }
      }
    }

    this.score += match.tiles.length * 100;
    this.goalProgress = this.levelConfig.goalType === LevelGoalType.SCORE 
      ? this.score 
      : this.collectedColor;
    
    this.updateUI();
    await this.delay(250);
  }

  private updateAllTileViews(): void {
    const { width, height } = this.cameras.main;
    const boardSize = this.levelConfig.gridSize;
    const boardWidth = boardSize * TILE_SIZE;
    const boardHeight = boardSize * TILE_SIZE;
    
    const startX = (width - boardWidth) / 2 + TILE_SIZE / 2;
    const startY = (height - boardHeight) / 2 + 60 + TILE_SIZE / 2;

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const tile = this.board.getTile(row, col);
        if (!tile) continue;

        let container = this.tileViews[row][col];
        
        if (!container || container.list.length === 0) {
          const x = startX + col * TILE_SIZE;
          const y = startY + row * TILE_SIZE;
          container = this.createTileView(row, col, x, y);
          container.setData('currentRow', row);
          container.setData('currentCol', col);
          container.setInteractive({ useHandCursor: true });
          container.on('pointerdown', () => {
            this.onTileClick(container);
          });
          
          this.tileViews[row][col] = container;
        } else {
          container.setData('currentRow', row);
          container.setData('currentCol', col);
          container.x = startX + col * TILE_SIZE;
          container.y = startY + row * TILE_SIZE;
          container.scaleX = 1;
          container.scaleY = 1;
          container.alpha = 1;

          const tileData = this.board.getTile(row, col);
          
          if (tileData) {
            const tileColor = tileData.bonus !== BonusType.NONE ? TileColor.BOOSTER : tileData.color;
            const color = TILE_COLORS[tileColor];
            
            const bg = container.list[1] as Phaser.GameObjects.Graphics;
            const border = container.list[2] as Phaser.GameObjects.Graphics;
            const glow = container.list[0] as Phaser.GameObjects.Graphics;
            
            bg.clear();
            bg.fillStyle(color, 0.3);
            bg.fillRoundedRect(-TILE_SIZE/2 + 2, -TILE_SIZE/2 + 2, TILE_SIZE - 4, TILE_SIZE - 4, 8);
            
            border.clear();
            border.lineStyle(2, color, 1);
            border.strokeRoundedRect(-TILE_SIZE/2 + 2, -TILE_SIZE/2 + 2, TILE_SIZE - 4, TILE_SIZE - 4, 8);
            
            glow.clear();
            glow.fillStyle(color, 0.1);
            glow.fillCircle(0, 0, TILE_SIZE / 2 - 2);
            
            if (tileData.bonus !== BonusType.NONE) {
              this.clearBonusIcon(container);
              this.addBonusIcon(container, tileData.bonus);
            } else {
              this.clearBonusIcon(container);
            }
          }
        }
      }
    }
  }

  private clearBonusIcon(container: Phaser.GameObjects.Container): void {
    const iconIndex = container.list.findIndex(
      child => child instanceof Phaser.GameObjects.Text
    );
    if (iconIndex > -1) {
      container.removeAt(iconIndex);
    }
  }

  private updateUI(): void {
    const { width } = this.cameras.main;
    
    let goalText = '';
    switch (this.levelConfig.goalType) {
      case LevelGoalType.SCORE:
        goalText = `SCORE: ${this.score}/${this.levelConfig.goalValue}`;
        break;
      case LevelGoalType.COLLECT_COLOR:
        goalText = `COLLECT: ${this.collectedColor}/${this.levelConfig.goalValue}`;
        break;
    }

    const goalTextObj = this.children.list.find(
      (obj): obj is Phaser.GameObjects.Text => 
        obj instanceof Phaser.GameObjects.Text && 
        (obj.text.includes('SCORE:') || obj.text.includes('COLLECT:'))
    );
    
    if (goalTextObj) {
      goalTextObj.setText(goalText);
    }

    const movesText = this.children.list.find(
      (obj): obj is Phaser.GameObjects.Text => 
        obj instanceof Phaser.GameObjects.Text && 
        obj.text.includes('MOVES:')
    );
    
    if (movesText) {
      movesText.setText(`MOVES: ${this.movesLeft}`);
    }
  }

  private checkWinLose(): void {
    let won = false;
    
    switch (this.levelConfig.goalType) {
      case LevelGoalType.SCORE:
        won = this.score >= this.levelConfig.goalValue;
        break;
      case LevelGoalType.COLLECT_COLOR:
        won = this.collectedColor >= this.levelConfig.goalValue;
        break;
    }

    if (won) {
      const earnedCoins = 50 + this.levelConfig.level * 10;
      const earnedStars = 1;
      
      this.saveSystem.completeLevel(this.levelConfig.level, earnedCoins, earnedStars);
      this.saveSystem.setCurrentLevel(this.levelConfig.level + 1);
      
      this.showResult(true, earnedCoins, earnedStars);
    } else if (this.movesLeft <= 0) {
      this.showResult(false, 0, 0);
    }
  }

  private showResult(won: boolean, coins: number, stars: number): void {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    const resultText = won ? 'YOU WIN!' : 'GAME OVER';
    const resultColor = won ? '#00FF66' : '#FF0000';

    this.add.text(width / 2, height / 2 - 80, resultText, {
      fontFamily: 'Orbitron',
      fontSize: '48px',
      color: resultColor,
    }).setOrigin(0.5);

    if (won) {
      this.add.text(width / 2, height / 2 - 20, `+${coins} coins`, {
        fontFamily: 'Orbitron',
        fontSize: '24px',
        color: '#FFFF00',
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 + 20, `+${stars} star`, {
        fontFamily: 'Orbitron',
        fontSize: '24px',
        color: '#FF00FF',
      }).setOrigin(0.5);
    }

    const retryBtn = this.add.text(width / 2, height / 2 + 100, won ? 'NEXT LEVEL' : 'RETRY', {
      fontFamily: 'Orbitron',
      fontSize: '28px',
      color: '#00FFFF',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      if (won) {
        this.saveSystem.setCurrentLevel(this.levelConfig.level + 1);
      }
      this.scene.restart();
    });

    const menuBtn = this.add.text(width / 2, height / 2 + 150, 'MENU', {
      fontFamily: 'Orbitron',
      fontSize: '20px',
      color: '#666688',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }
}
