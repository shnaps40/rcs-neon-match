import Phaser from 'phaser'

export type Listener = (...args: any[]) => void

// Simple global event bus built on Phaser's EventEmitter
export class EventBus {
  private static _instance: EventBus = new EventBus()
  private emitter: Phaser.Events.EventEmitter

  private constructor() {
    this.emitter = new Phaser.Events.EventEmitter()
  }

  static getInstance(): EventBus {
    return EventBus._instance
  }

  on(event: string, listener: Listener, context?: any): void {
    this.emitter.on(event, listener, context)
  }

  off(event?: string, listener?: Listener): void {
    if (event) this.emitter.off(event, listener)
    else this.emitter.removeAllListeners()
  }

  emit(event: string, ...args: any[]): void {
    this.emitter.emit(event, ...args)
  }
}

export default EventBus.getInstance()
