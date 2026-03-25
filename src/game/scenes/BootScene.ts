import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image('LogoViolet', '/LogoViolet.png');
    
    for (let i = 1; i <= 4; i++) {
      this.load.audio(`track${i}`, `/${i}.mp3`);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0A0A0F);
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const logo = this.add.image(width / 2, height / 2 - 30, 'LogoViolet');
    logo.setScale(Math.min(width * 0.7 / logo.width, 0.4));

    this.tweens.add({
      targets: logo,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Ждём завершения загрузки
    if (this.load.isLoading()) {
      this.load.once('complete', () => {
        this.time.delayedCall(500, () => {
          this.scene.start('MainMenuScene');
        });
      });
    } else {
      this.time.delayedCall(1500, () => {
        this.scene.start('MainMenuScene');
      });
    }
  }
}
