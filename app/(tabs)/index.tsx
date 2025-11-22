import React, { useEffect, useState, useRef } from "react"
import { View, FlatList, ActivityIndicator, Text, StyleSheet, Dimensions, ViewToken, TouchableOpacity, Animated } from "react-native"
import { videosAPI } from "@/lib/api"
import { VideoCard } from "@/components/video-card"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"

const { height } = Dimensions.get("window")

type TabType = "all" | "subscriptions"

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const [allVideos, setAllVideos] = useState<any[]>([]) // Stocker toutes les vidéos
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const VIDEOS_PER_PAGE = 5 // Charger 5 vidéos à la fois
  
  const pulseAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [loading])
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80
  })

  useEffect(() => {
    loadVideos(true)
  }, [activeTab])

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
      const subscriptionsOnly = activeTab === "subscriptions"
      const data = await videosAPI.getAll(undefined, subscriptionsOnly)
      
      if (reset) {
        // Première fois : stocker toutes les vidéos et afficher les premières
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
    } catch (error) {
      console.error("Error loading videos:", error)
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
        <Animated.Image
          source={require('@/assets/Logo.png')}
          style={[styles.loadingLogo, { opacity: pulseAnim }]}
        />
      </View>
    )
  }

  const renderEmptyState = () => {
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
        {/* Tabs TikTok Style */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              Pour toi
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
              Abonnements
            </Text>
            {activeTab === "subscriptions" && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>
        {renderEmptyState()}
      </>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Tabs TikTok Style */}
      <View style={styles.tabsContainer}>
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
            isActive={index === activeVideoIndex}
            shouldLoad={shouldLoad}
            onSubscriptionChange={handleSubscriptionChange}
          />
        )
      }}
      keyExtractor={(item, index) => `video-${item.id}-${index}`}
      pagingEnabled
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
          <View style={styles.footerLoader}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.footerText}>{t('loading')}</Text>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum={true}
      getItemLayout={(data, index) => ({
        length: height,
        offset: height * index,
        index,
      })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig.current}
      style={styles.list}
    />
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8e8e8e",
    textAlign: "center",
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
    gap: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
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
    height: height,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    color: "#8e8e8e",
  },
})
