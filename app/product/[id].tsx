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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Minus, Plus, ShoppingCart, ChevronRight } from "lucide-react-native";
import { useCart } from "@/lib/cart-context";
import { productsAPI, getMediaUrl } from "@/lib/api";
import { Toast } from "@/components/toast-notification";
import { useLanguage } from "@/lib/i18n/language-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper pour convertir n'importe quelle valeur en string safe
const safeString = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Si c'est un objet de traduction, prendre la première valeur
    if (value.fr) return String(value.fr);
    if (value.en) return String(value.en);
    if (value.ar) return String(value.ar);
    return fallback;
  }
  return String(value);
};

const safeNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadProduct();
  }, [id]);
  
  useEffect(() => {
    if (product?.has_variants && product?.variants) {
      const hasSizes = product.variants.some((v: any) => v.size);
      const hasColors = product.variants.some((v: any) => v.color);
      
      if (hasSizes && hasColors) {
        if (selectedSize && selectedColor) {
          const variant = product.variants.find(
            (v: any) => v.size === selectedSize && v.color === selectedColor
          );
          setAvailableStock(variant?.stock || 0);
        }
      } else if (hasSizes && !hasColors) {
        if (selectedSize) {
          const variant = product.variants.find((v: any) => v.size === selectedSize);
          setAvailableStock(variant?.stock || 0);
        }
      } else if (!hasSizes && hasColors) {
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
          <Text style={[styles.errorText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{safeString(t('productNotFound'), 'Produit non trouvé')}</Text>
          <TouchableOpacity
            style={styles.backToShopButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToShopButtonText}>{safeString(t('back'), 'Retour')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Debug: Log product data to find issues
  console.log('📦 Product data:', {
    id: product.id,
    name: typeof product.name,
    price: typeof product.price,
    description: typeof product.description,
    shop_name: typeof product.shop_name,
    has_variants: product.has_variants,
    variants: product.variants?.length || 0
  });

  // Validation: Ensure product is a valid object
  if (typeof product !== 'object' || Array.isArray(product)) {
    console.error('❌ Invalid product data type:', typeof product);
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur de données</Text>
          <TouchableOpacity style={styles.backToShopButton} onPress={() => router.back()}>
            <Text style={styles.backToShopButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
    
    const message = quantity > 1 
      ? `✨ ${quantity} ${safeString(t('products'), 'produits')} ${safeString(t('addToCart'), 'ajouté')}!`
      : `✨ ${safeString(t('product'), 'Produit')} ${safeString(t('addToCart'), 'ajouté')}!`;
    setToastMessage(message);
    setShowToast(true);
    
    setTimeout(() => {
      router.push("/(tabs)/panier");
    }, 1500);
  };

  return (
    <View style={styles.container}>
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
                source={{ uri: getMediaUrl(item.image_url) }}
                style={styles.productImage}
                resizeMode="cover"
              />
            )}
            keyExtractor={(_, index) => index.toString()}
          />

          {!!(product.images && product.images.length > 1) && (
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
          <View style={styles.mainInfo}>
            <Text style={[styles.productName, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={2}>
              {safeString(product.name, 'Produit')}
            </Text>
            <Text style={[styles.productPrice, isRTL && { textAlign: 'right' }]}>
              {safeNumber(product.price).toLocaleString()} DA
            </Text>
          </View>

          {!!product.shop_id && (
            <Link href={`/shop/${product.shop_id}`} asChild>
              <TouchableOpacity 
                style={[styles.shopCard, isRTL && { flexDirection: 'row-reverse' }]}
                activeOpacity={0.7}
              >
                <View style={[styles.shopLeftSection, isRTL && { flexDirection: 'row-reverse' }]}>
                  {!!product.shop_logo ? (
                    <Image
                      source={{ uri: getMediaUrl(product.shop_logo) }}
                      style={styles.shopAvatar}
                    />
                  ) : (
                    <View style={[styles.shopAvatar, styles.shopAvatarPlaceholder]}>
                      <Text style={styles.shopAvatarText}>
                        {safeString(product.shop_name, 'B').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.shopName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                    {safeString(product.shop_name, safeString(t('shop'), 'Boutique'))}
                  </Text>
                  {product.verified === true && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.shopRightSection, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.shopSubtitle}>
                    {t('viewShop') || 'Voir la boutique'}
                  </Text>
                  <ChevronRight
                    size={14}
                    color="#3b82f6"
                    style={isRTL ? { transform: [{ rotate: '180deg' }] } : undefined}
                  />
                </View>
              </TouchableOpacity>
            </Link>
          )}

          {!!product.description && (
            <View style={styles.descriptionCard}>
              <Text style={[styles.description, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={3}>
                {safeString(product.description)}
              </Text>
            </View>
          )}

          {!!(product.has_variants && product.variants && product.variants.length > 0) && (
            <View style={styles.variantsContainer}>
              {(() => {
                const sizes: string[] = [...new Set(product.variants.map((v: any) => v.size).filter((s: any) => s && typeof s === 'string'))] as string[];
                if (sizes.length === 0) return null;
                return (
                  <View>
                    <Text style={[styles.variantLabel, isRTL && { textAlign: 'right' }]}>{safeString(t("option1"), 'Taille')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantScroll}>
                      {sizes.map((size) => (
                        <TouchableOpacity
                          key={safeString(size, 'size')}
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
                            {safeString(size)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}
              
              {(() => {
                const colors: string[] = [...new Set(product.variants.map((v: any) => v.color).filter((c: any) => c && typeof c === 'string'))] as string[];
                if (colors.length === 0) return null;
                return (
                  <View>
                    <Text style={[styles.variantLabel, isRTL && { textAlign: 'right' }]}>{safeString(t("option2"), 'Couleur')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantScroll}>
                      {colors.map((color) => (
                        <TouchableOpacity
                          key={safeString(color, 'color')}
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
                            {safeString(color)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}
              
              {!!(selectedSize || selectedColor) && (
                <View style={styles.stockBadge}>
                  <Text style={[styles.stockText, isRTL && { textAlign: 'right' }]}>
                    {safeString(t('inStock'), 'En stock')}: {safeNumber(availableStock)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!product.has_variants && (
            <View style={styles.actionsRow}>
              <View style={styles.stockBadge}>
                <Text style={[styles.stockText, isRTL && { textAlign: 'right' }]}>
                  {safeNumber(availableStock)} {safeString(t('inStock'), 'en stock')}
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
                <Text style={styles.quantity}>{safeString(quantity, '1')}</Text>
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
          
          {!!(product.has_variants && (selectedSize || selectedColor)) && (
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
                <Text style={styles.quantity}>{safeString(quantity, '1')}</Text>
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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        {!!(!canAddToCart() && product.has_variants) && (
          <View style={styles.warningBanner}>
            <View style={styles.warningIcon}>
              <Text style={styles.warningIconText}>👆</Text>
            </View>
            <Text style={styles.warningText}>
              {safeString(t('selectOptionsFirst'), 'Sélectionnez les options')}
            </Text>
          </View>
        )}
        
        <View style={styles.priceRow}>
          <Text style={[styles.totalLabel, isRTL && { textAlign: 'right' }]}>{safeString(t('total'), 'Total')}</Text>
          <Text style={[styles.totalPrice, isRTL && { textAlign: 'left' }]}>
            {(safeNumber(product.price) * quantity).toLocaleString()} DA
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
          <Text style={styles.addButtonText}>{safeString(t('addToCartButton'), 'Ajouter au panier')}</Text>
        </TouchableOpacity>
      </View>

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
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  shopLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  shopRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shopAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  shopAvatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3b82f6",
  },
  shopAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  shopName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },
  shopSubtitle: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
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
});
