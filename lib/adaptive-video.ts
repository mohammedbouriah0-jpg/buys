import NetInfo from '@react-native-community/netinfo';
import { AVPlaybackStatus } from 'expo-av';

export type VideoQuality = 'low' | 'medium' | 'high' | 'auto';
export type NetworkType = 'wifi' | '4g' | '3g' | '2g' | 'unknown';

interface AdaptiveSettings {
  quality: VideoQuality;
  shouldPlay: boolean;
  progressUpdateInterval: number;
  maxBufferSize?: number;
}

// Détection du type de réseau
export const detectNetworkType = async (): Promise<NetworkType> => {
  const state = await NetInfo.fetch();
  
  if (!state.isConnected) return 'unknown';
  
  if (state.type === 'wifi') return 'wifi';
  if (state.type === 'cellular') {
    // Estimation basée sur la vitesse effective
    const effectiveType = (state.details as any)?.cellularGeneration;
    if (effectiveType === '4g' || effectiveType === '5g') return '4g';
    if (effectiveType === '3g') return '3g';
    return '2g';
  }
  
  return 'unknown';
};

// Recommandations de qualité selon le réseau
export const getRecommendedQuality = (networkType: NetworkType): VideoQuality => {
  switch (networkType) {
    case 'wifi':
    case '4g':
      return 'high';
    case '3g':
      return 'medium';
    case '2g':
      return 'low';
    default:
      return 'medium';
  }
};

// Paramètres adaptatifs selon la qualité
export const getAdaptiveSettings = (quality: VideoQuality, networkType: NetworkType): AdaptiveSettings => {
  const baseSettings: Record<VideoQuality, AdaptiveSettings> = {
    high: {
      quality: 'high',
      shouldPlay: true,
      progressUpdateInterval: 500,
    },
    medium: {
      quality: 'medium',
      shouldPlay: true,
      progressUpdateInterval: 1000,
    },
    low: {
      quality: 'low',
      shouldPlay: true,
      progressUpdateInterval: 2000,
    },
    auto: {
      quality: getRecommendedQuality(networkType),
      shouldPlay: true,
      progressUpdateInterval: networkType === 'wifi' ? 500 : 1000,
    },
  };

  return baseSettings[quality];
};

// Moniteur de performance vidéo
export class VideoPerformanceMonitor {
  private bufferingCount = 0;
  private lastBufferingTime = 0;
  private playbackStartTime = 0;
  private totalBufferingTime = 0;
  private currentQuality: VideoQuality = 'auto';

  reset() {
    this.bufferingCount = 0;
    this.lastBufferingTime = 0;
    this.playbackStartTime = Date.now();
    this.totalBufferingTime = 0;
  }

  onBufferingStart() {
    this.bufferingCount++;
    this.lastBufferingTime = Date.now();
  }

  onBufferingEnd() {
    if (this.lastBufferingTime > 0) {
      this.totalBufferingTime += Date.now() - this.lastBufferingTime;
      this.lastBufferingTime = 0;
    }
  }

  // Détermine si on doit réduire la qualité
  shouldReduceQuality(): boolean {
    const playbackDuration = Date.now() - this.playbackStartTime;
    
    // Si plus de 3 bufferings en 30 secondes
    if (playbackDuration > 30000 && this.bufferingCount > 3) {
      return true;
    }
    
    // Si le temps de buffering dépasse 20% du temps de lecture
    if (playbackDuration > 10000 && this.totalBufferingTime / playbackDuration > 0.2) {
      return true;
    }
    
    return false;
  }

  // Détermine si on peut augmenter la qualité
  shouldIncreaseQuality(): boolean {
    const playbackDuration = Date.now() - this.playbackStartTime;
    
    // Après 60 secondes de lecture fluide (moins de 2 bufferings)
    if (playbackDuration > 60000 && this.bufferingCount < 2) {
      return true;
    }
    
    // Si le temps de buffering est inférieur à 5% du temps de lecture
    if (playbackDuration > 30000 && this.totalBufferingTime / playbackDuration < 0.05) {
      return true;
    }
    
    return false;
  }

  getStats() {
    return {
      bufferingCount: this.bufferingCount,
      totalBufferingTime: this.totalBufferingTime,
      currentQuality: this.currentQuality,
    };
  }

  setQuality(quality: VideoQuality) {
    this.currentQuality = quality;
  }
}

// Gestionnaire de qualité adaptative
export class AdaptiveQualityManager {
  private currentQuality: VideoQuality = 'auto';
  private networkType: NetworkType = 'unknown';
  private monitor = new VideoPerformanceMonitor();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(initialQuality: VideoQuality = 'auto') {
    this.currentQuality = initialQuality;
  }

