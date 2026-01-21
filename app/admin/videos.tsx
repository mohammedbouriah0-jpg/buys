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
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header moderne */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3
      }}>
        <View style={{ 
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#f3f4f6',
              padding: 8,
              borderRadius: 12
            }}
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
            <Text style={{ 
              color: '#111827',
              fontSize: 20,
              fontWeight: '900',
              letterSpacing: 0.5
            }}>{t('videoModeration')}</Text>
            <Text style={{ 
              color: '#6b7280',
              fontSize: 12,
              fontWeight: '600'
            }}>{videos.length} {t('videosCount')}{videos.length > 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 12, paddingTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {videos.map((video) => (
          <View key={video.id} style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            marginBottom: 12,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3
          }}>
            {/* Vidéo avec overlay */}
            <View style={{ position: 'relative', backgroundColor: '#000', height: 380 }}>
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
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.3)'
                    }}
                  >
                    <View style={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      padding: 18,
                      borderRadius: 50
                    }}>
                      <Ionicons name="play" size={36} color="#000" />
                    </View>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Badge signalements */}
              {video.reports_count > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: '#dc2626',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Ionicons name="warning" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                    {video.reports_count} {t('reports')}
                  </Text>
                </View>
              )}
            </View>

            {/* Contenu ultra-compact */}
            <View style={{ padding: 10 }}>
              {/* Titre */}
              <Text style={{
                fontSize: 15,
                fontWeight: '800',
                color: '#111827',
                marginBottom: 6
              }}>{video.title}</Text>

              {/* Boutique + Stats en une ligne */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                gap: 8
              }}>
                {/* Boutique */}
                <View style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f3f4f6',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 8
                }}>
                  <Ionicons name="storefront" size={14} color="#7c3aed" />
                  <Text style={{ 
                    fontSize: 11, 
                    fontWeight: '700', 
                    color: '#374151',
                    marginLeft: 4,
                    flex: 1
                  }} numberOfLines={1}>
                    {video.shop_name}
                  </Text>
                </View>

                {/* Stats inline */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fef2f2',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 8
                }}>
                  <Ionicons name="heart" size={14} color="#ef4444" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#dc2626', marginLeft: 3 }}>
                    {video.likes_count || 0}
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 8
                }}>
                  <Ionicons name="chatbubble" size={14} color="#3b82f6" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb', marginLeft: 3 }}>
                    {video.comments_count || 0}
                  </Text>
                </View>
              </View>

              {/* Date + Bouton supprimer en une ligne */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}>
                <Text style={{
                  fontSize: 10,
                  color: '#9ca3af',
                  flex: 1
                }} numberOfLines={1}>
                  {formatDate(video.created_at)}
                </Text>

                <TouchableOpacity
                  onPress={() => handleDelete(video.id, video.shop_name)}
                  style={{
                    backgroundColor: '#dc2626',
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <Ionicons name="trash" size={14} color="white" />
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: '700',
                    marginLeft: 4
                  }}>Supprimer</Text>
                </TouchableOpacity>
              </View>
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
