import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, Modal } from "react-native"
import { useState, useEffect } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { videosAPI, productsAPI } from "@/lib/api"
import { Video, ResizeMode } from "expo-av"
import { ArrowLeft, Save, Film, Package, Plus, X } from "lucide-react-native"
import { useLanguage } from "@/lib/i18n/language-context"

interface VideoData {
  id: number
  title: string
  description: string
  video_url: string
  thumbnail_url: string
  product_id?: number
  product?: any
}

export default function EditVideoPage() {
  const { t } = useLanguage()
  const { id } = useLocalSearchParams()
  const [video, setVideo] = useState<VideoData | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [myProducts, setMyProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  useEffect(() => {
    loadVideo()
    loadMyProducts()
  }, [])

  const loadVideo = async () => {
    try {
      setLoading(true)
      const data = await videosAPI.getById(id as string)
      setVideo(data)
      setTitle(data.title || "")
      setDescription(data.description || "")
      setSelectedProductId(data.product_id || null)
    } catch (error) {
      console.error("Error loading video:", error)
      Alert.alert(t('error'), t('unableToPublishVideo'))
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const loadMyProducts = async () => {
    try {
      // Charger uniquement les produits de ma boutique
      const data = await productsAPI.getMyProducts()
      setMyProducts(data)
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('error'), t('titleRequired'))
      return
    }

    setSaving(true)
    try {
      await videosAPI.update(id as string, { 
        title, 
        description,
        product_id: selectedProductId 
      })
      Alert.alert(t('success'), t('productUpdatedSuccess'), [
        { text: t('ok'), onPress: () => router.back() }
      ])
    } catch (error) {
      Alert.alert(t('error'), t('unableToUpdateProduct'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveProduct = () => {
    Alert.alert(
      t('removeProduct'),
      t('removeProductConfirm'),
      [
        { text: t('cancel'), style: "cancel" },
        { 
          text: t('delete'), 
          style: "destructive",
          onPress: () => setSelectedProductId(null)
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
            <Text className="text-2xl font-black">{t('editVideo')}</Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header moderne blanc */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4
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
            <Text style={{ fontSize: 19, fontWeight: '800', color: '#111827' }}>
              {t('modifyVideo')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: '#3b82f6',
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: saving ? 0.5 : 1,
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6
            }}
          >
            <Save size={16} color="#fff" strokeWidth={2.5} />
            <Text style={{ color: '#ffffff', fontWeight: '700', marginLeft: 6, fontSize: 14 }}>
              {saving ? "..." : t('save')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Aperçu vidéo */}
        <View style={{ position: 'relative', height: 400, backgroundColor: '#000000' }}>
          {video?.thumbnail_url ? (
            <Image
              source={{ uri: video.thumbnail_url }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : video?.video_url ? (
            <Video
              source={{ uri: video.video_url }}
              style={{ width: "100%", height: "100%" }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isMuted={true}
              positionMillis={0}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937' }}>
              <Film size={64} color="#6b7280" />
            </View>
          )}
          
          {/* Info badge */}
          <View style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(59, 130, 246, 0.95)',
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8
          }}>
            <Text style={{ fontSize: 22, marginRight: 10 }}>💡</Text>
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }}>
              {t('canOnlyModifyTitleDesc')}
            </Text>
          </View>
        </View>

        {/* Formulaire moderne */}
        <View style={{ padding: 16, gap: 14 }}>
          {/* Titre */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}>
            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 }}>
              {t('title').toUpperCase()} *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('videoTitle')}
              placeholderTextColor="#9ca3af"
              style={{
                color: '#111827',
                fontSize: 16,
                fontWeight: '600',
                paddingBottom: 10,
                borderBottomWidth: 2,
                borderBottomColor: '#3b82f6'
              }}
            />
          </View>

          {/* Description */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}>
            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 }}>
              {t('description').toUpperCase()}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('describeVideo')}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              style={{
                color: '#111827',
                fontSize: 14,
                minHeight: 90,
                textAlignVertical: "top",
                paddingBottom: 10,
                borderBottomWidth: 2,
                borderBottomColor: '#e5e7eb'
              }}
            />
          </View>

          {/* Produit lié */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}>
            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', marginBottom: 14, letterSpacing: 0.5 }}>
              {t('linkedProducts').toUpperCase()}
            </Text>
            
            {selectedProductId ? (
              <View>
                {myProducts.find(p => p.id === selectedProductId) && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f9fafb',
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb'
                  }}>
                    <Image
                      source={{ uri: myProducts.find(p => p.id === selectedProductId)?.image_url }}
                      style={{ width: 60, height: 60, borderRadius: 12 }}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: '#111827', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>
                        {myProducts.find(p => p.id === selectedProductId)?.name}
                      </Text>
                      <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '800' }}>
                        {myProducts.find(p => p.id === selectedProductId)?.price} DH
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemoveProduct}
                      style={{
                        backgroundColor: '#fee2e2',
                        padding: 10,
                        borderRadius: 12
                      }}
                    >
                      <X size={18} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setShowProductModal(true)}
                  style={{
                    backgroundColor: '#f3f4f6',
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Package size={18} color="#6b7280" strokeWidth={2.5} />
                  <Text style={{ color: '#374151', fontWeight: '600', marginLeft: 8, fontSize: 14 }}>
                    {t('changeProduct')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowProductModal(true)}
                style={{
                  backgroundColor: '#eff6ff',
                  borderRadius: 14,
                  paddingVertical: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#3b82f6'
                }}
              >
                <Plus size={22} color="#3b82f6" strokeWidth={2.5} />
                <Text style={{ color: '#3b82f6', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>
                  {t('addProduct')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal moderne de sélection de produit */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
            activeOpacity={1} 
            onPress={() => setShowProductModal(false)}
          />
          <View style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '85%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 20
          }}>
            {/* Header moderne */}
            <View style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 }}>
                    {t('chooseProduct')}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>
                    {myProducts.length} {myProducts.length > 1 ? 'produits' : 'produit'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowProductModal(false)}
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} color="#111827" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={true}
            >
              {myProducts.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16
                  }}>
                    <Package size={40} color="#9ca3af" strokeWidth={2} />
                  </View>
                  <Text style={{ color: '#111827', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
                    {t('noProductFound')}
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                    {t('createProductsFirst')}
                  </Text>
                </View>
              ) : (
                myProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => {
                      setSelectedProductId(product.id)
                      setShowProductModal(false)
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: selectedProductId === product.id ? '#eff6ff' : '#f9fafb',
                      borderRadius: 16,
                      padding: 12,
                      marginBottom: 10,
                      borderWidth: 2,
                      borderColor: selectedProductId === product.id ? '#3b82f6' : 'transparent',
                      shadowColor: selectedProductId === product.id ? '#3b82f6' : '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selectedProductId === product.id ? 0.15 : 0.03,
                      shadowRadius: 4,
                      elevation: selectedProductId === product.id ? 4 : 1
                    }}
                  >
                    <Image
                      source={{ uri: product.image_url }}
                      style={{ width: 70, height: 70, borderRadius: 14 }}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ 
                        fontWeight: '700', 
                        color: '#111827', 
                        fontSize: 15,
                        marginBottom: 4
                      }} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={{ 
                        fontSize: 16, 
                        color: '#3b82f6', 
                        fontWeight: '800' 
                      }}>
                        {product.price} DH
                      </Text>
                    </View>
                    {selectedProductId === product.id && (
                      <View style={{
                        width: 32,
                        height: 32,
                        backgroundColor: '#3b82f6',
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Save size={16} color="#fff" strokeWidth={2.5} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}
