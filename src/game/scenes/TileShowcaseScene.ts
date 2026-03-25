import Phaser from 'phaser'

enum TileShape { SQUARE, DIAMOND, HEX, PARALLELOGRAM }

export class TileShowcaseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TileShowcaseScene' })
  }

  preload(): void {
    // no assets needed; demo only
  }

  create(): void {
    const { width, height } = this.cameras.main
    const tileSize = 90
    const startX = (width - 5 * tileSize) / 2 + tileSize / 2
    const startY = height * 0.15 + tileSize / 2

    // 5 colors: cyber purple, electric blue, toxic green, yellow-orange, blood red
    const colors = [0x6A0DAD, 0x00FFFF, 0x00FF66, 0xFFAA00, 0xFF0000]
    const shapes5 = [TileShape.SQUARE, TileShape.DIAMOND, TileShape.HEX, TileShape.PARALLELOGRAM, TileShape.SQUARE]

    // 5x5 grid: 5 rows x 5 cols
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const x = startX + c * tileSize
        const y = startY + r * tileSize
        const color = colors[c]
        const shape = shapes5[r]
        this.renderTile(x, y, tileSize * 0.92, color, shape)
      }
    }
  }

  private renderTile(x: number, y: number, size: number, color: number, shape: TileShape) {
    const g = this.add.graphics({ x, y })
    const half = size / 2
    // Neon glow backdrop (outer halo)
    g.fillStyle(color, 0.25)
    g.fillRect(-size/2 - 6, -size/2 - 6, size + 12, size + 12)
    // Core shape
    switch (shape) {
      case TileShape.SQUARE:
        g.fillStyle(color, 1)
        g.fillRect(-half + 14, -half + 14, size - 28, size - 28)
        g.lineStyle(4, color, 1)
        g.strokeRect(-half + 14, -half + 14, size - 28, size - 28)
        break
      case TileShape.DIAMOND:
        g.fillStyle(color, 1)
        g.beginPath()
        g.moveTo(0, -half + 12)
        g.lineTo(half - 12, 0)
        g.lineTo(0, half - 12)
        g.lineTo(-half + 12, 0)
        g.closePath()
        g.fillPath()
        g.lineStyle(4, color, 1)
        g.strokePath()
        break
      case TileShape.HEX:
        g.fillStyle(color, 1)
        const r = half - 10
        g.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i
          const px = Math.cos(a) * r
          const py = Math.sin(a) * r
          if (i === 0) {
            g.moveTo(px, py)
          } else {
            g.lineTo(px, py)
          }
        }
        g.closePath()
        g.fillPath()
        g.lineStyle(4, color, 1)
        g.strokePath()
        break
      case TileShape.PARALLELOGRAM:
        g.fillStyle(color, 1)
        g.beginPath()
        g.moveTo(-half + 8, -half + 8)
        g.lineTo(half - 8, -half + 8)
        g.lineTo(half - 18, half - 8)
        g.lineTo(-half - 8, half - 8)
        g.closePath()
        g.fillPath()
        g.lineStyle(4, color, 1)
        g.strokePath()
        break
    }
  }
}
