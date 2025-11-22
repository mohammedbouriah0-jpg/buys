import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Image, Modal, FlatList, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { productsAPI, categoriesAPI } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"
import { X, Camera, Grid3X3 } from "lucide-react-native"
import { VerificationGuard } from "@/components/verification-guard"
import { useLanguage } from "@/lib/i18n/language-context"

interface Category {
  id: number
  name: string
  products_count: number
}

export default function AddProductPage() {
  const { user } = useAuth()
  const { t, isRTL } = useLanguage()
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [stock, setStock] = useState("0")
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  // Modal de sélection de catégorie
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  
  // Variants
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<Array<{size: string, color: string, stock: string}>>([])
  
  const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
  const ALL_COLORS = [
    { name: 'Noir', value: '#000000' },
    { name: 'Blanc', value: '#FFFFFF' },
    { name: 'Rouge', value: '#FF0000' },
    { name: 'Bleu', value: '#0000FF' },
    { name: 'Vert', value: '#00FF00' },
    { name: 'Jaune', value: '#FFFF00' },
    { name: 'Rose', value: '#FFC0CB' },
    { name: 'Gris', value: '#808080' },
  ]

  useEffect(() => {
    if (showCategoryModal) {
      loadCategories()
    }
  }, [showCategoryModal])

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const data = await categoriesAPI.getAll()
      setCategories(data)
    } catch (error) {
      console.error("Error loading categories:", error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== "granted") {
        Alert.alert(t("permissionRequired"), t("photosPermissionMessage"))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      } as any)

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri)
        setImages([...images, ...newImages].slice(0, 5))
      }
    } catch (error) {
      console.error("Error picking images:", error)
      Alert.alert(t("error"), "Impossible de sélectionner les images")
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const addVariant = () => {
    setVariants([...variants, { size: '', color: '', stock: '0' }])
  }
  
  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }
  
  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setVariants(newVariants)
  }

  const handleSave = async () => {
    if (!name || !price) {
      Alert.alert(t("error"), "Nom et prix sont obligatoires")
      return
    }

    if (images.length === 0) {
      Alert.alert(t("error"), "Ajoutez au moins une image")
      return
    }
    
    if (hasVariants && variants.length === 0) {
      Alert.alert(t("error"), "Veuillez ajouter au moins une variante ou désactiver les variantes")
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("price", price)
      formData.append("description", description)
      formData.append("category_id", categoryId)
      formData.append("stock", hasVariants ? "0" : stock)
      formData.append("has_variants", hasVariants.toString())
      
      if (hasVariants) {
        formData.append("variants", JSON.stringify(variants.map(v => ({
          size: v.size,
          color: v.color,
          stock: parseInt(v.stock) || 0
        }))))
      }

      // Add images
      images.forEach((uri, index) => {
        const filename = uri.split("/").pop() || `image${index}.jpg`
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : "image/jpeg"

        formData.append("images", {
          uri,
          name: filename,
          type,
        } as any)
      })

      await productsAPI.create(formData)

      Alert.alert(t("success"), t("productAddedSuccess"), [
        { text: t("ok"), onPress: () => router.back() }
      ])
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("unableToAddProduct"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <VerificationGuard>
    <View className="flex-1 bg-white" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <View className="flex-row items-center justify-between p-4 pt-12 border-b border-gray-200" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <Text className="text-xl font-bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("newProduct")}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t("productImages")} *</Text>
        </View>
        <TouchableOpacity
          onPress={pickImages}
          className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 items-center mb-4"
        >
          <Camera size={48} color="#9ca3af" />
          <Text className="text-gray-600 mt-2">{t("addImages")}</Text>
          <Text className="text-gray-400 text-xs">{images.length}/5 {t("imagesCount")}</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <View className="flex-row flex-wrap mb-4">
            {images.map((uri, index) => (
              <View key={index} className="relative mr-2 mb-2">
                <Image source={{ uri }} className="w-20 h-20 rounded-lg" />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
                {index === 0 && (
                  <View className="absolute bottom-0 left-0 right-0 bg-black/70 py-1">
                    <Text className="text-white text-xs text-center">{t("mainImage")}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t("productNameLabel")} *</Text>
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("productNamePlaceholder")}
          className="bg-gray-50 p-4 rounded-xl mb-4"
          style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
        />

        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t("priceLabel")} *</Text>
        </View>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder={t("pricePlaceholder")}
          keyboardType="numeric"
          className="bg-gray-50 p-4 rounded-xl mb-4"
          style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
        />

        {/* Variants Toggle */}
        <TouchableOpacity
          onPress={() => setHasVariants(!hasVariants)}
          className="flex-row items-center mb-6 bg-gray-50 p-4 rounded-xl"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
          <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
            hasVariants ? 'bg-black border-black' : 'border-gray-300'
          }`} style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
            {hasVariants && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
          <Text className="text-sm font-medium text-gray-700">{t("hasVariants")}</Text>
        </TouchableOpacity>

        {!hasVariants && (
          <>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
              <Text className="text-sm font-semibold text-gray-700 mb-2">{t("stockLabel")}</Text>
            </View>
            <TextInput
              value={stock}
              onChangeText={setStock}
              placeholder="0"
              keyboardType="numeric"
              className="bg-gray-50 p-4 rounded-xl mb-4"
              style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
            />
          </>
        )}

        {/* Variants Section - Flexible & Simple */}
        {hasVariants && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <Text className="text-lg font-bold text-gray-900" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                ✨ {t("variants")} ({variants.length})
              </Text>
              <TouchableOpacity
                onPress={addVariant}
                className="bg-black px-5 py-3 rounded-full flex-row items-center gap-2 shadow-lg"
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Text className="text-white font-bold text-xl">+</Text>
                <Text className="text-white font-bold">{t("add")}</Text>
              </TouchableOpacity>
            </View>
            
            {variants.length === 0 ? (
              <View className="bg-gray-50 p-10 rounded-2xl items-center border-2 border-dashed border-gray-300">
                <Text className="text-5xl mb-3">📦</Text>
                <Text className="text-gray-700 text-center font-bold text-base mb-1">
                  {t("noVariantsYet")}
                </Text>
                <Text className="text-gray-400 text-sm text-center">
                  {t("clickAddToCreate")}
                </Text>
              </View>
            ) : (
              variants.map((variant, index) => (
                <View key={index} className="bg-white p-5 rounded-2xl mb-3 border-2 border-gray-100 shadow-sm">
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <View className="bg-black px-4 py-2 rounded-full">
                      <Text className="text-white font-bold">#{index + 1}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => removeVariant(index)} 
                      className="bg-red-50 w-10 h-10 rounded-full items-center justify-center"
                    >
                      <Text className="text-red-500 font-bold text-xl">×</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Option 1 (ex: Taille, Capacité, Poids...) */}
                  <View className="mb-3">
                    <Text className="text-sm text-gray-600 mb-2 font-semibold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      {t("option1")} ({t("optional")})
                    </Text>
                    <TextInput
                      value={variant.size}
                      onChangeText={(text) => updateVariant(index, 'size', text)}
                      placeholder={t("option1Placeholder")}
                      className="bg-gray-50 px-4 py-3 rounded-xl border-2 border-gray-200 font-medium"
                      style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
                    />
                  </View>
                  
                  {/* Option 2 (ex: Couleur, Matériau, Saveur...) */}
                  <View className="mb-3">
                    <Text className="text-sm text-gray-600 mb-2 font-semibold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      {t("option2")} ({t("optional")})
                    </Text>
                    <TextInput
                      value={variant.color}
                      onChangeText={(text) => updateVariant(index, 'color', text)}
                      placeholder={t("option2Placeholder")}
                      className="bg-gray-50 px-4 py-3 rounded-xl border-2 border-gray-200 font-medium"
                      style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
                    />
                  </View>
                  
                  {/* Stock */}
                  <View>
                    <Text className="text-sm text-gray-600 mb-2 font-semibold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      📦 {t("stockLabel")}
                    </Text>
                    <TextInput
                      value={variant.stock}
                      onChangeText={(text) => updateVariant(index, 'stock', text)}
                      placeholder="0"
                      keyboardType="numeric"
                      className="bg-gray-50 px-4 py-3 rounded-xl border-2 border-gray-200 font-bold text-lg"
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                  </View>
                </View>
              ))
            )}
            
            {/* Info Box */}
            <View className="bg-blue-50 p-4 rounded-xl border border-blue-200 mt-2">
              <Text className="text-blue-800 text-xs text-center font-medium">
                💡 {t("variantsHint")}
              </Text>
            </View>
          </View>
        )}

        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t("categoryLabel")} *</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCategoryModal(true)}
          className="bg-gray-50 p-4 rounded-xl mb-4 flex-row items-center justify-between"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
          {selectedCategory ? (
            <Text className="text-gray-900 font-medium" style={{ textAlign: isRTL ? 'right' : 'left' }}>{selectedCategory.name}</Text>
          ) : (
            <Text className="text-gray-500" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("selectCategoryPlaceholder")}</Text>
          )}
          <Grid3X3 size={20} color="#9ca3af" />
        </TouchableOpacity>

        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t("descriptionLabel")}</Text>
        </View>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("descriptionPlaceholder")}
          multiline
          numberOfLines={4}
          className="bg-gray-50 p-4 rounded-xl mb-6"
          style={{ textAlignVertical: "top", textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className={`p-4 rounded-xl items-center ${loading ? "bg-gray-400" : "bg-black"}`}
        >
          <Text className="text-white font-semibold text-lg">
            {loading ? t("addingProduct") : t("addProductButton")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de sélection de catégorie */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 mt-20 bg-white rounded-t-3xl">
            {/* Header du modal */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <Text className="text-xl font-bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("selectCategoryPlaceholder")}</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Liste des catégories */}
            {loadingCategories ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory(item)
                      setCategoryId(item.id.toString())
                      setShowCategoryModal(false)
                    }}
                    className="bg-white p-4 rounded-xl mb-3 border-2 border-gray-200 flex-row items-center justify-between"
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                  >
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text className="font-semibold text-gray-900 text-base mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>{item.name}</Text>
                      <Text className="text-sm text-gray-500" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {item.products_count} {t("products")}
                      </Text>
                    </View>
                    <Grid3X3 size={24} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="items-center justify-center py-12">
                    <Grid3X3 size={48} color="#d1d5db" />
                    <Text className="text-gray-500 mt-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("noCategories")}</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
    </VerificationGuard>
  )
}
