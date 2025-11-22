import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';
import { useLanguage } from '@/lib/i18n/language-context';

export default function AdminVideos() {
  const { t, isRTL } = useLanguage();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const fetchVideos = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data);
      }
    } catch (error) {
      console.error('Erreur chargement vidéos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  const handleDelete = async (videoId: number, shopName: string) => {
    Alert.alert(
      t('deleteVideo'),
      t('deleteVideoConfirm').replace('{shopName}', shopName),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                Alert.alert(t('success'), t('videoDeleted'));
                fetchVideos();
              } else {
                Alert.alert(t('error'), t('cannotDeleteVideo'));
              }
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert(t('error'), t('errorOccurred'));
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 border-b border-gray-200">
        <View className={`flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-gray-100 p-2 rounded-full"
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#000" />
          </TouchableOpacity>
          <View className={`flex-1 ${isRTL ? 'mr-4' : 'ml-4'}`}>
            <Text className="text-black text-xl font-bold">{t('videoModeration')}</Text>
            <Text className="text-gray-600 text-sm">{videos.length} {t('videosCount')}{videos.length > 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {videos.map((video) => (
          <View key={video.id} className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm">
            {/* Vidéo */}
            <View className="relative bg-black" style={{ height: 300 }}>
              {playingVideo === video.id ? (
                <Video
                  source={{ uri: `${API_URL.replace('/api', '')}${video.video_url}` }}
                  style={{ width: '100%', height: '100%' }}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay
                  onPlaybackStatusUpdate={(status: any) => {
                    if (status.didJustFinish) {
                      setPlayingVideo(null);
                    }
                  }}
                />
              ) : (
                <>
                  <Image
                    source={{ uri: `${API_URL.replace('/api', '')}${video.thumbnail_url || video.video_url}` }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                  <TouchableOpacity
                    onPress={() => setPlayingVideo(video.id)}
                    className="absolute inset-0 items-center justify-center bg-black/30"
                  >
                    <View className="bg-white/90 p-4 rounded-full">
                      <Ionicons name="play" size={32} color="#000" />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Info */}
            <View className="p-4">
              {/* Titre et description */}
              <Text className="text-lg font-bold text-gray-800 mb-2">{video.title}</Text>
              {video.description && (
                <Text className="text-gray-600 mb-3">{video.description}</Text>
              )}

              {/* Boutique */}
              <View className="flex-row items-center mb-3 pb-3 border-b border-gray-100">
                <View className="bg-purple-100 p-2 rounded-full mr-3">
                  <Ionicons name="storefront" size={20} color="#9333ea" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-semibold">{video.shop_name}</Text>
                  <Text className="text-gray-500 text-sm">{video.shop_owner_email}</Text>
                </View>
              </View>

              {/* Produit lié */}
              {video.product_name && (
                <View className="flex-row items-center mb-3 pb-3 border-b border-gray-100">
                  <View className="bg-blue-100 p-2 rounded-full mr-3">
                    <Ionicons name="pricetag" size={20} color="#3b82f6" />
                  </View>
                  <Text className="text-gray-700 flex-1">{video.product_name}</Text>
                </View>
              )}

              {/* Statistiques */}
              <View className={`flex-row mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <View className={`flex-1 bg-red-50 rounded-lg p-3 ${isRTL ? 'ml-2' : 'mr-2'}`}>
                  <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Ionicons name="heart" size={16} color="#ef4444" />
                    <Text className={`text-red-700 font-bold ${isRTL ? 'mr-2' : 'ml-2'}`}>{video.likes_count || 0}</Text>
                  </View>
                  <Text className="text-red-600 text-xs mt-1">{t('likes')}</Text>
                </View>

                <View className="flex-1 bg-blue-50 rounded-lg p-3 mx-1">
                  <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Ionicons name="chatbubble" size={16} color="#3b82f6" />
                    <Text className={`text-blue-700 font-bold ${isRTL ? 'mr-2' : 'ml-2'}`}>{video.comments_count || 0}</Text>
                  </View>
                  <Text className="text-blue-600 text-xs mt-1">{t('comments')}</Text>
                </View>

                {video.reports_count > 0 && (
                  <View className={`flex-1 bg-orange-50 rounded-lg p-3 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                    <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Ionicons name="warning" size={16} color="#f97316" />
                      <Text className={`text-orange-700 font-bold ${isRTL ? 'mr-2' : 'ml-2'}`}>{video.reports_count}</Text>
                    </View>
                    <Text className="text-orange-600 text-xs mt-1">{t('reports')}</Text>
                  </View>
                )}
              </View>

              {/* Date */}
              <View className={`flex-row items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text className={`text-gray-500 text-sm ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  {t('publishedOn')} {formatDate(video.created_at)}
                </Text>
              </View>

              {/* Actions */}
              <TouchableOpacity
                onPress={() => handleDelete(video.id, video.shop_name)}
                className={`bg-red-500 rounded-xl py-3 flex-row items-center justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Ionicons name="trash" size={20} color="white" />
                <Text className={`text-white font-semibold ${isRTL ? 'mr-2' : 'ml-2'}`}>{t('deleteVideo')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {videos.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="videocam-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-lg mt-4">{t('noVideosAdmin')}</Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
