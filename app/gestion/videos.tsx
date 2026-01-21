import { View, Text, ScrollView, TouchableOpacity, Image, Alert, RefreshControl, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { videosAPI } from "@/lib/api"
import { Video, ResizeMode } from "expo-av"
import { ArrowLeft, Trash2, Eye, Heart, MessageCircle, Plus, Film, Edit3 } from "lucide-react-native"
import { useLanguage } from "@/lib/i18n/language-context"
import { VerificationGuard } from "@/components/verification-guard"

interface VideoItem {
  id: number
  title: string
  description: string
  video_url: string
  thumbnail_url: string
  views: number
  likes_count: number
  comments_count: number
  created_at: string
}

type SortType = 'recent' | 'popular' | 'oldest'

export default function VideosManagementPage() {
  const { t } = useLanguage()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState<SortType>('recent')

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      setLoading(true)
      const data = await videosAPI.getMyVideos()
      setVideos(data)
    } catch (error) {
      console.error("Error loading videos:", error)
      Alert.alert("Erreur", "Impossible de charger les vidéos")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getSortedVideos = () => {
    const sorted = [...videos]
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'popular':
        return sorted.sort((a, b) => b.views - a.views)
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default:
        return sorted
    }
  }

  const sortedVideos = getSortedVideos()

  const onRefresh = () => {
    setRefreshing(true)
    loadVideos()
  }

  const handleDelete = (videoId: number, title: string) => {
    Alert.alert(
      t('deleteVideo'),
      `${t('deleteConfirm')} "${title}" ?`,
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('delete'),
          style: "destructive",
          onPress: async () => {
            try {
              await videosAPI.delete(videoId.toString())
              setVideos(videos.filter(v => v.id !== videoId))
              Alert.alert(t('success'), t('videoPublishedSuccess'))
            } catch (error) {
              Alert.alert(t('error'), t('unableToPublishVideo'))
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-2xl font-black">{t('myVideos')}</Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </View>
    )
  }

  return (
    <VerificationGuard>
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header moderne */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{
                width: 36,
                height: 36,
                backgroundColor: '#f3f4f6',
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}
            >
              <ArrowLeft size={20} color="#111827" strokeWidth={2.5} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>
                {t('myVideos')}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500', marginTop: 2 }}>
                {videos.length} {videos.length > 1 ? t('videos') : t('video')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/gestion/add-video")}
            style={{
              backgroundColor: '#000000',
              borderRadius: 20,
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Plus size={22} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres modernes */}
      {videos.length > 0 && (
        <View style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6'
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => setSortBy('recent')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: sortBy === 'recent' ? '#000000' : '#f3f4f6',
                marginRight: 8
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: sortBy === 'recent' ? '#ffffff' : '#6b7280'
              }}>
                {t('mostRecent')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy('popular')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: sortBy === 'popular' ? '#000000' : '#f3f4f6',
                marginRight: 8
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: sortBy === 'popular' ? '#ffffff' : '#6b7280'
              }}>
                {t('mostPopular')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy('oldest')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: sortBy === 'oldest' ? '#000000' : '#f3f4f6'
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: sortBy === 'oldest' ? '#ffffff' : '#6b7280'
              }}>
                {t('oldest')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={{ flex: 1, backgroundColor: '#f9fafb' }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {videos.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <View style={{
              width: 96,
              height: 96,
              backgroundColor: '#f3f4f6',
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <Film size={48} color="#9ca3af" strokeWidth={2} />
            </View>
            <Text style={{ color: '#111827', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>
              {t('noVideo')}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 15, textAlign: 'center', marginBottom: 24, paddingHorizontal: 40 }}>
              {t('startSharingVideos')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/gestion/add-video")}
              style={{
                backgroundColor: '#000000',
                borderRadius: 24,
                paddingHorizontal: 24,
                paddingVertical: 14,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>
                {t('addVideoButton')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {sortedVideos.map((video) => (
              <View key={video.id} style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <View style={{ flexDirection: 'row' }}>
                  {/* Thumbnail compact */}
                  <View style={{ position: 'relative', width: 110, height: 110 }}>
                    <View style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}>
                      {video.thumbnail_url ? (
                        <Image
                          source={{ uri: video.thumbnail_url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : video.video_url ? (
                        <Video
                          source={{ uri: video.video_url }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isMuted={true}
                          positionMillis={0}
                        />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' }}>
                          <Film size={32} color="#6b7280" strokeWidth={2} />
                        </View>
                      )}
                    </View>
                    {/* Play overlay compact */}
                    <View style={{
                      position: 'absolute',
                      inset: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.15)'
                    }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Film size={18} color="#000000" strokeWidth={2.5} />
                      </View>
                    </View>
                  </View>

                  {/* Content compact */}
                  <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: 4,
                        lineHeight: 18
                      }} numberOfLines={2}>
                        {video.title}
                      </Text>
                      {video.description && (
                        <Text style={{
                          fontSize: 12,
                          color: '#6b7280',
                          marginBottom: 6,
                          lineHeight: 16
                        }} numberOfLines={1}>
                          {video.description}
                        </Text>
                      )}
                      <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>
                        {new Date(video.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    
                    {/* Stats compacts */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 20,
                          height: 20,
                          backgroundColor: '#eff6ff',
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 3
                        }}>
                          <Eye size={10} color="#3b82f6" strokeWidth={2.5} />
                        </View>
                        <Text style={{ color: '#111827', fontSize: 11, fontWeight: '700' }}>
                          {video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 20,
                          height: 20,
                          backgroundColor: '#fee2e2',
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 3
                        }}>
                          <Heart size={10} color="#ef4444" strokeWidth={2.5} />
                        </View>
                        <Text style={{ color: '#111827', fontSize: 11, fontWeight: '700' }}>
                          {video.likes_count >= 1000 ? `${(video.likes_count / 1000).toFixed(1)}K` : video.likes_count}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 20,
                          height: 20,
                          backgroundColor: '#faf5ff',
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 3
                        }}>
                          <MessageCircle size={10} color="#a855f7" strokeWidth={2.5} />
                        </View>
                        <Text style={{ color: '#111827', fontSize: 11, fontWeight: '700' }}>
                          {video.comments_count >= 1000 ? `${(video.comments_count / 1000).toFixed(1)}K` : video.comments_count}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action buttons compacts */}
                <View style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 10,
                  flexDirection: 'row',
                  gap: 5
                }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/gestion/edit-video/${video.id}`)}
                    activeOpacity={0.8}
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                      elevation: 3
                    }}
                  >
                    <Edit3 size={13} color="#3b82f6" strokeWidth={2.5} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleDelete(video.id, video.title)}
                    activeOpacity={0.8}
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                      elevation: 3
                    }}
                  >
                    <Trash2 size={14} color="#ef4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
    </VerificationGuard>
  )
}
