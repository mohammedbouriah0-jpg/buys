import { View, Text, TextInput, TouchableOpacity, Alert, Image, Modal, FlatList, ActivityIndicator, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState, useEffect } from "react"
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { productsAPI, categoriesAPI } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"
import { X, Camera, Grid3X3 } from "lucide-react-native"
import { VerificationGuard } from "@/components/verification-guard"
import { useLanguage } from "@/lib/i18n/language-context"
import { VariantManager } from "@/components/variant-manager"

interface Category {
  id: number
  name: string
  products_count: number
}

export default function AddProductPage() {
  const { user } = useAuth()
  const { t, isRTL } = useLanguage()
  const insets = useSafeAreaInsets()
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
  
  // Variants - nouveau format flexible
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<Array<{attributes: {[key: string]: string}, stock: string}>>([])
  
  // Keyboard handling - solution pro
  const { scrollViewRef, keyboardHeight, scrollToInput } = useKeyboardScroll()
  


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
          attributes: v.attributes,
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
    <View style={{ flex: 1, backgroundColor: '#f9fafb', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Header compact */}
      <View style={{ 
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Text style={{ 
          fontSize: 24,
          fontWeight: '800',
          color: '#111827',
          textAlign: isRTL ? 'right' : 'left'
        }}>{t("newProduct")}</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} color="#374151" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 80, 350) + keyboardHeight }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Upload d'images moderne */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 13,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 12,
            textAlign: isRTL ? 'right' : 'left'
          }}>{t("productImages")} *</Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {/* Images existantes */}
            {images.map((uri, index) => (
              <View key={index} style={{ position: 'relative' }}>
                <Image 
                  source={{ uri }} 
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6'
                  }}
                />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: '#ef4444',
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4
                  }}
                >
                  <X size={14} color="#fff" strokeWidth={3} />
                </TouchableOpacity>
                {index === 0 && (
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    paddingVertical: 4
                  }}>
                    <Text style={{ 
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>PRINCIPALE</Text>
                  </View>
                )}
              </View>
            ))}
            
            {/* Bouton d'ajout */}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImages}
                style={{
                  width: 100,
                  height: 100,
                  backgroundColor: '#f9fafb',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#d1d5db',
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Camera size={32} color="#9ca3af" strokeWidth={2} />
                <Text style={{ 
                  color: '#6b7280',
                  fontSize: 11,
                  fontWeight: '600',
                  marginTop: 6
                }}>{images.length}/5</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={{ 
          fontSize: 13,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 10,
          textAlign: isRTL ? 'right' : 'left'
        }}>{t("productNameLabel")} *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("productNamePlaceholder")}
          onFocus={() => scrollToInput(200)}
          style={{
            backgroundColor: '#ffffff',
            padding: 14,
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 15,
            color: '#111827',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr'
          }}
        />

        <Text style={{ 
          fontSize: 13,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 10,
          textAlign: isRTL ? 'right' : 'left'
        }}>{t("priceLabel")} *</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder={t("pricePlaceholder")}
          keyboardType="numeric"
          onFocus={() => scrollToInput(280)}
          style={{
            backgroundColor: '#ffffff',
            padding: 14,
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 15,
            color: '#111827',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr'
          }}
        />

        {/* Variants Toggle - Compact */}
        <TouchableOpacity
          onPress={() => setHasVariants(!hasVariants)}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            backgroundColor: hasVariants ? '#eff6ff' : '#f9fafb',
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: hasVariants ? '#3b82f6' : '#e5e7eb'
          }}
        >
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            backgroundColor: hasVariants ? '#3b82f6' : '#ffffff',
            borderWidth: 1.5,
            borderColor: hasVariants ? '#3b82f6' : '#d1d5db',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: isRTL ? 0 : 10,
            marginLeft: isRTL ? 10 : 0
          }}>
            {hasVariants && <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={{ 
            fontSize: 14,
            fontWeight: '600',
            color: hasVariants ? '#1e40af' : '#374151',
            textAlign: isRTL ? 'right' : 'left'
          }}>{t("hasVariants")}</Text>
        </TouchableOpacity>

        {/* Catégorie */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 13,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 12,
            textAlign: isRTL ? 'right' : 'left'
          }}>{t("categoryLabel")}</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryModal(true)}
            style={{
              backgroundColor: '#ffffff',
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Text style={{ 
              fontSize: 15,
              color: selectedCategory ? '#111827' : '#9ca3af',
              fontWeight: selectedCategory ? '600' : '400',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {selectedCategory ? selectedCategory.name : t("selectCategoryPlaceholder")}
            </Text>
            <Grid3X3 size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {!hasVariants && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ 
              fontSize: 13,
              fontWeight: '700',
              color: '#111827',
              marginBottom: 12,
              textAlign: isRTL ? 'right' : 'left'
            }}>{t("stockLabel")}</Text>
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              paddingHorizontal: 16
            }}>
              <Text style={{ 
                fontSize: 15,
                color: '#6b7280',
                fontWeight: '600',
                marginRight: isRTL ? 0 : 8,
                marginLeft: isRTL ? 8 : 0
              }}>📦</Text>
              <TextInput
                value={stock}
                onChangeText={setStock}
                placeholder="0"
                keyboardType="numeric"
                onFocus={() => scrollToInput(450)}
                style={{
                  flex: 1,
                  padding: 16,
                  fontSize: 15,
                  color: '#111827',
                  fontWeight: '600',
                  textAlign: isRTL ? 'right' : 'left'
                }}
              />
              <Text style={{ 
                fontSize: 13,
                color: '#9ca3af',
                fontWeight: '500'
              }}>{t("units")}</Text>
            </View>
          </View>
        )}

        {/* Variants Section - Nouveau composant ergonomique */}
        {hasVariants && (
          <VariantManager variants={variants} onChange={setVariants} />
        )}

        {/* Description - Améliorée */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ 
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <Text style={{ 
              fontSize: 13,
              fontWeight: '700',
              color: '#111827',
              textAlign: isRTL ? 'right' : 'left'
            }}>{t("descriptionLabel")}</Text>
            <Text style={{ 
              fontSize: 12,
              color: '#9ca3af',
              fontWeight: '500'
            }}>
              {description.length}/500
            </Text>
          </View>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            overflow: 'hidden'
          }}>
            <TextInput
              value={description}
              onChangeText={(text) => setDescription(text.slice(0, 500))}
              placeholder={t("descriptionPlaceholder")}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              maxLength={500}
              onFocus={() => scrollToInput(550)}
              style={{
                padding: 16,
                fontSize: 15,
                color: '#111827',
                minHeight: 120,
                textAlignVertical: "top",
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
                lineHeight: 22
              }}
            />
          </View>
          <Text style={{ 
            fontSize: 11,
            color: '#6b7280',
            marginTop: 6,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            💡 {t("descriptionHint") || "Décrivez votre produit en détail pour attirer plus de clients"}
          </Text>
        </View>

        {/* Bouton Ajouter */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#9ca3af' : '#111827',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center'
          }}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={{ 
                color: '#ffffff',
                fontSize: 15,
                fontWeight: '700'
              }}>{t("addingProduct")}</Text>
            </View>
          ) : (
            <Text style={{ 
              color: '#ffffff',
              fontSize: 15,
              fontWeight: '700'
            }}>{t("addProductButton")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de sélection de catégorie - Moderne */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={{ 
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8
          }}>
            {/* Header du modal */}
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6'
            }}>
              <View>
                <Text style={{ 
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#111827',
                  textAlign: isRTL ? 'right' : 'left'
                }}>{t("selectCategoryPlaceholder")}</Text>
                <Text style={{ 
                  fontSize: 13,
                  color: '#6b7280',
                  marginTop: 4,
                  textAlign: isRTL ? 'right' : 'left'
                }}>{categories.length} {t("categories")}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowCategoryModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} color="#374151" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Liste des catégories */}
            {loadingCategories ? (
              <View style={{ 
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 60
              }}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ 
                  color: '#6b7280',
                  marginTop: 16,
                  fontSize: 15
                }}>{t("loading")}</Text>
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
                    style={{
                      backgroundColor: selectedCategory?.id === item.id ? '#eff6ff' : '#ffffff',
                      padding: 16,
                      borderRadius: 16,
                      marginBottom: 10,
                      borderWidth: 2,
                      borderColor: selectedCategory?.id === item.id ? '#3b82f6' : '#e5e7eb',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <View style={{ 
                      flex: 1,
                      alignItems: isRTL ? 'flex-end' : 'flex-start'
                    }}>
                      <Text style={{ 
                        fontWeight: '700',
                        color: selectedCategory?.id === item.id ? '#1e40af' : '#111827',
                        fontSize: 16,
                        marginBottom: 4,
                        textAlign: isRTL ? 'right' : 'left'
                      }}>{item.name}</Text>
                      <View style={{
                        backgroundColor: selectedCategory?.id === item.id ? '#dbeafe' : '#f3f4f6',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8
                      }}>
                        <Text style={{ 
                          fontSize: 12,
                          color: selectedCategory?.id === item.id ? '#1e40af' : '#6b7280',
                          fontWeight: '600',
                          textAlign: isRTL ? 'right' : 'left'
                        }}>
                          {item.products_count} {t("products")}
                        </Text>
                      </View>
                    </View>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: selectedCategory?.id === item.id ? '#3b82f6' : '#f9fafb',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Grid3X3 size={20} color={selectedCategory?.id === item.id ? '#ffffff' : '#9ca3af'} strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ 
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 60
                  }}>
                    <View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: '#f3f4f6',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16
                    }}>
                      <Grid3X3 size={40} color="#d1d5db" strokeWidth={2} />
                    </View>
                    <Text style={{ 
                      color: '#6b7280',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>{t("noCategories")}</Text>
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
