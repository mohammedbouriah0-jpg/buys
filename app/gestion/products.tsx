import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { productsAPI } from "@/lib/api"
import { X, Edit, Trash2 } from "lucide-react-native"
import { useLanguage } from "@/lib/i18n/language-context"

export default function ProductsPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      console.log('🔍 Loading products for shop:', user?.shopId)
      if (user?.shopId) {
        const data = await productsAPI.getAll({ shop_id: user.shopId })
        console.log('✅ Products loaded:', data.length, 'products')
        setProducts(data)
      } else {
        console.log('❌ No shopId found in user:', user)
      }
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/gestion/edit-product/${id}`)
  }

  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      t('confirm'),
      `${t('deleteConfirm')} "${name}" ?`,
      [
        { text: t('cancel'), style: "cancel" },
        { 
          text: t('delete'), 
          style: "destructive",
          onPress: async () => {
            try {
              await productsAPI.delete(id)
              Alert.alert(t('success'), t('productDeletedSuccess'))
              loadProducts()
            } catch (error: any) {
              Alert.alert(t('error'), error.message)
            }
          }
        }
      ]
    )
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 pt-12 border-b border-gray-200">
        <Text className="text-xl font-bold">{t('myProducts')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {loading ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color="#000" />
            <Text className="text-gray-600 mt-4">{t('loading')}</Text>
          </View>
        ) : products.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-gray-600 text-center">{t('noProduct')}</Text>
            <Text className="text-gray-400 text-center mt-2">{t('addFirstProduct')}</Text>
          </View>
        ) : (
          products.map((product) => (
            <View key={product.id} className="bg-gray-50 p-4 rounded-xl mb-3 flex-row">
              {product.image_url && (
                <Image 
                  source={{ uri: product.image_url }} 
                  className="w-16 h-16 rounded-lg mr-3"
                />
              )}
              <View className="flex-1">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="font-semibold text-lg">{product.name}</Text>
                    <Text className="text-gray-600">{product.price} DA</Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => handleEdit(product.id.toString())}
                      className="bg-blue-100 p-2 rounded-lg mr-2"
                    >
                      <Edit size={20} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(product.id.toString(), product.name)}
                      className="bg-red-100 p-2 rounded-lg"
                    >
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text className="text-gray-500 text-sm">{product.category_name || t('noCategory')}</Text>
                <Text className="text-gray-400 text-xs mt-1">{t('stock')}: {product.stock || 0}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
