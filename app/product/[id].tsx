import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react-native";
import { useCart } from "@/lib/cart-context";
import { productsAPI } from "@/lib/api";
import { Toast } from "@/components/toast-notification";
import { useLanguage } from "@/lib/i18n/language-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [availableStock, setAvailableStock] = useState(0);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    loadProduct();
  }, [id]);
  
  useEffect(() => {
    if (product?.has_variants && product?.variants) {
      // Check if we need both options or just one
      const hasSizes = product.variants.some((v: any) => v.size);
      const hasColors = product.variants.some((v: any) => v.color);
      
      if (hasSizes && hasColors) {
        // Both options required
        if (selectedSize && selectedColor) {
          const variant = product.variants.find(
            (v: any) => v.size === selectedSize && v.color === selectedColor
          );
          setAvailableStock(variant?.stock || 0);
        }
      } else if (hasSizes && !hasColors) {
        // Only size required
        if (selectedSize) {
          const variant = product.variants.find((v: any) => v.size === selectedSize);
          setAvailableStock(variant?.stock || 0);
        }
      } else if (!hasSizes && hasColors) {
        // Only color required
        if (selectedColor) {
          const variant = product.variants.find((v: any) => v.color === selectedColor);
          setAvailableStock(variant?.stock || 0);
        }
      }
    } else if (!product?.has_variants) {
      setAvailableStock(product?.stock || 0);
    }
  }, [product, selectedSize, selectedColor]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productsAPI.getById(id as string);
      setProduct(data);
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('productNotFound')}</Text>
          <TouchableOpacity
            style={styles.backToShopButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToShopButtonText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check if can add to cart
  const canAddToCart = () => {
    if (!product) return false;
    
    if (product.has_variants && product.variants) {
      const hasSizes = product.variants.some((v: any) => v.size);
      const hasColors = product.variants.some((v: any) => v.color);
      
      if (hasSizes && !selectedSize) return false;
      if (hasColors && !selectedColor) return false;
    }
    
    return true;
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check stock availability
    const stockToCheck = product.has_variants ? availableStock : (product.stock || 0);
    if (stockToCheck < quantity) {
      setToastMessage(`⚠️ Stock insuffisant. Disponible: ${stockToCheck}`);
      setShowToast(true);
      return;
    }
    
    const productData = {
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      image:
        product.images?.[0]?.image_url ||
        product.image_url ||
        "https://via.placeholder.com/200",
      stock: stockToCheck,
      description: product.description || "",
      category: product.category || "",
      shopId: product.shop_id,
    };
    
    await addItem(productData, quantity, selectedSize || undefined, selectedColor || undefined);
    
    // Afficher une belle notification
    const message = quantity > 1 
      ? `✨ ${quantity} ${t('products')} ${t('addToCart')}!`
      : `✨ ${t('product')} ${t('addToCart')}!`;
    setToastMessage(message);
    setShowToast(true);
    
    // Rediriger après 1.5s
    setTimeout(() => {
      router.push("/(tabs)/panier");
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {/* Header compact */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Galerie d'images compacte */}
        <View style={styles.imageGalleryContainer}>
          <FlatList
            ref={flatListRef}
            data={
              product.images && product.images.length > 0
                ? product.images
                : [
                    {
                      image_url:
                        product.image_url || "https://via.placeholder.com/400",
                    },
                  ]
            }
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.image_url }}
                style={styles.productImage}
                resizeMode="cover"
              />
            )}
            keyExtractor={(_, index) => index.toString()}
          />

          {/* Indicateurs minimalistes */}
          {((product.images && product.images.length > 1) || false) && (
            <View style={styles.paginationContainer}>
              {(product.images || []).map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Nom et prix compacts */}
          <View style={styles.mainInfo}>
            <Text style={[styles.productName, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={[styles.productPrice, isRTL && { textAlign: 'right' }]}>
              {product.price.toLocaleString()} DA
            </Text>
          </View>

          {/* Boutique compacte */}
          {product.shop_id && (
            <Link href={`/shop/${product.shop_id}`} asChild>
              <TouchableOpacity style={[styles.shopCard, isRTL && { flexDirection: 'row-reverse' }]}>
                {product.shop_logo && (
                  <Image
                    source={{ uri: product.shop_logo }}
                    style={styles.shopAvatar}
                  />
                )}
                <View style={styles.shopInfo}>
                  <View style={[styles.shopNameRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={[styles.shopName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                      {product.shop_name || t('shop')}
                    </Text>
                    {product.verified === true && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓</Text>
                      </View>
                    )}
                  </View>
                </View>
                <ArrowLeft
                  size={14}
                  color="#999"
                  style={{ transform: [{ rotate: isRTL ? "0deg" : "180deg" }] }}
                />
              </TouchableOpacity>
            </Link>
          )}

          {/* Description compacte */}
          {product.description && (
            <View style={styles.descriptionCard}>
              <Text style={[styles.description, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={3}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Variants Selection */}
          {product.has_variants && product.variants && product.variants.length > 0 && (
            <View style={styles.variantsContainer}>
              {/* Size Selection */}
              {[...new Set(product.variants.map((v: any) => v.size).filter((s: any) => s))].length > 0 && (
                <>
                  <Text style={[styles.variantLabel, isRTL && { textAlign: 'right' }]}>{t("option1")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantScroll}>
                    {[...new Set(product.variants.map((v: any) => v.size).filter((s: any) => s))].map((size: string) => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.sizeButton,
                          selectedSize === size && styles.selectedVariant
                        ]}
                        onPress={() => setSelectedSize(size)}
                      >
                        <Text style={[
                          styles.sizeText,
                          selectedSize === size && styles.selectedVariantText
                        ]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
              
              {/* Color Selection */}
              {[...new Set(product.variants.map((v: any) => v.color).filter((c: any) => c))].length > 0 && (
                <>
                  <Text style={[styles.variantLabel, isRTL && { textAlign: 'right' }]}>{t("option2")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantScroll}>
                    {[...new Set(product.variants.map((v: any) => v.color).filter((c: any) => c))].map((color: string) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.sizeButton,
                          selectedColor === color && styles.selectedVariant
                        ]}
                        onPress={() => setSelectedColor(color)}
                      >
                        <Text style={[
                          styles.sizeText,
                          selectedColor === color && styles.selectedVariantText
                        ]}>
                          {color}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
              
              {/* Stock Info */}
              {(selectedSize || selectedColor) && (
                <View style={styles.stockBadge}>
                  <Text style={[styles.stockText, isRTL && { textAlign: 'right' }]}>
                    <Text>{t('inStock')}: {availableStock}</Text>
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stock et quantité en ligne - Only show for non-variant products */}
          {!product.has_variants && (
            <View style={styles.actionsRow}>
              <View style={styles.stockBadge}>
                <Text style={[styles.stockText, isRTL && { textAlign: 'right' }]}>
                  {product.stock || 0} {t('inStock')}
                </Text>
              </View>

              <View style={styles.quantityControl}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  style={[
                    styles.quantityButton,
                    quantity <= 1 && styles.quantityButtonDisabled,
                  ]}
                >
                  <Minus size={16} color={quantity <= 1 ? "#ccc" : "#000"} />
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setQuantity(Math.min(product.stock || 0, quantity + 1))
                  }
                  disabled={quantity >= (product.stock || 0)}
                  style={[
                    styles.quantityButton,
                    quantity >= (product.stock || 0) &&
                      styles.quantityButtonDisabled,
                  ]}
                >
                  <Plus
                    size={16}
                    color={quantity >= (product.stock || 0) ? "#ccc" : "#000"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Quantity control for variant products */}
          {product.has_variants && (selectedSize || selectedColor) && (
            <View style={styles.actionsRow}>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  style={[
                    styles.quantityButton,
                    quantity <= 1 && styles.quantityButtonDisabled,
                  ]}
                >
                  <Minus size={16} color={quantity <= 1 ? "#ccc" : "#000"} />
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setQuantity(Math.min(availableStock, quantity + 1))
                  }
                  disabled={quantity >= availableStock}
                  style={[
                    styles.quantityButton,
                    quantity >= availableStock &&
                      styles.quantityButtonDisabled,
                  ]}
                >
                  <Plus
                    size={16}
                    color={quantity >= availableStock ? "#ccc" : "#000"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer compact */}
      <View style={styles.footer}>
        {/* Warning message if options not selected */}
        {!canAddToCart() && product.has_variants && (
          <View style={styles.warningBanner}>
            <View style={styles.warningIcon}>
              <Text style={styles.warningIconText}>👆</Text>
            </View>
            <Text style={styles.warningText}>
              {t('selectOptionsFirst')}
            </Text>
          </View>
        )}
        
        <View style={styles.priceRow}>
          <Text style={[styles.totalLabel, isRTL && { textAlign: 'right' }]}>{t('total')}</Text>
          <Text style={[styles.totalPrice, isRTL && { textAlign: 'left' }]}>
            {(product.price * quantity).toLocaleString()} DA
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            !canAddToCart() && styles.addButtonDisabled
          ]}
          onPress={handleAddToCart}
          activeOpacity={0.8}
          disabled={!canAddToCart()}
        >
          <ShoppingCart size={18} color="#fff" />
          <Text style={styles.addButtonText}>{t('addToCartButton')}</Text>
        </TouchableOpacity>
      </View>

      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type="success"
        onHide={() => setShowToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 40,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  imageGalleryContainer: {
    position: "relative",
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.85,
    backgroundColor: "#f5f5f5",
  },
  paginationContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  paginationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  paginationDotActive: {
    backgroundColor: "#fff",
    width: 16,
  },
  content: {
    padding: 12,
    gap: 10,
  },
  mainInfo: {
    gap: 4,
  },
  productName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
    lineHeight: 22,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
  },
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: "#fafafa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  shopAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e5e5e5",
  },
  shopInfo: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  shopName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  verifiedBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
  descriptionCard: {
    padding: 10,
    backgroundColor: "#fafafa",
    borderRadius: 8,
  },
  description: {
    fontSize: 12,
    color: "#666",
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  stockText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 3,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantity: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
    color: "#000",
  },
  footer: {
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
    gap: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#9ca3af",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  warningIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  warningIconText: {
    fontSize: 12,
  },
  warningText: {
    flex: 1,
    color: "#92400e",
    fontSize: 11,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  backToShopButton: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToShopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  variantsContainer: {
    gap: 8,
  },
  variantLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  variantScroll: {
    marginBottom: 6,
  },
  sizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    marginRight: 8,
    minWidth: 44,
    alignItems: "center",
  },
  selectedVariant: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  sizeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  selectedVariantText: {
    color: "#fff",
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedColorBorder: {
    borderColor: "#000",
    borderWidth: 3,
  },
});
