import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { productsAPI } from "@/lib/api"
import { X, Edit, Trash2 } from "lucide-react-native"
import { useLanguage } from "@/lib/i18n/language-context"
import { VerificationGuard } from "@/components/verification-guard"

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
    <VerificationGuard>
    <View className="flex-1" style={{ backgroundColor: '#f9fafb' }}>
      {/* Header moderne */}
      <View style={{ 
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ 
            fontSize: 28,
            fontWeight: '900',
            color: '#111827'
          }}>{t('myProducts')}</Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f3f4f6',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={22} color="#374151" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" style={{ padding: 16 }}>
        {loading ? (
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
              fontSize: 15,
              fontWeight: '500'
            }}>{t('loading')}</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={{ 
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            paddingHorizontal: 32
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#dbeafe',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 40 }}>📦</Text>
            </View>
            <Text style={{ 
              color: '#111827',
              fontSize: 20,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 8
            }}>{t('noProduct')}</Text>
            <Text style={{ 
              color: '#6b7280',
              fontSize: 15,
              textAlign: 'center',
              lineHeight: 22
            }}>{t('addFirstProduct')}</Text>
          </View>
        ) : (
          products.map((product) => (
            <View 
              key={product.id} 
              style={{
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 20,
                marginBottom: 12,
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2
              }}
            >
              {product.image_url && (
                <Image 
                  source={{ uri: product.image_url }} 
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    marginRight: 16,
                    backgroundColor: '#f3f4f6'
                  }}
                />
              )}
              <View style={{ flex: 1 }}>
                <View style={{ 
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8
                }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ 
                      fontWeight: '800',
                      fontSize: 17,
                      color: '#111827',
                      marginBottom: 4
                    }}>{product.name}</Text>
                    <Text style={{ 
                      color: '#3b82f6',
                      fontSize: 16,
                      fontWeight: '700'
                    }}>{product.price} DA</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleEdit(product.id.toString())}
                      style={{
                        backgroundColor: '#dbeafe',
                        padding: 10,
                        borderRadius: 12
                      }}
                    >
                      <Edit size={20} color="#2563eb" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(product.id.toString(), product.name)}
                      style={{
                        backgroundColor: '#fee2e2',
                        padding: 10,
                        borderRadius: 12
                      }}
                    >
                      <Trash2 size={20} color="#dc2626" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <View style={{
                    backgroundColor: '#f3f4f6',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8
                  }}>
                    <Text style={{ 
                      color: '#6b7280',
                      fontSize: 13,
                      fontWeight: '600'
                    }}>{product.category_name || t('noCategory')}</Text>
                  </View>
                  <Text style={{ 
                    color: '#9ca3af',
                    fontSize: 13,
                    fontWeight: '500'
                  }}>{t('stock')}: {product.stock || 0}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
    </VerificationGuard>
  )
}
