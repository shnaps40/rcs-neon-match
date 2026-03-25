import { audioManager } from '../audio/AudioManager'
import Phaser from 'phaser'

export function createAudioPanel(scene: Phaser.Scene, config?: { x?: number; y?: number }) {
  const { width, height } = scene.cameras.main
  const x = config?.x ?? width / 2
  const y = config?.y ?? height - 40

  const panel = scene.add.container(x, y)

  const bg = scene.add.graphics()
  const panelW = 180
  const panelH = 40
  bg.fillStyle(0x1A1A2E, 0.7)
  bg.fillRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 8)
  panel.add(bg)

  const toggle = scene.add.text(-60, 0, '🔊', { fontSize: '20px' }).setOrigin(0.5)
  const track = scene.add.text(0, 0, '1/4', { fontFamily: 'Orbitron', fontSize: '12px' }).setOrigin(0.5)
  const next = scene.add.text(60, 0, '⏭', { fontSize: '20px' }).setOrigin(0.5)

  toggle.setInteractive({ useHandCursor: true })
  next.setInteractive({ useHandCursor: true })

  toggle.on('pointerdown', () => {
    audioManager.toggle()
    updateUI()
  })
  next.on('pointerdown', () => {
    audioManager.next()
    updateUI()
  })

  panel.add([toggle, track, next])
  panel.setSize(panelW, panelH)

  function updateUI() {
    toggle.setText(audioManager.isMusicEnabled() ? '🔊' : '🔇')
    track.setText(`${audioManager.getCurrentTrackIndex()}/4`)
  }

  updateUI()
  return { panel, updateUI }
}
