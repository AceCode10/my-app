/**
 * Sound Manager for gamification audio feedback
 * Uses Howler.js for cross-browser audio support
 */

import { Howl, Howler } from 'howler';

export type SoundEffect = 
  // XP Sounds
  | 'xp_gain_small'
  | 'xp_gain_medium'
  | 'xp_gain_large'
  // Level Sounds
  | 'level_up'
  | 'level_milestone'
  // Streak Sounds
  | 'streak_continue'
  | 'streak_milestone'
  | 'streak_lost'
  | 'streak_freeze'
  // Badge Sounds
  | 'badge_common'
  | 'badge_rare'
  | 'badge_legendary'
  // Quiz Sounds
  | 'answer_correct'
  | 'answer_incorrect'
  | 'quiz_complete'
  | 'perfect_score'
  // UI Sounds
  | 'button_click'
  | 'notification'
  | 'goal_complete';

// Sound file paths - these will need actual audio files
const SOUND_PATHS: Record<SoundEffect, string> = {
  // XP Sounds
  xp_gain_small: '/sounds/xp-small.mp3',
  xp_gain_medium: '/sounds/xp-medium.mp3',
  xp_gain_large: '/sounds/xp-large.mp3',
  
  // Level Sounds
  level_up: '/sounds/level-up.mp3',
  level_milestone: '/sounds/level-milestone.mp3',
  
  // Streak Sounds
  streak_continue: '/sounds/streak-continue.mp3',
  streak_milestone: '/sounds/streak-milestone.mp3',
  streak_lost: '/sounds/streak-lost.mp3',
  streak_freeze: '/sounds/streak-freeze.mp3',
  
  // Badge Sounds
  badge_common: '/sounds/badge-common.mp3',
  badge_rare: '/sounds/badge-rare.mp3',
  badge_legendary: '/sounds/badge-legendary.mp3',
  
  // Quiz Sounds
  answer_correct: '/sounds/correct.mp3',
  answer_incorrect: '/sounds/incorrect.mp3',
  quiz_complete: '/sounds/quiz-complete.mp3',
  perfect_score: '/sounds/perfect-score.mp3',
  
  // UI Sounds
  button_click: '/sounds/click.mp3',
  notification: '/sounds/notification.mp3',
  goal_complete: '/sounds/goal-complete.mp3',
};

// Volume presets for different sound types
const VOLUME_PRESETS: Partial<Record<SoundEffect, number>> = {
  xp_gain_small: 0.3,
  xp_gain_medium: 0.4,
  xp_gain_large: 0.5,
  level_up: 0.6,
  badge_legendary: 0.7,
  button_click: 0.2,
  notification: 0.4,
};

class SoundManager {
  private sounds: Map<SoundEffect, Howl> = new Map();
  private enabled: boolean = true;
  private masterVolume: number = 0.5;
  private initialized: boolean = false;
  private failedSounds: Set<SoundEffect> = new Set();

  /**
   * Initialize the sound manager and preload critical sounds
   */
  init(): void {
    if (this.initialized) return;
    
    // Check for user's sound preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gamification-settings');
      if (stored) {
        try {
          const settings = JSON.parse(stored);
          this.enabled = settings.state?.soundEnabled ?? true;
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    // Preload frequently used sounds
    this.preload([
      'xp_gain_small',
      'xp_gain_medium',
      'answer_correct',
      'answer_incorrect',
      'notification',
    ]);
    
    this.initialized = true;
  }

  /**
   * Preload specific sounds for instant playback
   */
  preload(soundKeys: SoundEffect[]): void {
    soundKeys.forEach((key) => {
      if (!this.sounds.has(key) && !this.failedSounds.has(key)) {
        this.loadSound(key);
      }
    });
  }

  /**
   * Load a single sound
   */
  private loadSound(key: SoundEffect): Howl | null {
    const path = SOUND_PATHS[key];
    if (!path) return null;

    try {
      const sound = new Howl({
        src: [path],
        volume: (VOLUME_PRESETS[key] ?? 0.5) * this.masterVolume,
        preload: true,
        onloaderror: () => {
          console.warn(`Failed to load sound: ${key}`);
          this.failedSounds.add(key);
        },
      });

      this.sounds.set(key, sound);
      return sound;
    } catch (error) {
      console.warn(`Error creating sound ${key}:`, error);
      this.failedSounds.add(key);
      return null;
    }
  }

  /**
   * Play a sound effect
   */
  play(
    soundKey: SoundEffect,
    options?: { volume?: number; rate?: number }
  ): void {
    if (!this.enabled) return;
    if (this.failedSounds.has(soundKey)) return;

    let sound = this.sounds.get(soundKey);
    
    if (!sound) {
      sound = this.loadSound(soundKey);
    }

    if (sound) {
      // Apply options
      if (options?.volume !== undefined) {
        sound.volume(options.volume * this.masterVolume);
      }
      if (options?.rate !== undefined) {
        sound.rate(options.rate);
      }

      sound.play();
    }
  }

  /**
   * Play XP gain sound based on amount
   */
  playXPGain(amount: number): void {
    if (amount >= 50) {
      this.play('xp_gain_large');
    } else if (amount >= 20) {
      this.play('xp_gain_medium');
    } else {
      this.play('xp_gain_small');
    }
  }

  /**
   * Play badge unlock sound based on rarity
   */
  playBadgeUnlock(rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'): void {
    if (rarity === 'legendary' || rarity === 'epic') {
      this.play('badge_legendary');
    } else if (rarity === 'rare' || rarity === 'uncommon') {
      this.play('badge_rare');
    } else {
      this.play('badge_common');
    }
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Howler.mute(!enabled);
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    this.sounds.forEach((sound) => {
      sound.stop();
    });
  }

  /**
   * Cleanup and release resources
   */
  destroy(): void {
    this.stopAll();
    this.sounds.forEach((sound) => {
      sound.unload();
    });
    this.sounds.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Initialize on client side
if (typeof window !== 'undefined') {
  // Delay initialization to not block initial render
  setTimeout(() => {
    soundManager.init();
  }, 1000);
}
