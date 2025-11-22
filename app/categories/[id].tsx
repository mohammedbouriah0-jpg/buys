import React, { useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native"
import { Link, useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeft, Grid3X3 } from "lucide-react-native"
import { productsAPI } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/language-context"

interface Product {
  id: number
  name: string
  price: number
  image_url: string
  stock: number
  shop_name: string
}

export default function CategoryPage() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryName, setCategoryName] = useState("")
  const { t, isRTL } = useLanguage()

  useEffect(() => {
    loadProducts()
  }, [id])

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll({ category: Number(id) })
      setProducts(data)
      if (data.length > 0 && data[0].category_name) {
        setCategoryName(data[0].category_name)
      }
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={[styles.headerContent, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.headerTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{categoryName || t('category')}</Text>
          <Text style={[styles.headerSubtitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{products.length} {t('productsCount')}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Grid3X3 size={64} color="#d1d5db" strokeWidth={1.5} />
            <Text style={[styles.emptyText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('noProductsAvailable')}</Text>
            <Text style={[styles.emptySubtext, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('categoryNoProducts')}</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} asChild>
                <TouchableOpacity style={styles.productCard} activeOpacity={0.8}>
                  <Image 
                    source={{ uri: product.image_url || 'https://via.placeholder.com/200' }} 
                    style={styles.productImage} 
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.shopName} numberOfLines={1}>
                      {product.shop_name}
                    </Text>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>
                        {product.price.toLocaleString()} DA
                      </Text>
                      {product.stock > 0 ? (
                        <View style={styles.stockBadge}>
                          <Text style={styles.stockText}>{t('inStock')}</Text>
                        </View>
                      ) : (
                        <View style={[styles.stockBadge, styles.outOfStockBadge]}>
                          <Text style={[styles.stockText, styles.outOfStockText]}>{t('outOfStock')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  productCard: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
  },
  productInfo: {
    padding: 12,
  },
  shopName: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  stockBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#065f46",
  },
  outOfStockBadge: {
    backgroundColor: "#fee2e2",
  },
  outOfStockText: {
    color: "#991b1b",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 40,
  },
})
