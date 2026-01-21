import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TextInput,
  StatusBar,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import {
  ArrowLeft,
  Search,
  Grid3X3,
  List,
  Check,
  Star,
  ShoppingBag,
  Heart,
  Share2,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import { shopsAPI, productsAPI, getMediaUrl } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/language-context";
import { shareShop } from "@/lib/share-utils";

const { width } = Dimensions.get("window");

export default function ShopPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">(
    "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likedProducts, setLikedProducts] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadShopData();
  }, [id]);

  // Fonction pour liker/unliker un produit
  const handleLikeProduct = async (productId: number, event: any) => {
    event.preventDefault(); // Empêcher la navigation vers le produit
    event.stopPropagation();
    
    const isLiked = likedProducts.has(productId);
    
    // Optimistic update
    setLikedProducts(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });

    try {
      if (isLiked) {
        await productsAPI.unlikeProduct(productId);
      } else {
        await productsAPI.likeProduct(productId);
      }
    } catch (error) {
      // Revert on error
      setLikedProducts(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(productId);
        } else {
          newSet.delete(productId);
        }
        return newSet;
      });
      console.error("Error toggling like:", error);
    }
  };

  const handleSubscribe = async () => {
    try {
      if (isSubscribed) {
        await shopsAPI.unsubscribe(id as string);
        setIsSubscribed(false);
      } else {
        await shopsAPI.subscribe(id as string);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
    }
  };

  const loadShopData = async () => {
    try {
      const [shopData, productsData] = await Promise.all([
        shopsAPI.getById(id as string),
        productsAPI.getAll({ shop_id: Number(id) }),
      ]);

      const subscribersCount = await shopsAPI.getSubscribersCount(id as string);
      shopData.subscribers_count = subscribersCount;

      try {
        const subscriptionStatus = await shopsAPI.checkSubscription(id as string);
        setIsSubscribed(subscriptionStatus.is_subscribed);
      } catch (error) {
        console.log("Not logged in or error checking subscription");
      }

      setShop(shopData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading shop:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num?.toString() || "0";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t("shop")} {t("productNotFound")}</Text>
      </View>
    );
  }

  const primaryColor = shop.primary_color || "#000000";
  const accentColor = shop.accent_color || "#3b82f6";

  let filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sortBy === "price_asc") {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.simpleHeader, { borderBottomColor: `${primaryColor}15` }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: `${primaryColor}10` }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={primaryColor} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: `${primaryColor}10` }]}
          onPress={() => {
            shareShop({
              shopId: Number(id),
              shopName: shop.shop_name,
              description: shop.description,
            });
          }}
        >
          <Share2 size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shopCard}>
            <View style={styles.logoContainer}>
              {shop.logo_url ? (
                <Image source={{ uri: getMediaUrl(shop.logo_url) }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <ShoppingBag size={32} color="#9ca3af" />
                </View>
              )}
              {!!shop.verified && (
                <View style={[styles.verifiedBadgeCorner, { backgroundColor: accentColor }]}>
                  <Check size={12} color="#fff" />
                </View>
              )}
            </View>

            <Text style={styles.shopName}>{shop.shop_name}</Text>
            
            {shop.description && (
              <Text style={styles.description} numberOfLines={3}>
                {shop.description}
              </Text>
            )}

            <View style={styles.subscribersContainer}>
              <Text style={[styles.subscribersCount, { color: primaryColor }]}>
                {formatNumber(shop.subscribers_count || 0)}
              </Text>
              <Text style={styles.subscribersLabel}>{t("followers")}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.subscribeButton,
                { backgroundColor: isSubscribed ? "#6b7280" : accentColor, shadowColor: isSubscribed ? "#6b7280" : accentColor },
              ]}
              onPress={handleSubscribe}
            >
              <Heart size={20} color="#fff" fill={isSubscribed ? "#fff" : "none"} />
              <Text style={styles.subscribeButtonText}>
                {isSubscribed ? t("unfollow") : t("follow")}
              </Text>
            </TouchableOpacity>
          </View>

        <View style={styles.filtersSection}>
          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Search size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder={t("searchProducts")}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text style={styles.clearButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            <View style={styles.viewModeContainer}>
              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  viewMode === "grid" && [styles.viewModeBtnActive, { backgroundColor: `${accentColor}15` }],
                ]}
                onPress={() => setViewMode("grid")}
              >
                <Grid3X3
                  size={16}
                  color={viewMode === "grid" ? accentColor : "#6b7280"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  viewMode === "list" && [styles.viewModeBtnActive, { backgroundColor: `${accentColor}15` }],
                ]}
                onPress={() => setViewMode("list")}
              >
                <List
                  size={16}
                  color={viewMode === "list" ? accentColor : "#6b7280"}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.filterChip,
                sortBy === "default" && [styles.filterChipActive, { backgroundColor: accentColor }],
              ]}
              onPress={() => setSortBy("default")}
            >
              <TrendingUp size={16} color={sortBy === "default" ? "#fff" : "#6b7280"} />
              <Text
                style={[
                  styles.filterChipText,
                  sortBy === "default" && styles.filterChipTextActive,
                ]}
              >
                {t("popular")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                sortBy === "price_asc" && [styles.filterChipActive, { backgroundColor: accentColor }],
              ]}
              onPress={() => setSortBy("price_asc")}
            >
              <Text
                style={[
                  styles.filterChipIcon,
                  sortBy === "price_asc" && styles.filterChipTextActive,
                ]}
              >
                ↑
              </Text>
              <Text
                style={[
                  styles.filterChipText,
                  sortBy === "price_asc" && styles.filterChipTextActive,
                ]}
              >
                {t("lowPrice")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                sortBy === "price_desc" && [styles.filterChipActive, { backgroundColor: accentColor }],
              ]}
              onPress={() => setSortBy("price_desc")}
            >
              <Text
                style={[
                  styles.filterChipIcon,
                  sortBy === "price_desc" && styles.filterChipTextActive,
                ]}
              >
                ↓
              </Text>
              <Text
                style={[
                  styles.filterChipText,
                  sortBy === "price_desc" && styles.filterChipTextActive,
                ]}
              >
                {t("highPrice")}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.resultsBar}>
            <Text style={styles.resultsCount}>
              {filteredProducts.length} {filteredProducts.length > 1 ? t("products") : t("product")}
            </Text>
          </View>
        </View>

        <View style={styles.productsSection}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <ShoppingBag size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>{t("noProductsAvailable")}</Text>
              {searchQuery && (
                <Text style={styles.emptySubtext}>
                  {t("search")}...
                </Text>
              )}
            </View>
          ) : viewMode === "grid" ? (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product, index) => (
                <Link key={product.id} href={`/product/${product.id}`} asChild>
                  <TouchableOpacity
                    style={styles.premiumCard}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image
                        source={{
                          uri: getMediaUrl(product.image_url) ||
                            "https://via.placeholder.com/200",
                        }}
                        style={styles.cardImage}
                      />
                      <TouchableOpacity 
                        style={[
                          styles.likeButton,
                          likedProducts.has(product.id) && styles.likeButtonActive
                        ]}
                        onPress={(e) => handleLikeProduct(product.id, e)}
                        activeOpacity={0.8}
                      >
                        <Heart 
                          size={18} 
                          color={likedProducts.has(product.id) ? "#fff" : "#ef4444"} 
                          fill={likedProducts.has(product.id) ? "#fff" : "transparent"}
                        />
                      </TouchableOpacity>
                      {index < 3 && (
                        <View style={[styles.trendingBadge, { backgroundColor: accentColor }]}>
                          <Zap size={10} color="#fff" />
                          <Text style={styles.trendingText}>HOT</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <View style={styles.cardFooter}>
                        <Text style={[styles.cardPrice, { color: accentColor }]}>
                          {product.price.toLocaleString()} DA
                        </Text>
                        <View style={styles.cardRating}>
                          <Star size={12} color="#fbbf24" fill="#fbbf24" />
                          <Text style={styles.cardRatingText}>4.8</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          ) : (
            <View style={styles.productsList}>
              {filteredProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} asChild>
                  <TouchableOpacity style={styles.premiumListCard} activeOpacity={0.9}>
                    <View style={styles.listImageContainer}>
                      <Image
                        source={{
                          uri: getMediaUrl(product.image_url) ||
                            "https://via.placeholder.com/200",
                        }}
                        style={styles.listImage}
                      />
                    </View>
                    <View style={styles.listContent}>
                      <View style={styles.listHeader}>
                        <Text style={styles.listName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <TouchableOpacity 
                          style={[
                            styles.listHeartBtn,
                            likedProducts.has(product.id) && styles.listHeartBtnActive
                          ]}
                          onPress={(e) => handleLikeProduct(product.id, e)}
                        >
                          <Heart 
                            size={18} 
                            color={likedProducts.has(product.id) ? "#fff" : "#ef4444"} 
                            fill={likedProducts.has(product.id) ? "#fff" : "transparent"}
                          />
                        </TouchableOpacity>
                      </View>
                      {product.description && (
                        <Text style={styles.listDescription} numberOfLines={2}>
                          {product.description}
                        </Text>
                      )}
                      <View style={styles.listFooter}>
                        <Text style={[styles.listPrice, { color: accentColor }]}>
                          {product.price.toLocaleString()} DA
                        </Text>
                        <View style={styles.listRating}>
                          <Star size={14} color="#fbbf24" fill="#fbbf24" />
                          <Text style={styles.listRatingText}>4.8</Text>
                          <Text style={styles.listReviews}>(45)</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 100,
  },
  scrollView: {
    flex: 1,
  },
  simpleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 48 : 36,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  shopCard: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  logoContainer: {
    alignSelf: "center",
    marginBottom: 6,
    position: "relative",
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoPlaceholder: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadgeCorner: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  shopName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 8,
  },
  subscribersContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  subscribersCount: {
    fontSize: 18,
    fontWeight: "800",
  },
  subscribersLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 0,
  },
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  subscribeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  filtersSection: {
    backgroundColor: "#fff",
    paddingTop: 6,
    paddingBottom: 4,
  },
  searchWrapper: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  clearButton: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  filtersScroll: {
    marginBottom: 6,
  },
  filtersContent: {
    paddingHorizontal: 14,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  viewModeContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  viewModeBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  viewModeBtnActive: {
    backgroundColor: "#fff",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    borderColor: "transparent",
  },
  filterChipIcon: {
    fontSize: 14,
    fontWeight: "900",
    color: "#6b7280",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  resultsBar: {
    paddingHorizontal: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  resultsCount: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  productsSection: {
    padding: 8,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9ca3af",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#d1d5db",
    marginTop: 6,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  premiumCard: {
    width: (width - 30) / 2,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
  },
  cardActions: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  cardActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  likeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: "#fee2e2",
  },
  likeButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  trendingBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendingText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fff",
  },
  cardContent: {
    padding: 8,
  },
  cardName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    minHeight: 30,
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cardRatingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
  },
  productsList: {
    gap: 10,
  },
  premiumListCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  listImageContainer: {
    position: "relative",
    width: 85,
    height: 85,
  },
  listImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
  },
  listContent: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  listName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 17,
    marginRight: 4,
  },
  listHeartBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fee2e2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listHeartBtnActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  listDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
    marginBottom: 6,
  },
  listFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listPrice: {
    fontSize: 14,
    fontWeight: "800",
  },
  listRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  listRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  listReviews: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
});
