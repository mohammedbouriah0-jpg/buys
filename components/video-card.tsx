import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Heart, MessageCircle, ShoppingBag, Pause, Play, Eye, Wifi, WifiOff } from "lucide-react-native";
import type { Video as VideoType, Shop, Product } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { CommentsSheetModern } from "./comments-sheet-modern";
import { videosAPI, shopsAPI } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/language-context";
import { AdaptiveQualityManager, VideoQuality, QUALITY_SETTINGS } from "@/lib/adaptive-video-simple";

const { height } = Dimensions.get("window");

// Cache global pour les vidéos chargées
const videoCache = new Set<string>();

interface VideoCardProps {
  video: VideoType;
  shop: Shop;
  products: Product[];
  isActive: boolean;
  shouldLoad?: boolean;
  onSubscriptionChange?: (shopId: number, subscribed: boolean) => void;
}

export function VideoCard({ video, shop, products, isActive, shouldLoad = true, onSubscriptionChange }: VideoCardProps) {
  const { isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const [liked, setLiked] = useState((video as any).liked || false);
  const [likes, setLikes] = useState(video.likes || (video as any).likes_count || 0);
  const [subscribed, setSubscribed] = useState((video as any).subscribed || false);
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('medium');
  const [showQualityIndicator, setShowQualityIndicator] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const likeRotate = useRef(new Animated.Value(0)).current;
  const subscribeScale = useRef(new Animated.Value(1)).current;
  const spinnerOpacity = useRef(new Animated.Value(1)).current;
  const qualityManager = useRef<AdaptiveQualityManager | null>(null);

  const commentsCount = video.comments?.length || (video as any).comments_count || 0;
  
  // Vérifier si les qualités multiples sont disponibles (et non NULL)
  const hasMultipleQualities = React.useMemo(() => {
    const videoData = video as any;
    const hasHigh = videoData.video_url_high && videoData.video_url_high !== 'null' && !videoData.video_url_high.includes('null');
    const hasMedium = videoData.video_url_medium && videoData.video_url_medium !== 'null' && !videoData.video_url_medium.includes('null');
    const hasLow = videoData.video_url_low && videoData.video_url_low !== 'null' && !videoData.video_url_low.includes('null');
    
    const result = !!(hasHigh || hasMedium || hasLow);
    console.log(`🔍 Qualités disponibles - High: ${hasHigh}, Medium: ${hasMedium}, Low: ${hasLow} → ${result ? 'OUI' : 'NON'}`);
    return result;
  }, [video]);

  // Sélectionner l'URL de vidéo selon la qualité (recalculé quand videoQuality change)
  const videoUrl = React.useMemo(() => {
    const videoData = video as any;
    
    // Toujours avoir un fallback sur video_url ou videoUrl
    const fallbackUrl = videoData.video_url || videoData.videoUrl;
    
    // Fonction helper pour vérifier si une URL est valide
    const isValidUrl = (url: any) => {
      return url && url !== 'null' && typeof url === 'string' && url.length > 0 && !url.includes('null');
    };
    
    // Si pas de qualités multiples disponibles, toujours utiliser l'URL originale
    if (!hasMultipleQualities) {
      console.log('📹 Pas de qualités multiples, utilisation de l\'URL originale:', fallbackUrl);
      return fallbackUrl;
    }
    
    // Sélectionner selon la qualité demandée avec fallback intelligent
    let selectedUrl = null;
    switch (videoQuality) {
      case 'high':
        if (isValidUrl(videoData.video_url_high)) selectedUrl = videoData.video_url_high;
        else if (isValidUrl(videoData.video_url_medium)) selectedUrl = videoData.video_url_medium;
        else if (isValidUrl(videoData.video_url_low)) selectedUrl = videoData.video_url_low;
        break;
      case 'medium':
        if (isValidUrl(videoData.video_url_medium)) selectedUrl = videoData.video_url_medium;
        else if (isValidUrl(videoData.video_url_low)) selectedUrl = videoData.video_url_low;
        else if (isValidUrl(videoData.video_url_high)) selectedUrl = videoData.video_url_high;
        break;
      case 'low':
        if (isValidUrl(videoData.video_url_low)) selectedUrl = videoData.video_url_low;
        else if (isValidUrl(videoData.video_url_medium)) selectedUrl = videoData.video_url_medium;
        else if (isValidUrl(videoData.video_url_high)) selectedUrl = videoData.video_url_high;
        break;
    }
    
    const finalUrl = selectedUrl || fallbackUrl;
    console.log(`🎬 Qualité: ${videoQuality}, URL: ${finalUrl ? finalUrl.substring(finalUrl.lastIndexOf('/') + 1) : 'NONE'}`);
    return finalUrl;
  }, [video, videoQuality, hasMultipleQualities]);
  
  const videoId = videoUrl || video.id.toString();
  const isCached = videoCache.has(videoId);

  // Initialiser le gestionnaire de qualité adaptative
  useEffect(() => {
    if (!qualityManager.current) {
      qualityManager.current = new AdaptiveQualityManager('medium');
      qualityManager.current.initialize();
    }

    return () => {
      qualityManager.current?.destroy();
    };
  }, []);

  // Démarrer le monitoring quand la vidéo est active (seulement si qualités multiples disponibles)
  useEffect(() => {
    // Ne pas activer le monitoring si pas de qualités multiples
    if (!hasMultipleQualities) {
      console.log('⚠️ Qualité adaptative désactivée (pas de qualités multiples)');
      return;
    }

    if (isActive && isVideoReady && qualityManager.current) {
      qualityManager.current.startMonitoring((newQuality) => {
        setVideoQuality(newQuality);
        setShowQualityIndicator(true);
        
        // Recharger la vidéo avec la nouvelle qualité
        if (videoRef.current) {
          const currentPosition = videoRef.current.getStatusAsync().then((status: any) => {
            if (status.isLoaded && status.positionMillis) {
              return status.positionMillis;
            }
            return 0;
          });
          
          // La vidéo se rechargera automatiquement avec la nouvelle URL
          currentPosition.then((position) => {
            if (videoRef.current && position > 0) {
              videoRef.current.setPositionAsync(position);
            }
          });
        }
        
        // Masquer l'indicateur après 3 secondes
        setTimeout(() => {
          setShowQualityIndicator(false);
        }, 3000);
      });
    } else {
      qualityManager.current?.stopMonitoring();
    }

    return () => {
      qualityManager.current?.stopMonitoring();
    };
  }, [isActive, isVideoReady, hasMultipleQualities]);

  // Synchroniser l'état liked et subscribed avec les données du backend
  useEffect(() => {
    setLiked((video as any).liked || false);
    setLikes(video.likes || (video as any).likes_count || 0);
    setSubscribed((video as any).subscribed || false);
    
    // Debug: Afficher les URLs disponibles
    const videoData = video as any;
    console.log('🎬 Vidéo:', video.id);
    console.log('📹 URL originale:', videoData.video_url || videoData.videoUrl);
    console.log('🟢 URL high:', videoData.video_url_high);
    console.log('🟡 URL medium:', videoData.video_url_medium);
    console.log('🔴 URL low:', videoData.video_url_low);
    console.log('✅ URL sélectionnée:', videoUrl);
    
    // Si la vidéo est en cache, pas besoin de loader
    if (isCached) {
      setIsLoading(false);
      setIsVideoReady(true);
    }
  }, [video.id, (video as any).liked, video.likes, (video as any).likes_count, (video as any).subscribed, isCached, videoUrl]);

  // Incrémenter les vues quand la vidéo devient active
  useEffect(() => {
    if (isActive && shouldLoad) {
      const timer = setTimeout(() => {
        console.log('📊 Incrémentation vue pour vidéo:', video.id);
        videosAPI.view(video.id.toString()).catch((error) => {
          console.error('❌ Erreur incrémentation vue:', error);
        });
      }, 1000); // Attendre 1 seconde avant de compter la vue
      
      return () => clearTimeout(timer);
    }
  }, [isActive, shouldLoad, video.id]);

  // Gérer la lecture automatique et redémarrage quand la vidéo devient visible
  useEffect(() => {
    if (videoRef.current && isVideoReady) {
      if (isActive) {
        // Redémarrer depuis le début quand on revient sur la vidéo
        videoRef.current.setPositionAsync(0);
        videoRef.current.playAsync();
        setIsPlaying(true);
      } else {
        videoRef.current.pauseAsync();
        setIsPlaying(false);
      }
    }
  }, [isActive, isVideoReady]);

  // Animation des contrôles
  useEffect(() => {
    if (showControls) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Masquer automatiquement après 2 secondes
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showControls]);

  const handleVideoLoad = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      console.log("✅ Video loaded and ready:", video.id);
      
      // Ajouter au cache
      if (videoUrl) {
        videoCache.add(videoId);
      }
      
      // Animation de disparition du spinner
      Animated.timing(spinnerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);
        setIsVideoReady(true);
      });
    }
  };

  const handleVideoError = (error: string) => {
    console.log("❌ Video error:", error);
    setIsLoading(false);
    setIsVideoReady(false);
  };

  const togglePlayPause = async () => {
    if (videoRef.current && isVideoReady) {
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    }
    setShowControls(true);
  };

  const handleVideoPress = () => {
    if (isVideoReady) {
      togglePlayPause();
    }
  };



  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (liking) return;

    setLiking(true);

    // Animation de like
    Animated.sequence([
      Animated.parallel([
        Animated.spring(likeScale, {
          toValue: 1.3,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(likeRotate, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(likeScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(likeRotate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Optimistic update
    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    setLiked(newLiked);
    setLikes(newLikes);

    try {
      await videosAPI.like(video.id.toString());
    } catch (error) {
      // Rollback en cas d'erreur
      setLiked(!newLiked);
      setLikes(liked ? likes + 1 : likes - 1);
      console.error("Error liking video:", error);
    } finally {
      setLiking(false);
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Animation du bouton subscribe
    Animated.sequence([
      Animated.spring(subscribeScale, {
        toValue: 0.9,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(subscribeScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Optimistic update
    const newSubscribed = !subscribed;
    setSubscribed(newSubscribed);

    try {
      if (newSubscribed) {
        await shopsAPI.subscribe(shop.id.toString());
      } else {
        await shopsAPI.unsubscribe(shop.id.toString());
      }
      
      // Notifier le parent du changement d'abonnement
      if (onSubscriptionChange) {
        onSubscriptionChange(Number(shop.id), newSubscribed);
      }
    } catch (error) {
      // Rollback en cas d'erreur
      setSubscribed(!newSubscribed);
      console.error("Error subscribing:", error);
    }
  };

  const handleComments = () => {
    console.log("🔵 Opening comments for video:", video.id);
    console.log("🔵 Video object:", JSON.stringify(video, null, 2));

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setShowComments(true);
  };

  const formatNumber = (num: number) => {
    if (num > 999) return `${(num / 1000).toFixed(1)}k`;
    return num?.toString() || "0";
  };

  return (
    <>
      <View style={styles.container}>
        <Pressable 
          style={styles.videoContainer} 
          onPress={handleVideoPress}
        >
          {(() => {
            // Afficher seulement le thumbnail si shouldLoad est false
            if (!shouldLoad) {
              return (
                <Image
                  source={{
                    uri: video.thumbnail || "https://via.placeholder.com/400x600",
                  }}
                  style={styles.image}
                  resizeMode="cover"
                />
              );
            }
            
            if (videoUrl) {
              return (
                <>
                  {/* Thumbnail en arrière-plan pendant le chargement */}
                  {isLoading && video.thumbnail && (
                    <Image
                      source={{ uri: video.thumbnail }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  )}
                  
                  <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    style={styles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isActive && isVideoReady}
                    isLooping
                    volume={1.0}
                    progressUpdateIntervalMillis={QUALITY_SETTINGS[videoQuality].progressUpdateInterval}
                    onError={handleVideoError}
                    onLoad={handleVideoLoad}
                    onPlaybackStatusUpdate={(status) => {
                      qualityManager.current?.onPlaybackStatusUpdate(status);
                    }}
                    onReadyForDisplay={() => {
                      console.log("📺 Video ready for display:", video.id);
                    }}
                  />
                </>
              );
            } else {
              return (
                <Image
                  source={{
                    uri: video.thumbnail || "https://via.placeholder.com/400x600",
                  }}
                  style={styles.image}
                  resizeMode="cover"
                />
              );
            }
          })()}

          {/* Animation de chargement */}
          {isLoading && shouldLoad && videoUrl && (
            <Animated.View style={[styles.loadingContainer, { opacity: spinnerOpacity }]}>
              <View style={styles.loadingBackground}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>{t('loading') || 'Chargement...'}</Text>
              </View>
            </Animated.View>
          )}

          {/* Indicateur de qualité adaptative */}
          {showQualityIndicator && isVideoReady && (
            <View style={styles.qualityIndicator}>
              <View style={[
                styles.qualityBadge,
                videoQuality === 'high' && styles.qualityHigh,
                videoQuality === 'medium' && styles.qualityMedium,
                videoQuality === 'low' && styles.qualityLow,
              ]}>
                {videoQuality === 'high' && <Wifi size={14} color="#fff" />}
                {videoQuality === 'medium' && <Wifi size={14} color="#fff" />}
                {videoQuality === 'low' && <WifiOff size={14} color="#fff" />}
                <Text style={styles.qualityText}>
                  {videoQuality === 'high' && 'HD'}
                  {videoQuality === 'medium' && 'SD'}
                  {videoQuality === 'low' && 'Éco'}
                </Text>
              </View>
            </View>
          )}

          {/* Icône pause/play au centre */}
          {showControls && isVideoReady && (
            <Animated.View style={[styles.centerControl, { opacity: fadeAnim }]}>
              <View style={styles.playPauseButton}>
                {isPlaying ? (
                  <Pause size={40} color="#fff" fill="#fff" />
                ) : (
                  <Play size={40} color="#fff" fill="#fff" />
                )}
              </View>
            </Animated.View>
          )}
        </Pressable>

        <View style={styles.gradient} />

        <View style={[styles.content, isRTL && styles.contentRTL]}>
          <View style={[styles.leftContent, isRTL && styles.leftContentRTL]}>
            <View style={styles.shopInfoRow}>
              <Link href={`/shop/${shop.id}`} asChild>
                <TouchableOpacity style={[styles.shopInfo, isRTL && styles.shopInfoRTL]}>
                  {/* Avatar - toujours en premier dans le DOM */}
                  <View style={styles.avatarWrapper}>
                    {shop.avatar ? (
                      <Image source={{ uri: shop.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: "#666" }]}>
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 18,
                            fontWeight: "bold",
                          }}
                        >
                          {shop.name?.charAt(0) || "?"}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={[styles.shopDetails, isRTL && styles.shopDetailsRTL]}>
                    <View style={[styles.shopNameRow, isRTL && styles.shopNameRowRTL]}>
                      {isRTL ? (
                        <>
                          {isAuthenticated && (
                            <Animated.View style={{ transform: [{ scale: subscribeScale }] }}>
                              <TouchableOpacity
                                style={[
                                  styles.compactSubscribeButton,
                                  subscribed && styles.compactUnsubscribeButton,
                                  styles.compactSubscribeButtonRTL
                                ]}
                                onPress={handleSubscribe}
                                activeOpacity={0.8}
                              >
                                <Text style={[
                                  styles.compactSubscribeText,
                                  subscribed && styles.compactUnsubscribeText
                                ]}>
                                  {subscribed ? t("unfollow") : t("follow")}
                                </Text>
                              </TouchableOpacity>
                            </Animated.View>
                          )}
                          
                          {shop.verified && (
                            <View style={[styles.verifiedBadge, { marginLeft: 0, marginRight: 4 }]}>
                              <Text style={styles.verifiedText}>✓</Text>
                            </View>
                          )}
                          
                          <Text style={[styles.shopName, styles.shopNameRTL]} numberOfLines={1}>
                            {shop.name}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.shopName} numberOfLines={1}>
                            {shop.name}
                          </Text>
                          
                          {shop.verified && (
                            <View style={styles.verifiedBadge}>
                              <Text style={styles.verifiedText}>✓</Text>
                            </View>
                          )}
                          
                          {isAuthenticated && (
                            <Animated.View style={{ transform: [{ scale: subscribeScale }] }}>
                              <TouchableOpacity
                                style={[
                                  styles.compactSubscribeButton,
                                  subscribed && styles.compactUnsubscribeButton
                                ]}
                                onPress={handleSubscribe}
                                activeOpacity={0.8}
                              >
                                <Text style={[
                                  styles.compactSubscribeText,
                                  subscribed && styles.compactUnsubscribeText
                                ]}>
                                  {subscribed ? t("unfollow") : t("follow")}
                                </Text>
                              </TouchableOpacity>
                            </Animated.View>
                          )}
                        </>
                      )}
                    </View>
                    {/* Afficher le nombre d'abonnés */}
                    <Text style={[styles.subscribersCount, isRTL && styles.textRTL]}>
                      {formatNumber((video as any).subscribers_count || shop.followers || 0)} {t('followers')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Link>
            </View>

            {video.title && (
              <Text style={[styles.title, isRTL && styles.textRTL]} numberOfLines={2}>
                {video.title}
              </Text>
            )}

            {(video as any).description && (
              <Text style={[styles.description, isRTL && styles.textRTL]} numberOfLines={2}>
                {(video as any).description}
              </Text>
            )}

            {/* Views count */}
            {(video as any).views > 0 && (
              <View style={[styles.viewsContainer, isRTL && styles.viewsContainerRTL]}>
                <Eye size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.viewsText}>
                  {(video as any).views >= 1000 
                    ? `${((video as any).views / 1000).toFixed(1)}K` 
                    : (video as any).views}
                </Text>
              </View>
            )}

            {products.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.productsScroll}
                contentContainerStyle={isRTL && { flexDirection: 'row-reverse' }}
              >
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    asChild
                  >
                    <TouchableOpacity style={styles.productCard}>
                      {product.image && (
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      )}
                      <Text style={[styles.productName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={[styles.productPrice, isRTL && { textAlign: 'right' }]}>
                        {product.price?.toLocaleString() || product.price} DA
                      </Text>
                    </TouchableOpacity>
                  </Link>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.rightActions}>
            <TouchableOpacity onPress={handleLike} style={styles.actionButton} activeOpacity={0.7}>
              <Animated.View style={[
                styles.actionIcon,
                {
                  transform: [
                    { scale: likeScale },
                    { 
                      rotate: likeRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '15deg']
                      })
                    }
                  ]
                }
              ]}>
                <Heart
                  size={24}
                  color={liked ? "#ef4444" : "#fff"}
                  fill={liked ? "#ef4444" : "none"}
                />
              </Animated.View>
              <Text style={styles.actionText}>{formatNumber(likes)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleComments}
              style={styles.actionButton}
            >
              <View style={styles.actionIcon}>
                <MessageCircle size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>
                {formatNumber(commentsCount)}
              </Text>
            </TouchableOpacity>

            <Link href={`/shop/${shop.id}`} asChild>
              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.actionIcon}>
                  <ShoppingBag size={24} color="#fff" />
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>

      <CommentsSheetModern
        open={showComments}
        onOpenChange={setShowComments}
        video={video}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: height,
    backgroundColor: "#000",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  loadingBackground: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  qualityIndicator: {
    position: "absolute",
    top: 60,
    right: 16,
    zIndex: 10,
  },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  qualityHigh: {
    backgroundColor: "#10b981",
  },
  qualityMedium: {
    backgroundColor: "#f59e0b",
  },
  qualityLow: {
    backgroundColor: "#ef4444",
  },
  qualityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  centerControl: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
    backgroundColor: "transparent",
  },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 70,
    flexDirection: "row",
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 0,
    gap: 12,
  },
  leftContent: {
    flex: 1,
    gap: 8,
    justifyContent: "flex-end",
  },
  shopInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  compactSubscribeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    marginLeft: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  compactUnsubscribeButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
  },
  compactSubscribeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  compactUnsubscribeText: {
    color: "rgba(255,255,255,0.95)",
  },
  shopDetails: {
    flex: 1,
    alignItems: "flex-start",
    minWidth: 0,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  shopName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  username: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subscribersCount: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 2,
  },

  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  viewsText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  productsScroll: {
    flexDirection: "row",
  },
  productCard: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 8,
    padding: 6,
    width: 75,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: 60,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  productName: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  productPrice: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rightActions: {
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // RTL Styles
  contentRTL: {
    flexDirection: "row-reverse",
    paddingLeft: 12,
    paddingRight: 12,
  },
  leftContentRTL: {
    alignItems: "flex-end",
  },
  shopInfoRTL: {
    flexDirection: "row-reverse",
  },
  avatarWrapperRTL: {
    marginLeft: 0,
    marginRight: 0,
  },
  shopDetailsRTL: {
    alignItems: "flex-end",
    marginRight: 8,
    marginLeft: 0,
  },
  shopNameRowRTL: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
  },
  shopNameRTL: {
    textAlign: "right",
  },
  compactSubscribeButtonRTL: {
    marginLeft: 0,
    marginRight: 8,
  },
  viewsContainerRTL: {
    flexDirection: "row-reverse",
    alignSelf: "flex-end",
  },
  textRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
