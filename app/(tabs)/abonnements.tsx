import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Heart, MessageCircle, Share2, ShoppingBag } from "lucide-react-native";
import { videosAPI } from "@/lib/api";
import { useRouter } from "expo-router";

const { height, width } = Dimensions.get("window");

export default function AbonnementsPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num?.toString() || "0";
  };

  useEffect(() => {
    loadSubscriptionVideos();
  }, []);

  const loadSubscriptionVideos = async () => {
    try {
      // Charger les vidéos des abonnements uniquement
      const data = await videosAPI.getAll(undefined, true);
      setVideos(data);
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Heart size={64} color="#fff" />
        <Text style={styles.emptyTitle}>Aucun abonnement</Text>
        <Text style={styles.emptyText}>
          Abonne-toi à des boutiques pour voir leurs vidéos ici
        </Text>
      </View>
    );
  }

  const renderVideo = ({ item, index }: any) => {
    const isActive = index === currentIndex;

    return (
      <View style={styles.videoContainer}>
        <Video
          source={{ uri: item.video_url }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />

        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />

        {/* Right Actions */}
        <View style={styles.rightActions}>
          {/* Shop Avatar */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => router.push(`/shop/${item.shop_id}`)}
          >
            <View style={styles.avatar}>
              <ShoppingBag size={24} color="#fff" />
            </View>
            <View style={styles.followBadge}>
              <Text style={styles.followBadgeText}>✓</Text>
            </View>
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity style={styles.actionButton}>
            <Heart size={32} color="#fff" fill={item.liked ? "#ef4444" : "none"} />
            <Text style={styles.actionText}>{item.likes || 0}</Text>
          </TouchableOpacity>

          {/* Comments */}
          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle size={32} color="#fff" />
            <Text style={styles.actionText}>{item.comments_count || 0}</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={32} color="#fff" />
            <Text style={styles.actionText}>Partager</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <TouchableOpacity onPress={() => router.push(`/shop/${item.shop_id}`)}>
            <Text style={styles.shopName}>@{item.shop_name}</Text>
          </TouchableOpacity>
          {/* Afficher le nombre d'abonnés */}
          <Text style={styles.subscribersCount}>
            {formatNumber(item.subscribers_count || 0)} Abonnés
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
          {item.product_id && (
            <TouchableOpacity
              style={styles.productButton}
              onPress={() => router.push(`/product/${item.product_id}`)}
            >
              <ShoppingBag size={16} color="#fff" />
              <Text style={styles.productButtonText}>Voir le produit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews
        maxToRenderPerBatch={2}
        windowSize={3}
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
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 24,
  },
  videoContainer: {
    width,
    height,
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  // Right Actions
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 100,
    gap: 24,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  followBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  followBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#fff",
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Bottom Info
  bottomInfo: {
    position: "absolute",
    bottom: 100,
    left: 12,
    right: 80,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subscribersCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  productButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  productButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
});
