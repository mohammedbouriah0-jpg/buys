import React, { useEffect, useState, useRef, useCallback } from "react"
import { View, FlatList, ActivityIndicator, Text, StyleSheet, ViewToken, TouchableOpacity, Animated, Alert, Dimensions } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { videosAPI } from "@/lib/api"
import { VideoCard } from "@/components/video-card"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { Search } from "lucide-react-native"

type TabType = "all" | "subscriptions"

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const params = useLocalSearchParams()
  const router = useRouter()
  
  // Hauteur mesurée du conteneur de vidéos (sera mis à jour par onLayout)
  const [videoHeight, setVideoHeight] = useState(0)
  
  // Callback pour mesurer la hauteur réelle du conteneur
  const onVideoContainerLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout
    if (height > 0 && height !== videoHeight) {
      setVideoHeight(height)
    }
  }, [videoHeight])
  
  const [loading, setLoading] = useState(true)
  const [sharedVideoId, setSharedVideoId] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const [allVideos, setAllVideos] = useState<any[]>([])
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isPageFocused, setIsPageFocused] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const VIDEOS_PER_PAGE = 5

  // Gérer le focus/blur de la page pour arrêter les vidéos
  useFocusEffect(
    React.useCallback(() => {
      setIsPageFocused(true)
      return () => {
        setIsPageFocused(false)
      }
    }, [])
  )
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80
  })

  useEffect(() => {
    loadVideos(true)
  }, [activeTab])

  // Gérer l'erreur de vidéo non trouvée
  useEffect(() => {
    if (params.error === 'video_not_found') {
      Alert.alert(
        t('error') || 'Erreur',
        t('video_not_found') || 'Cette vidéo n\'existe pas ou a été supprimée.',
        [{ text: 'OK' }]
      )
    }
  }, [params.error])

  // Gérer le deep link vidéo - charger cette vidéo en premier
  useEffect(() => {
    if (params.videoId) {
      console.log('📺 Deep link vidéo détecté:', params.videoId);
      setSharedVideoId(params.videoId as string);
      loadSharedVideo(params.videoId as string);
      // Nettoyer l'URL
      router.setParams({ videoId: undefined });
    }
  }, [params.videoId])

  const loadSharedVideo = async (videoId: string) => {
    try {
      setLoading(true);
      // Charger la vidéo partagée
      const sharedVideo = await videosAPI.getById(videoId);
      
      if (!sharedVideo) {
        Alert.alert(
          t('error') || 'Erreur',
          t('video_not_found') || 'Cette vidéo n\'existe pas ou a été supprimée.',
          [{ text: 'OK' }]
        );
        loadVideos(true);
        return;
      }

      // Charger les autres vidéos
      const allData = await videosAPI.getAll();
      
      // Filtrer pour éviter les doublons et mettre la vidéo partagée en premier
      const otherVideos = allData.filter((v: any) => v.id !== sharedVideo.id);
      const combinedVideos = [sharedVideo, ...otherVideos];
      
      setAllVideos(combinedVideos);
      setVideos(combinedVideos.slice(0, VIDEOS_PER_PAGE));
      setHasMore(combinedVideos.length > VIDEOS_PER_PAGE);
      setActiveVideoIndex(0); // Commencer par la vidéo partagée
      
    } catch (error) {
      console.error('Erreur chargement vidéo partagée:', error);
      Alert.alert(
        t('error') || 'Erreur',
        t('video_not_found') || 'Cette vidéo n\'existe pas ou a été supprimée.',
        [{ text: 'OK' }]
      );
      loadVideos(true);
    } finally {
      setLoading(false);
      setSharedVideoId(null);
    }
  }

  const loadVideos = async (reset = false) => {
    if (reset) {
      setLoading(true)
      setPage(1)
      setHasMore(true)
    } else {
      if (loadingMore) return
      setLoadingMore(true)
    }

    try {
      setError(null)
      const subscriptionsOnly = activeTab === "subscriptions"
      const data = await videosAPI.getAll(undefined, subscriptionsOnly)
      
      if (reset) {
        setAllVideos(data)
        const paginatedData = data.slice(0, VIDEOS_PER_PAGE)
        setVideos(paginatedData)
        setHasMore(data.length > VIDEOS_PER_PAGE)
      } else {
        // Charger plus de vidéos
        const currentPage = page
        const startIndex = currentPage * VIDEOS_PER_PAGE
        const endIndex = startIndex + VIDEOS_PER_PAGE
        
        if (startIndex < allVideos.length) {
          // Il reste des vidéos à charger
          const paginatedData = allVideos.slice(startIndex, endIndex)
          setVideos(prev => [...prev, ...paginatedData])
          setHasMore(endIndex < allVideos.length)
          setPage(prev => prev + 1)
        } else {
          // On a atteint la fin, recommencer avec les premières vidéos
          console.log('🔄 Fin atteinte, ajout des anciennes vidéos...')
          const paginatedData = allVideos.slice(0, VIDEOS_PER_PAGE)
          setVideos(prev => [...prev, ...paginatedData])
          setPage(1) // Recommencer le compteur
          setHasMore(true)
        }
      }
    } catch (err: any) {
      console.error("Error loading videos:", err)
      setError(err?.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleSubscriptionChange = (shopId: number, subscribed: boolean) => {
    // Mettre à jour toutes les vidéos de cette boutique
    setVideos(prevVideos => 
      prevVideos.map(video => 
        (video.shop_id === shopId || video.shopId === shopId)
          ? { ...video, subscribed }
          : video
      )
    )
  }

  const handleLoadMore = () => {
    if (!loadingMore) {
      loadVideos(false)
    }
  }

  const handleTabChange = (tab: TabType) => {
    if (tab === "subscriptions" && !isAuthenticated) {
      return // Ne rien faire si pas connecté
    }
    setActiveTab(tab)
    setActiveVideoIndex(0)
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index || 0)
    }
  }).current

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  const renderEmptyState = () => {
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('connectionError') || 'Erreur de connexion'}</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => loadVideos(true)}
          >
            <Text style={styles.retryButtonText}>{t('retry') || 'Réessayer'}</Text>
          </TouchableOpacity>
        </View>
      )
    }
    if (activeTab === "subscriptions") {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('noSubscriptions')}</Text>
          <Text style={styles.emptySubtext}>{t('noSubscriptionsSubtitle')}</Text>
        </View>
      )
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('noVideos')}</Text>
        <Text style={styles.emptySubtext}>{t('noVideosSubtitle')}</Text>
      </View>
    )
  }

  if (videos.length === 0 && !loading) {
    return (
      <>
        {/* Tabs TikTok Style avec bouton recherche */}
        <View style={styles.tabsContainer}>
          <View style={{ width: 44 }} />
          <View style={styles.tabsCenter}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange("all")}
            >
              <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
                {t('forYou')}
              </Text>
              {activeTab === "all" && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange("subscriptions")}
              disabled={!isAuthenticated}
            >
              <Text style={[
                styles.tabText,
                activeTab === "subscriptions" && styles.tabTextActive,
                !isAuthenticated && styles.tabTextDisabled
              ]}>
                {t('subscriptions')}
              </Text>
              {activeTab === "subscriptions" && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => router.push('/search')}
          >
            <Search size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {renderEmptyState()}
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Tabs TikTok Style avec bouton recherche */}
      <View style={styles.tabsContainer}>
        {/* Espace gauche pour équilibrer */}
        <View style={{ width: 44 }} />
        
        {/* Tabs centrés */}
        <View style={styles.tabsCenter}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              {t('forYou')}
            </Text>
            {activeTab === "all" && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange("subscriptions")}
            disabled={!isAuthenticated}
          >
            <Text style={[
              styles.tabText,
              activeTab === "subscriptions" && styles.tabTextActive,
              !isAuthenticated && styles.tabTextDisabled
            ]}>
              {t('subscriptions')}
            </Text>
            {activeTab === "subscriptions" && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>
        
        {/* Bouton recherche */}
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/search')}
        >
          <Search size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Conteneur pour mesurer la hauteur disponible */}
      <View style={{ flex: 1 }} onLayout={onVideoContainerLayout}>
      {videoHeight > 0 && (
      <FlatList
      data={videos}
      renderItem={({ item, index }) => {
        const shop = {
          id: item.shop_id || item.shopId,
          name: item.shop_name || 'Boutique',
          verified: item.verified || false,
          avatar: item.shop_logo || 'https://via.placeholder.com/40',
          username: `@${item.shop_name?.toLowerCase().replace(/\s+/g, '') || 'boutique'}`,
          description: '',
          followers: 0
        }
        const products = item.product ? [item.product] : []

        // Adapter le format vidéo pour VideoCard
        const videoData = {
          ...item,
          thumbnail: item.thumbnail_url || item.video_url || 'https://via.placeholder.com/400x600',
          likes: item.likes_count || 0,
          liked: item.liked || false,
          comments: []
        }

        // Optimisation: ne charger que les vidéos proches de la vue
        const shouldLoad = Math.abs(index - activeVideoIndex) <= 1

        return (
          <VideoCard 
            video={videoData} 
            shop={shop} 
            products={products}
            isActive={index === activeVideoIndex && isPageFocused}
            shouldLoad={shouldLoad}
            videoHeight={videoHeight}
            onSubscriptionChange={handleSubscriptionChange}
          />
        )
      }}
      keyExtractor={(item, index) => `video-${item.id}-${index}`}
      pagingEnabled
      snapToInterval={videoHeight}
      snapToAlignment="start"
      decelerationRate="fast"
      // Optimisations de performance
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={3}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      // Pagination
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <View style={[styles.footerLoader, { height: videoHeight }]}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.footerText}>{t('loading')}</Text>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      disableIntervalMomentum={true}
      getItemLayout={(data, index) => ({
        length: videoHeight,
        offset: videoHeight * index,
        index,
      })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig.current}
      style={styles.list}
    />
      )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  tabsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  tabsCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {
    // Pas de background, juste le texte et l'underline
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 0.1,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  tabTextDisabled: {
    opacity: 0.3,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  footerLoader: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    color: "#fff",
  },
})
