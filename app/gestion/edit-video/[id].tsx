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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-2xl font-black">{t('modifyVideo')}</Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-black rounded-full px-5 py-2.5 flex-row items-center"
            style={{ opacity: saving ? 0.5 : 1 }}
          >
            <Save size={18} color="#fff" strokeWidth={2} />
            <Text className="text-white font-bold ml-2">{saving ? "..." : t('save')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Aperçu vidéo */}
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm mb-5">
          <View className="bg-gray-900" style={{ height: 200 }}>
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
              <View className="flex-1 items-center justify-center">
                <Film size={48} color="#9ca3af" />
              </View>
            )}
          </View>
          <View className="p-4 bg-blue-50">
            <Text className="text-xs text-blue-600 font-semibold">
              💡 {t('canOnlyModifyTitleDesc')}
            </Text>
          </View>
        </View>

        {/* Formulaire */}
        <View className="gap-5">
          {/* Titre */}
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="text-xs font-bold text-gray-500 uppercase mb-3">{t('title')} *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('videoTitle')}
              placeholderTextColor="#9ca3af"
              className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3"
            />
          </View>

          {/* Description */}
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="text-xs font-bold text-gray-500 uppercase mb-3">{t('description')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('describeVideo')}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={5}
              className="text-base text-gray-900 border-b border-gray-200 pb-3"
              style={{ textAlignVertical: "top", minHeight: 100 }}
            />
          </View>

          {/* Produit lié */}
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="text-xs font-bold text-gray-500 uppercase mb-3">{t('linkedProducts')}</Text>
            
            {selectedProductId ? (
              <View>
                {myProducts.find(p => p.id === selectedProductId) && (
                  <View className="flex-row items-center bg-gray-50 rounded-xl p-3 mb-3">
                    <Image
                      source={{ uri: myProducts.find(p => p.id === selectedProductId)?.image_url }}
                      className="w-16 h-16 rounded-lg"
                    />
                    <View className="flex-1 ml-3">
                      <Text className="font-bold text-gray-900">
                        {myProducts.find(p => p.id === selectedProductId)?.name}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {myProducts.find(p => p.id === selectedProductId)?.price} DH
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemoveProduct}
                      className="bg-red-100 p-2 rounded-full"
                    >
                      <X size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setShowProductModal(true)}
                  className="bg-gray-100 rounded-xl py-3 flex-row items-center justify-center"
                >
                  <Package size={20} color="#6b7280" />
                  <Text className="text-gray-700 font-semibold ml-2">{t('changeProduct')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowProductModal(true)}
                className="bg-blue-50 rounded-xl py-4 flex-row items-center justify-center border-2 border-dashed border-blue-200"
              >
                <Plus size={24} color="#3b82f6" />
                <Text className="text-blue-600 font-bold ml-2">{t('addProduct')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal de sélection de produit */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 mt-20 bg-white rounded-t-3xl">
            <View className="p-5 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-xl font-bold">{t('chooseProduct')}</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="flex-1 p-5">
              {myProducts.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <Package size={48} color="#d1d5db" />
                  <Text className="text-gray-400 mt-4">{t('noProductFound')}</Text>
                  <Text className="text-gray-400 text-sm">{t('createProductsFirst')}</Text>
                </View>
              ) : (
                myProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => {
                      setSelectedProductId(product.id)
                      setShowProductModal(false)
                    }}
                    className={`flex-row items-center bg-gray-50 rounded-xl p-3 mb-3 ${
                      selectedProductId === product.id ? 'border-2 border-blue-500' : ''
                    }`}
                  >
                    <Image
                      source={{ uri: product.image_url }}
                      className="w-16 h-16 rounded-lg"
                    />
                    <View className="flex-1 ml-3">
                      <Text className="font-bold text-gray-900">{product.name}</Text>
                      <Text className="text-sm text-gray-600">{product.price} DH</Text>
                    </View>
                    {selectedProductId === product.id && (
                      <View className="bg-blue-500 p-2 rounded-full">
                        <Save size={16} color="#fff" />
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
