import { AVPlaybackStatus } from 'expo-av';

export type VideoQuality = 'low' | 'medium' | 'high';

interface QualitySettings {
  progressUpdateInterval: number;
  label: string;
  description: string;
}

// Paramètres par qualité
export const QUALITY_SETTINGS: Record<VideoQuality, QualitySettings> = {
  high: {
    progressUpdateInterval: 500,
    label: 'Haute qualité',
    description: 'Meilleure qualité (WiFi recommandé)',
  },
  medium: {
    progressUpdateInterval: 1000,
    label: 'Qualité moyenne',
    description: 'Équilibre qualité/données',
  },
  low: {
    progressUpdateInterval: 2000,
    label: 'Économie de données',
    description: 'Qualité réduite (3G/4G)',
  },
};

// Moniteur de performance vidéo
export class VideoPerformanceMonitor {
  private bufferingCount = 0;
  private bufferingStartTime = 0;
  private totalBufferingTime = 0;
  private playbackStartTime = 0;
  private lastCheckTime = 0;
  private isBuffering = false;

  reset() {
    this.bufferingCount = 0;
    this.bufferingStartTime = 0;
    this.totalBufferingTime = 0;
    this.playbackStartTime = Date.now();
    this.lastCheckTime = Date.now();
    this.isBuffering = false;
  }

  onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;

    const now = Date.now();

    // Détecter le début du buffering
    if (status.isBuffering && !this.isBuffering) {
      this.isBuffering = true;
      this.bufferingStartTime = now;
      this.bufferingCount++;
      console.log(`⏸️ Buffering détecté (${this.bufferingCount})`);
    }

    // Détecter la fin du buffering
    if (!status.isBuffering && this.isBuffering) {
      this.isBuffering = false;
      if (this.bufferingStartTime > 0) {
        const bufferingDuration = now - this.bufferingStartTime;
        this.totalBufferingTime += bufferingDuration;
        console.log(`▶️ Buffering terminé (${bufferingDuration}ms)`);
      }
    }
  }

  // Analyse de la performance
  getPerformanceAnalysis(): {
    shouldReduceQuality: boolean;
    shouldIncreaseQuality: boolean;
    stats: {
      bufferingCount: number;
      totalBufferingTime: number;
      playbackDuration: number;
      bufferingRatio: number;
    };
  } {
    const now = Date.now();
    const playbackDuration = now - this.playbackStartTime;
    const bufferingRatio = playbackDuration > 0 ? this.totalBufferingTime / playbackDuration : 0;

    // Critères pour réduire la qualité
    const shouldReduceQuality =
      (playbackDuration > 20000 && this.bufferingCount >= 3) || // 3+ bufferings en 20s
      (playbackDuration > 10000 && bufferingRatio > 0.25); // Plus de 25% du temps en buffering

    // Critères pour augmenter la qualité
    const shouldIncreaseQuality =
      playbackDuration > 60000 && // Au moins 60s de lecture
      this.bufferingCount <= 1 && // Maximum 1 buffering
      bufferingRatio < 0.05; // Moins de 5% du temps en buffering

    return {
      shouldReduceQuality,
      shouldIncreaseQuality,
      stats: {
        bufferingCount: this.bufferingCount,
        totalBufferingTime: this.totalBufferingTime,
        playbackDuration,
        bufferingRatio,
      },
    };
  }

  getStats() {
    const analysis = this.getPerformanceAnalysis();
    return analysis.stats;
  }
}

// Gestionnaire de qualité adaptative
export class AdaptiveQualityManager {
  private currentQuality: VideoQuality = 'medium';
  private monitor = new VideoPerformanceMonitor();
  private checkInterval: NodeJS.Timeout | null = null;
  private onQualityChangeCallback: ((quality: VideoQuality) => void) | null = null;

  constructor(initialQuality: VideoQuality = 'medium') {
    this.currentQuality = initialQuality;
  }

  initialize() {
    this.monitor.reset();
    console.log(`🎬 Qualité initiale: ${this.currentQuality}`);
  }

  startMonitoring(onQualityChange: (quality: VideoQuality) => void) {
    this.onQualityChangeCallback = onQualityChange;
    
    // Vérifier la performance toutes les 15 secondes
    this.checkInterval = setInterval(() => {
      this.checkAndAdjustQuality();
    }, 15000);
    
    console.log('📊 Monitoring de qualité démarré');
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('📊 Monitoring de qualité arrêté');
  }

  private checkAndAdjustQuality() {
    const analysis = this.monitor.getPerformanceAnalysis();
    
    console.log('📊 Analyse performance:', {
      qualité: this.currentQuality,
      bufferings: analysis.stats.bufferingCount,
      ratio: `${(analysis.stats.bufferingRatio * 100).toFixed(1)}%`,
    });

    if (analysis.shouldReduceQuality && this.currentQuality !== 'low') {
      const newQuality = this.getReducedQuality();
      console.log(`📉 Réduction qualité: ${this.currentQuality} → ${newQuality}`);
      this.setQuality(newQuality);
    } else if (analysis.shouldIncreaseQuality && this.currentQuality !== 'high') {
      const newQuality = this.getIncreasedQuality();
      console.log(`📈 Augmentation qualité: ${this.currentQuality} → ${newQuality}`);
      this.setQuality(newQuality);
    }
  }

  private getReducedQuality(): VideoQuality {
    if (this.currentQuality === 'high') return 'medium';
    if (this.currentQuality === 'medium') return 'low';
    return 'low';
  }

  private getIncreasedQuality(): VideoQuality {
    if (this.currentQuality === 'low') return 'medium';
    if (this.currentQuality === 'medium') return 'high';
    return 'high';
  }

  private setQuality(quality: VideoQuality) {
    this.currentQuality = quality;
    this.monitor.reset(); // Réinitialiser les stats après changement
    
    if (this.onQualityChangeCallback) {
      this.onQualityChangeCallback(quality);
    }
  }

  onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    this.monitor.onPlaybackStatusUpdate(status);
  }

  getCurrentQuality(): VideoQuality {
    return this.currentQuality;
  }

  getStats() {
    return {
      currentQuality: this.currentQuality,
      ...this.monitor.getStats(),
    };
  }

  manualSetQuality(quality: VideoQuality) {
    console.log(`🎛️ Changement manuel: ${this.currentQuality} → ${quality}`);
    this.setQuality(quality);
  }

  destroy() {
    this.stopMonitoring();
  }
}
