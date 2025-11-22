import { View, Text, ScrollView, TouchableOpacity, Image, Alert, RefreshControl, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { videosAPI } from "@/lib/api"
import { Video, ResizeMode } from "expo-av"
import { ArrowLeft, Trash2, Eye, Heart, MessageCircle, Plus, Film, Edit3 } from "lucide-react-native"
import { useLanguage } from "@/lib/i18n/language-context"

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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-black">{t('myVideos')}</Text>
              <Text className="text-sm text-gray-500 mt-0.5">{videos.length} {videos.length > 1 ? t('videos') : t('video')}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/gestion/add-video")}
            className="bg-black rounded-full w-12 h-12 items-center justify-center"
          >
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres */}
      {videos.length > 0 && (
        <View className="bg-white px-5 py-3 border-b border-gray-100">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setSortBy('recent')}
              className={`px-4 py-2 rounded-full ${sortBy === 'recent' ? 'bg-black' : 'bg-gray-100'}`}
            >
              <Text className={`text-sm font-bold ${sortBy === 'recent' ? 'text-white' : 'text-gray-600'}`}>
                {t('mostRecent')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-full ${sortBy === 'popular' ? 'bg-black' : 'bg-gray-100'}`}
            >
              <Text className={`text-sm font-bold ${sortBy === 'popular' ? 'text-white' : 'text-gray-600'}`}>
                {t('mostPopular')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy('oldest')}
              className={`px-4 py-2 rounded-full ${sortBy === 'oldest' ? 'bg-black' : 'bg-gray-100'}`}
            >
              <Text className={`text-sm font-bold ${sortBy === 'oldest' ? 'text-white' : 'text-gray-600'}`}>
                {t('oldest')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {videos.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Film size={40} color="#9ca3af" strokeWidth={1.5} />
            </View>
            <Text className="text-gray-900 text-lg font-bold mb-2">{t('noVideo')}</Text>
            <Text className="text-gray-500 text-center mb-6">{t('startSharingVideos')}</Text>
            <TouchableOpacity
              onPress={() => router.push("/gestion/add-video")}
              className="bg-black rounded-full px-6 py-3"
            >
              <Text className="text-white font-bold">{t('addVideoButton')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {sortedVideos.map((video) => (
              <View key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ position: 'relative' }}>
                <View className="flex-row">
                  {/* Thumbnail avec overlay play */}
                  <View style={{ position: 'relative' }}>
                    <View className="w-32 h-32 bg-gray-900">
                      {video.thumbnail_url ? (
                        <Image
                          source={{ uri: video.thumbnail_url }}
                          className="w-full h-full"
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
                        <View className="w-full h-full bg-gray-200 items-center justify-center">
                          <Film size={32} color="#9ca3af" />
                        </View>
                      )}
                    </View>
                    {/* Play icon overlay */}
                    <View className="absolute inset-0 items-center justify-center">
                      <View className="w-10 h-10 bg-black/40 rounded-full items-center justify-center">
                        <Film size={20} color="#fff" />
                      </View>
                    </View>
                  </View>

                  {/* Content */}
                  <View className="flex-1 p-4 justify-between">
                    <View>
                      <Text className="text-base font-bold text-gray-900 mb-1.5" numberOfLines={2}>
                        {video.title}
                      </Text>
                      {video.description && (
                        <Text className="text-xs text-gray-500 mb-2" numberOfLines={1}>
                          {video.description}
                        </Text>
                      )}
                      <Text className="text-xs text-gray-400">
                        {new Date(video.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    
                    {/* Stats */}
                    <View className="flex-row items-center gap-4 mt-2">
                      <View className="flex-row items-center">
                        <View className="w-6 h-6 bg-blue-50 rounded-full items-center justify-center mr-1">
                          <Eye size={12} color="#3b82f6" />
                        </View>
                        <Text className="text-gray-700 text-xs font-bold">
                          {video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-6 h-6 bg-red-50 rounded-full items-center justify-center mr-1">
                          <Heart size={12} color="#ef4444" />
                        </View>
                        <Text className="text-gray-700 text-xs font-bold">
                          {video.likes_count >= 1000 ? `${(video.likes_count / 1000).toFixed(1)}K` : video.likes_count}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-6 h-6 bg-purple-50 rounded-full items-center justify-center mr-1">
                          <MessageCircle size={12} color="#a855f7" />
                        </View>
                        <Text className="text-gray-700 text-xs font-bold">
                          {video.comments_count >= 1000 ? `${(video.comments_count / 1000).toFixed(1)}K` : video.comments_count}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, flexDirection: 'row', gap: 8 }}>
                  {/* Edit button */}
                  <TouchableOpacity
                    onPress={() => router.push(`/gestion/edit-video/${video.id}`)}
                    activeOpacity={0.8}
                    style={{ 
                      width: 36, 
                      height: 36, 
                      backgroundColor: '#fff',
                      borderRadius: 18,
                      alignItems: 'center', 
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3
                    }}
                  >
                    <Edit3 size={16} color="#3b82f6" strokeWidth={2} />
                  </TouchableOpacity>
                  
                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={() => handleDelete(video.id, video.title)}
                    activeOpacity={0.8}
                    style={{ 
                      width: 36, 
                      height: 36, 
                      backgroundColor: '#fff',
                      borderRadius: 18,
                      alignItems: 'center', 
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3
                    }}
                  >
                    <Trash2 size={18} color="#ef4444" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
