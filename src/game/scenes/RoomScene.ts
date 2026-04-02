import Phaser from 'phaser';
import { SaveSystem } from '../../meta/SaveSystem';
import { RoomDecor, DECOR_ITEMS, DecorItem } from '../../meta/RoomDecor';
import { audioManager } from '../../audio/AudioManager';
import { createAudioPanel } from '../../ui/AudioPanel';

export class RoomScene extends Phaser.Scene {
  private saveSystem!: SaveSystem;
  private roomDecor!: RoomDecor;
  private starsText!: Phaser.GameObjects.Text;
  private selectedCategory: DecorItem['category'] = 'wall';
  private audioToggleBtn!: Phaser.GameObjects.Text;
  private audioNextBtn!: Phaser.GameObjects.Text;
  private trackText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RoomScene' });
  }

  create(): void {
    this.saveSystem = new SaveSystem();
    this.roomDecor = new RoomDecor(this.saveSystem.getRoomDecor());
    
    this.cameras.main.setBackgroundColor(0x0A0A0F);
    this.createBackground();
    this.createRoom();
    this.createUI();
    this.createShop();
    // Shared audio panel across scenes
    const ap = createAudioPanel(this);
    this.add.existing(ap.panel);
    ap.updateUI();
    (this as any).audioPanel = ap;
    
    audioManager.init(this);
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1A1A2E, 0.5);
    for (let x = 0; x < width; x += 40) {
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 40) {
      grid.moveTo(0, y);
      grid.lineTo(width, y);
    }
    grid.strokePath();

    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const color = Phaser.Math.RND.pick([0xFF00FF, 0x00FFFF, 0x0066FF]);
      const star = this.add.circle(x, y, Phaser.Math.Between(1, 2), color, 0.3);
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(500, 1500),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createRoom(): void {
    const { width, height } = this.cameras.main;
    const roomY = 80;
    const roomHeight = 300;

    const roomBg = this.add.graphics();
    roomBg.fillStyle(0x0A0A0F, 1);
    roomBg.fillRoundedRect(20, roomY, width - 40, roomHeight, 10);
    roomBg.lineStyle(3, 0xFF00FF, 0.5);
    roomBg.strokeRoundedRect(20, roomY, width - 40, roomHeight, 10);

    const ownedItems = this.roomDecor.getOwnedItems();
    
    if (ownedItems.length === 0) {
      this.add.text(width / 2, roomY + roomHeight / 2, 'EMPTY ROOM\nBuy decorations!', {
        fontFamily: 'Orbitron',
        fontSize: '18px',
        color: '#333355',
        align: 'center',
      }).setOrigin(0.5);
    } else {
      let yOffset = roomY + 30;
      for (const item of ownedItems.slice(0, 4)) {
        const decor = this.add.graphics();
        decor.fillStyle(item.color, 0.5);
        decor.fillCircle(width / 2 - 50, yOffset, 15);
        
        this.add.text(width / 2 - 20, yOffset, item.name, {
          fontFamily: 'Orbitron',
          fontSize: '14px',
          color: '#888888',
        }).setOrigin(0, 0.5);
        
        yOffset += 40;
      }
    }
  }

  private createUI(): void {
    const { width } = this.cameras.main;

    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1A1A2E, 0.8);
    headerBg.fillRect(0, 0, width, 60);

    this.add.text(20, 20, 'NEON ROOM', {
      fontFamily: 'Orbitron',
      fontSize: '20px',
      color: '#FF00FF',
    });

    this.starsText = this.add.text(width - 20, 20, `⭐ ${this.saveSystem.getStars()}`, {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: '#FF00FF',
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

  private createShop(): void {
    const { width, height } = this.cameras.main;
    const shopY = 400;

    this.add.text(20, shopY - 30, 'DECOR SHOP', {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: '#00FFFF',
    });

    const categories: DecorItem['category'][] = ['wall', 'floor', 'furniture', 'decoration'];
    const categoryLabels: Record<DecorItem['category'], string> = {
      wall: 'WALL',
      floor: 'FLOOR',
      furniture: 'FURNITURE',
      decoration: 'DECOR',
    };

    let catX = 20;
    for (const cat of categories) {
      const btn = this.add.text(catX, shopY, categoryLabels[cat], {
        fontFamily: 'Orbitron',
        fontSize: '14px',
        color: cat === this.selectedCategory ? '#00FF66' : '#444455',
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.selectedCategory = cat;
        this.updateShopItems();
      });
      
      catX += 90;
    }

    this.updateShopItems();
  }

  private updateShopItems(): void {
    const { width } = this.cameras.main;
    const startY = 450;
    
    const existingItems = this.children.list.filter(
      obj => obj.getData && obj.getData('isShopItem')
    );
    existingItems.forEach(obj => obj.destroy());

    const items = this.roomDecor.getItemsByCategory(this.selectedCategory);
    
    items.forEach((item, idx) => {
      const x = 20 + (idx % 3) * 150;
      const y = startY + Math.floor(idx / 3) * 80;
      
      const container = this.add.container(x, y);
      container.setData('isShopItem', true);
      container.setData('itemId', item.id);

      const bg = this.add.graphics();
      const owned = this.roomDecor.isOwned(item.id);
      
      bg.fillStyle(owned ? 0x00FF66 : 0x1A1A2E, owned ? 0.3 : 0.5);
      bg.fillRoundedRect(0, 0, 130, 60, 8);
      
      if (!owned) {
        bg.lineStyle(2, item.color, 0.8);
        bg.strokeRoundedRect(0, 0, 130, 60, 8);
      }

      const colorSwatch = this.add.graphics();
      colorSwatch.fillStyle(item.color, 1);
      colorSwatch.fillCircle(20, 30, 12);

      this.add.text(40, 15, item.name, {
        fontFamily: 'Orbitron',
        fontSize: '12px',
        color: owned ? '#00FF66' : '#AAAAAA',
      });

      if (owned) {
        this.add.text(40, 40, 'OWNED', {
          fontFamily: 'Orbitron',
          fontSize: '11px',
          color: '#00FF66',
        });
      } else {
        this.add.text(40, 40, `⭐ ${item.cost}`, {
          fontFamily: 'Orbitron',
          fontSize: '11px',
          color: '#FF00FF',
        });

        container.setSize(130, 60);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
          this.purchaseItem(item);
        });
      }

      container.add([bg, colorSwatch]);
    });
  }

  private purchaseItem(item: DecorItem): void {
    if (this.roomDecor.isOwned(item.id)) return;

    if (this.saveSystem.getStars() >= item.cost) {
      if (this.saveSystem.spendStars(item.cost)) {
        this.roomDecor.purchase(item.id);
        
        const owned = this.saveSystem.getRoomDecor();
        owned.push(item.id);
        
        this.starsText.setText(`⭐ ${this.saveSystem.getStars()}`);
        this.updateShopItems();
        this.scene.restart();
      }
    } else {
      const { width, height } = this.cameras.main;
      const msg = this.add.text(width / 2, height / 2, 'Not enough stars!', {
        fontFamily: 'Orbitron',
        fontSize: '24px',
        color: '#FF0000',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: msg,
        alpha: 0,
        duration: 1500,
        onComplete: () => msg.destroy(),
      });
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
