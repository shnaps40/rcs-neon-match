import Phaser from 'phaser';

const AUDIO_STORAGE_KEY = 'neon_match_audio';

interface AudioStorage {
  enabled: boolean;
  trackIndex: number;
}

export class AudioManager {
  private game: Phaser.Game | null = null;
  private currentTrackIndex = 0;
  private isEnabled = true;
  private isPlaying = false;
  private currentSound: Phaser.Sound.HTML5AudioSound | null = null;
  private tracksLoaded = false;
  private globalScene: Phaser.Scene | null = null;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (saved) {
        const data: AudioStorage = JSON.parse(saved);
        this.isEnabled = data.enabled ?? true;
        this.currentTrackIndex = data.trackIndex ?? 0;
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }
  }

  private saveSettings(): void {
    try {
      const data: AudioStorage = {
        enabled: this.isEnabled,
        trackIndex: this.currentTrackIndex,
      };
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save audio settings:', e);
    }
  }

  init(scene: Phaser.Scene): void {
    if (!this.game) {
      this.game = scene.game;
      this.globalScene = scene;
    }
    
    this.globalScene = scene;
    
    if (this.isPlaying && !this.currentSound) {
      this.resumePlayback();
    } else if (!this.tracksLoaded && this.isEnabled) {
      this.preloadTracks();
    }
  }

  private preloadTracks(): void {
    if (!this.globalScene) return;
    
    const loadedKeys: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const key = `track${i}`;
      if (this.globalScene.cache.audio.exists(key)) {
        loadedKeys.push(key);
      } else {
        this.globalScene.load.audio(key, `/${i}.mp3`);
      }
    }
    
    if (this.globalScene.load.isLoading()) {
      this.globalScene.load.once('complete', () => {
        this.tracksLoaded = true;
        if (this.isEnabled && !this.isPlaying) {
          this.playCurrentTrack();
        }
      });
      this.globalScene.load.start();
    } else if (loadedKeys.length === 4) {
      this.tracksLoaded = true;
      if (this.isEnabled && !this.isPlaying) {
        this.playCurrentTrack();
      }
    } else {
      this.globalScene.load.once('complete', () => {
        this.tracksLoaded = true;
        if (this.isEnabled && !this.isPlaying) {
          this.playCurrentTrack();
        }
      });
      this.globalScene.load.start();
    }
  }

  private resumePlayback(): void {
    if (!this.globalScene || !this.isEnabled) return;

    const trackKey = `track${this.currentTrackIndex + 1}`;
    
    if (!this.globalScene.cache.audio.exists(trackKey)) {
      this.preloadTracks();
      return;
    }
    
    let sound = this.globalScene.sound.get(trackKey) as Phaser.Sound.HTML5AudioSound;
    
    if (!sound) {
      sound = this.globalScene.sound.add(trackKey) as Phaser.Sound.HTML5AudioSound;
    }
    
    if (sound) {
      this.currentSound = sound;
      this.isPlaying = true;
    }
  }

  private playCurrentTrack(): void {
    if (!this.globalScene || !this.isEnabled) {
      return;
    }

    if (this.currentSound && this.currentSound.isPlaying) {
      return;
    }

    const trackKey = `track${this.currentTrackIndex + 1}`;
    
    if (!this.globalScene.cache.audio.exists(trackKey)) {
      this.globalScene.load.audio(trackKey, `/${trackKey}.mp3`);
      this.globalScene.load.once('complete', () => {
        this.playCurrentTrack();
      });
      this.globalScene.load.start();
      return;
    }
    
    let sound = this.globalScene.sound.get(trackKey) as Phaser.Sound.HTML5AudioSound;
    
    if (!sound) {
      sound = this.globalScene.sound.add(trackKey) as Phaser.Sound.HTML5AudioSound;
    }
    
    if (sound) {
      this.currentSound = sound;
      
      try {
        sound.once('complete', () => {
          if (this.isPlaying) {
            this.next();
          }
        });
        
        sound.play({ volume: 0.5 });
        this.isPlaying = true;
      } catch (e) {
        console.warn('Error playing audio:', e);
      }
    }
  }

  play(): void {
    if (!this.isEnabled) return;
    
    this.isPlaying = true;
    
    if (this.currentSound && this.currentSound.isPlaying) {
      return;
    }
    
    this.playCurrentTrack();
  }

  stop(): void {
    if (this.currentSound) {
      try {
        if (this.currentSound.isPlaying) {
          this.currentSound.stop();
        }
      } catch (e) {
        console.warn('Error stopping audio:', e);
      }
      this.currentSound = null;
    }
    this.isPlaying = false;
  }

  toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    this.saveSettings();

    if (this.isEnabled) {
      this.play();
    } else {
      this.stop();
    }

    return this.isEnabled;
  }

  next(): void {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % 4;
    this.saveSettings();
    this.playCurrentTrack();
  }

  previous(): void {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + 4) % 4;
    this.saveSettings();
    this.playCurrentTrack();
  }

  getCurrentTrackIndex(): number {
    return this.currentTrackIndex + 1;
  }

  isMusicEnabled(): boolean {
    return this.isEnabled;
  }

  isMusicPlaying(): boolean {
    return this.isPlaying && this.isEnabled && this.currentSound?.isPlaying === true;
  }
}

export const audioManager = new AudioManager();
