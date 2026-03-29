/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SOUND_URLS = {
  UI_CLICK: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
  UI_HOVER: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
  TOWER_DEPLOY: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  TOWER_FIRE: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
  ENEMY_DESTROY: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  ENEMY_HIT: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
  ENERGY_GAIN: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
};

class SoundService {
  private static instance: SoundService;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isMuted: boolean = false;

  private constructor() {
    // Preload sounds
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    });
  }

  public static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  public play(soundKey: keyof typeof SOUND_URLS): void {
    if (this.isMuted) return;
    
    const audio = this.sounds.get(soundKey);
    if (audio) {
      const playPromise = audio.cloneNode() as HTMLAudioElement;
      playPromise.volume = 0.4;
      playPromise.play().catch((err) => {
        console.warn(`Sound play failed for ${soundKey}:`, err);
      });
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }
}

export const soundService = SoundService.getInstance();