  async initialize() {
    this.networkType = await detectNetworkType();
    if (this.currentQuality === 'auto') {
      this.currentQuality = getRecommendedQuality(this.networkType);
    }
    this.monitor.setQuality(this.currentQuality);
    this.monitor.reset();
  }

  startMonitoring(onQualityChange: (quality: VideoQuality) => void) {
    this.checkInterval = setInterval(() => {
      if (this.currentQuality === 'auto') {
        this.adjustQuality(onQualityChange);
      }
    }, 10000); // Vérifier toutes les 10 secondes
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private adjustQuality(onQualityChange: (quality: VideoQuality) => void) {
    const recommendedQuality = getRecommendedQuality(this.networkType);
    
    if (this.monitor.shouldReduceQuality()) {
      // Réduire la qualité
      const newQuality = this.getReducedQuality(this.currentQuality);
      if (newQuality !== this.currentQuality) {
        console.log(`📉 Réduction qualité: ${this.currentQuality} → ${newQuality}`);
        this.currentQuality = newQuality;
        this.monitor.setQuality(newQuality);
        this.monitor.reset();
        onQualityChange(newQuality);
      }
    } else if (this.monitor.shouldIncreaseQuality()) {
      // Augmenter la qualité (mais pas au-delà de la recommandation réseau)
      const newQuality = this.getIncreasedQuality(this.currentQuality, recommendedQuality);
      if (newQuality !== this.currentQuality) {
        console.log(`📈 Augmentation qualité: ${this.currentQuality} → ${newQuality}`);
        this.currentQuality = newQuality;
        this.monitor.setQuality(newQuality);
        this.monitor.reset();
        onQualityChange(newQuality);
      }
    }
  }

  private getReducedQuality(current: VideoQuality): VideoQuality {
    const qualityLevels: VideoQuality[] = ['high', 'medium', 'low'];
    const currentIndex = qualityLevels.indexOf(current);
    if (currentIndex < qualityLevels.length - 1) {
      return qualityLevels[currentIndex + 1];
    }
    return current;
  }

  private getIncreasedQuality(current: VideoQuality, maxQuality: VideoQuality): VideoQuality {
    const qualityLevels: VideoQuality[] = ['low', 'medium', 'high'];
    const currentIndex = qualityLevels.indexOf(current);
    const maxIndex = qualityLevels.indexOf(maxQuality);
    
    if (currentIndex > 0 && currentIndex - 1 <= maxIndex) {
      return qualityLevels[currentIndex - 1];
    }
    return current;
  }

  onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;

    // Détecter le buffering
    if (status.isBuffering) {
      this.monitor.onBufferingStart();
    } else {
      this.monitor.onBufferingEnd();
    }
  }

  getCurrentQuality(): VideoQuality {
    return this.currentQuality;
  }

  getStats() {
    return {
      ...this.monitor.getStats(),
      networkType: this.networkType,
    };
  }

  async updateNetworkType() {
    this.networkType = await detectNetworkType();
  }

  destroy() {
    this.stopMonitoring();
  }
}

// Hook pour utiliser la qualité adaptative
export const useAdaptiveQuality = () => {
  const [quality, setQuality] = React.useState<VideoQuality>('auto');
  const [networkType, setNetworkType] = React.useState<NetworkType>('unknown');
  const managerRef = React.useRef<AdaptiveQualityManager | null>(null);

  React.useEffect(() => {
    const manager = new AdaptiveQualityManager(quality);
    managerRef.current = manager;

    manager.initialize().then(() => {
      setQuality(manager.getCurrentQuality());
    });

    // Écouter les changements de réseau
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      await manager.updateNetworkType();
      const newNetworkType = await detectNetworkType();
      setNetworkType(newNetworkType);
    });

    return () => {
      manager.destroy();
      unsubscribe();
    };
  }, []);

  const startMonitoring = React.useCallback(() => {
    managerRef.current?.startMonitoring((newQuality) => {
      setQuality(newQuality);
    });
  }, []);

  const stopMonitoring = React.useCallback(() => {
    managerRef.current?.stopMonitoring();
  }, []);

  const onPlaybackStatusUpdate = React.useCallback((status: AVPlaybackStatus) => {
    managerRef.current?.onPlaybackStatusUpdate(status);
  }, []);

  return {
    quality,
    networkType,
    startMonitoring,
    stopMonitoring,
    onPlaybackStatusUpdate,
    getStats: () => managerRef.current?.getStats(),
  };
};

// Import React pour le hook
import React from 'react';
