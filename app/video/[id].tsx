import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
  Pressable,
  StatusBar,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { ArrowLeft, Heart, MessageCircle, ShoppingBag, Pause, Play, Share2 } from "lucide-react-native";
import { videosAPI, shopsAPI, getMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { CommentsSheetModern } from "@/components/comments-sheet-modern";
import { ShareButton } from "@/components/share-button";

const { height, width } = Dimensions.get("window");

export default function SingleVideoPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const videoRef = useRef<Video>(null);
  const [video, setVideo] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [liking, setLiking] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const subscribeScale = useRef(new Animated.Value(1)).current;
  
  const handleBack = () => {
    router.back();
  };

  // Charger les données vidéo
  useEffect(() => {
    if (id) {
      loadVideoData();
    }
  }, [id]);

  // Animation des contrôles
  useEffect(() => {
    if (showControls) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

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

  const loadVideoData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger la vidéo
      const videoData = await videosAPI.getById(id as string);
      
      if (!videoData) {
        setError("Vidéo non trouvée");
        return;
      }
      
      setVideo(videoData);
      setLiked(videoData.liked || false);
      setLikes(videoData.likes_count || videoData.likes || 0);
      setSubscribed(videoData.subscribed || false);
      
      // Charger les infos de la boutique
      const shopId = videoData.shop_id || videoData.shopId;
      if (shopId) {
        try {
          const shopData = await shopsAPI.getById(shopId.toString());
          setShop(shopData);
        } catch (e) {
          // Créer un shop minimal avec les données de la vidéo
          setShop({
            id: shopId,
            name: videoData.shop_name || "Boutique",
            avatar: videoData.shop_logo,
            verified: videoData.verified || false,
          });
        }
      }
      
      // Incrémenter les vues
      videosAPI.view(id as string).catch(console.error);
      
    } catch (err) {
      console.error("Error loading video:", err);
      setError("Impossible de charger la vidéo");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoLoad = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsVideoReady(true);
    }
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

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (liking) return;
    setLiking(true);

    Animated.sequence([
      Animated.spring(likeScale, {
        toValue: 1.3,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    setLiked(newLiked);
    setLikes(newLikes);

    try {
      await videosAPI.like(video.id.toString());
    } catch (error) {
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

    const newSubscribed = !subscribed;
    setSubscribed(newSubscribed);

    try {
      if (newSubscribed) {
        await shopsAPI.subscribe(shop.id.toString());
      } else {
        await shopsAPI.unsubscribe(shop.id.toString());
      }
    } catch (error) {
      setSubscribed(!newSubscribed);
      console.error("Error subscribing:", error);
    }
  };

  const handleComments = () => {
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

  const navigateToShop = () => {
    try {
      if (shop?.id) {
        router.push(`/shop/${shop.id}`);
      }
    } catch (error) {
      console.error("Navigation to shop failed:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>{t("loading") || "Chargement..."}</Text>
      </View>
    );
  }

  if (error || !video) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || "Vidéo non trouvée"}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const videoUrl = getMediaUrl(video.video_url || video.videoUrl);
  const commentsCount = video.comments_count || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header avec bouton retour */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleBack}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Vidéo */}
      <Pressable style={styles.videoContainer} onPress={togglePlayPause}>
        {videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={true}
            isLooping
            volume={1.0}
            onLoad={handleVideoLoad}
            onError={(error) => console.error("Video error:", error)}
          />
        ) : (
          <Image
            source={{ uri: getMediaUrl(video.thumbnail) || "https://via.placeholder.com/400x600" }}
            style={styles.video}
            resizeMode="cover"
          />
        )}

        {/* Contrôles play/pause */}
        {showControls && isVideoReady && (
          <Animated.View style={[styles.centerControl, { opacity: fadeAnim }]}>
            <View style={styles.playPauseButton}>
              {isPlaying ? (
                <Pause size={50} color="#fff" fill="#fff" />
              ) : (
                <Play size={50} color="#fff" fill="#fff" />
              )}
            </View>
          </Animated.View>
        )}
      </Pressable>

      {/* Gradient overlay */}
      <View style={styles.gradient} />

      {/* Contenu en bas */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.leftContent}>
          {/* Info boutique */}
          <TouchableOpacity style={styles.shopInfo} onPress={navigateToShop}>
            <View style={styles.avatarWrapper}>
              {shop?.avatar ? (
                <Image source={{ uri: getMediaUrl(shop.avatar) }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: "#666" }]}>
                  <Text style={styles.avatarText}>
                    {shop?.name?.charAt(0) || "?"}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.shopDetails}>
              <View style={styles.shopNameRow}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop?.name || "Boutique"}
                </Text>
                {!!shop?.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
                {isAuthenticated && (
                  <Animated.View style={{ transform: [{ scale: subscribeScale }] }}>
                    <TouchableOpacity
                      style={[
                        styles.subscribeButton,
                        subscribed && styles.unsubscribeButton
                      ]}
                      onPress={handleSubscribe}
                    >
                      <Text style={[
                        styles.subscribeText,
                        subscribed && styles.unsubscribeText
                      ]}>
                        {subscribed ? t("unfollow") : t("follow")}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Titre */}
          {video.title && (
            <Text style={styles.title} numberOfLines={2}>
              {video.title}
            </Text>
          )}

          {/* Description */}
          {video.description && (
            <Text style={styles.description} numberOfLines={2}>
              {video.description}
            </Text>
          )}
        </View>

        {/* Actions à droite */}
        <View style={styles.rightActions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Animated.View style={[styles.actionIcon, { transform: [{ scale: likeScale }] }]}>
              <Heart
                size={28}
                color={liked ? "#ef4444" : "#fff"}
                fill={liked ? "#ef4444" : "none"}
              />
            </Animated.View>
            <Text style={styles.actionText}>{formatNumber(likes)}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleComments} style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <MessageCircle size={28} color="#fff" />
            </View>
            <Text style={styles.actionText}>{formatNumber(commentsCount)}</Text>
          </TouchableOpacity>

          <ShareButton
            type="video"
            data={{
              videoId: Number(video.id),
              title: video.title,
              shopName: shop?.name,
            }}
            size={28}
            color="#fff"
          />

          <TouchableOpacity style={styles.actionButton} onPress={navigateToShop}>
            <View style={styles.actionIcon}>
              <ShoppingBag size={28} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments sheet */}
      <CommentsSheetModern
        open={showComments}
        onOpenChange={setShowComments}
        video={video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#333",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: width,
    height: height,
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
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  leftContent: {
    flex: 1,
    marginRight: 60,
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarWrapper: {
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  shopDetails: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  shopName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedBadge: {
    backgroundColor: "#3b82f6",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  subscribeButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unsubscribeButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "#fff",
  },
  subscribeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  unsubscribeText: {
    color: "#fff",
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 20,
    alignItems: "center",
    gap: 20,
  },
  actionButton: {
    alignItems: "center",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
