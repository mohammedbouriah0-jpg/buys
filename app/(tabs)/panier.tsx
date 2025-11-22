import React from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native"
import { Link, useRouter } from "expo-router"
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react-native"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"

export default function PanierPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart()
  const { isAuthenticated } = useAuth()
  const { t, isRTL } = useLanguage()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={[styles.title, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('cart')}</Text>
          <View style={styles.emptyState}>
            <ShoppingBag size={80} color="#8e8e8e" />
            <Text style={[styles.emptyTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('emptyCart')}</Text>
            <Text style={[styles.emptySubtitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
              {t('emptyCartSubtitle')}
            </Text>
            <Link href="/" asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>{t('discoverShops')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={[styles.title, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
            {t('cart')} ({totalItems} {totalItems > 1 ? t('items') : t('item')})
          </Text>

          <View style={styles.itemsList}>
            {items.map((item, index) => {
              const { product, quantity, selectedSize, selectedColor } = item;
              return (
                <View key={`${product.id}-${selectedSize}-${selectedColor}-${index}`} style={[styles.cartItem, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Link href={`/product/${product.id}`} asChild>
                    <TouchableOpacity>
                      <Image source={{ uri: product.image }} style={styles.productImage} />
                    </TouchableOpacity>
                  </Link>

                  <View style={styles.itemContent}>
                    <Link href={`/product/${product.id}`} asChild>
                      <TouchableOpacity>
                        <Text style={[styles.productName, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={2}>
                          {product.name}
                        </Text>
                      </TouchableOpacity>
                    </Link>
                    
                    {/* Display variants if present */}
                    {(selectedSize || selectedColor) && (
                      <View style={[styles.variantsInfo, isRTL && { flexDirection: 'row-reverse' }]}>
                        {selectedSize && <Text style={styles.variantText}>{t('size')}: {selectedSize}</Text>}
                        {selectedColor && <Text style={styles.variantText}>{t('color')}: {selectedColor}</Text>}
                      </View>
                    )}
                    
                    <Text style={[styles.productPrice, isRTL && { textAlign: 'right' }]}>
                      {product.price.toLocaleString()} DA
                    </Text>

                    <View style={[styles.itemActions, isRTL && { flexDirection: 'row-reverse' }]}>
                      <View style={[styles.quantityControl, isRTL && { flexDirection: 'row-reverse' }]}>
                        <TouchableOpacity
                          onPress={() => updateQuantity(product.id, quantity - 1, selectedSize, selectedColor)}
                          style={styles.quantityButton}
                        >
                          <Minus size={16} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.quantity}>{quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity(product.id, quantity + 1, selectedSize, selectedColor)}
                          disabled={quantity >= product.stock}
                          style={styles.quantityButton}
                        >
                          <Plus size={16} color="#000" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          console.log('🗑️ Clic sur poubelle détecté!');
                          console.log('🗑️ Suppression:', { id: product.id, size: selectedSize, color: selectedColor });
                          removeItem(product.id, selectedSize, selectedColor);
                        }}
                        style={styles.deleteButton}
                        activeOpacity={0.6}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.itemTotal, isRTL && { alignItems: 'flex-start' }]}>
                    <Text style={[styles.itemTotalPrice, isRTL && { textAlign: 'left' }]}>
                      {(product.price * quantity).toLocaleString()} DA
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.checkoutContainer}>
        <View style={[styles.totalRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.totalLabel, isRTL && { textAlign: 'right' }]}>{t('total')}</Text>
          <Text style={[styles.totalPrice, isRTL && { textAlign: 'left' }]}>{totalPrice.toLocaleString()} DA</Text>
        </View>
        {!isAuthenticated ? (
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.checkoutButtonText}>{t('loginToOrder')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => router.push("/checkout")}
          >
            <Text style={styles.checkoutButtonText}>{t('placeOrder')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8e8e8e",
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#000",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  itemsList: {
    gap: 16,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 8,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "center",
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fcc",
  },
  itemTotal: {
    alignItems: "flex-end",
  },
  itemTotalPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  checkoutContainer: {
    position: "absolute",
    bottom: 64,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "bold",
  },
  checkoutButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  variantsInfo: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  variantText: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
})
