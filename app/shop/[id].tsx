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
import { shopsAPI, productsAPI } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/language-context";

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

  useEffect(() => {
    loadShopData();
  }, [id]);

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

      // Récupérer le nombre d'abonnés
      const subscribersCount = await shopsAPI.getSubscribersCount(id as string);
      shopData.subscribers_count = subscribersCount;

      // Vérifier si l'utilisateur est abonné
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

  // Filtrer et trier les produits
  let filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sortBy === "price_asc") {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Simple Header with custom color */}
      <View style={[styles.simpleHeader, { borderBottomColor: `${primaryColor}15` }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: `${primaryColor}10` }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Shop Info Card */}
        <View style={styles.shopCard}>
            {/* Logo with shadow */}
            <View style={styles.logoContainer}>
              {shop.logo_url ? (
                <Image source={{ uri: shop.logo_url }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <ShoppingBag size={32} color="#9ca3af" />
                </View>
              )}
              {shop.verified && (
                <View style={[styles.verifiedBadgeCorner, { backgroundColor: accentColor }]}>
                  <Check size={12} color="#fff" />
                </View>
              )}
            </View>

            {/* Shop Name */}
            <Text style={styles.shopName}>{shop.shop_name}</Text>
            
            {/* Description */}
            {shop.description && (
              <Text style={styles.description} numberOfLines={3}>
                {shop.description}
              </Text>
            )}

            {/* Subscribers Count with custom color */}
            <View style={styles.subscribersContainer}>
              <Text style={[styles.subscribersCount, { color: primaryColor }]}>
                {formatNumber(shop.subscribers_count || 0)}
              </Text>
              <Text style={styles.subscribersLabel}>{t("followers")}</Text>
            </View>

            {/* Subscribe Button with custom color */}
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

        {/* Premium Search & Filters */}
        <View style={styles.filtersSection}>
          {/* Search Bar with gradient */}
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

          {/* Filters Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            {/* View Mode */}
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

            {/* Sort Chips */}
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

          {/* Results Count */}
          <View style={styles.resultsBar}>
            <Text style={styles.resultsCount}>
              {filteredProducts.length} {filteredProducts.length > 1 ? t("products") : t("product")}
            </Text>
          </View>
        </View>

        {/* Products */}
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
                          uri:
                            product.image_url ||
                            "https://via.placeholder.com/200",
                        }}
                        style={styles.cardImage}
                      />
                      {/* Quick Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.cardActionBtn}>
                          <Heart size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      {/* Badge */}
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
                          uri:
                            product.image_url ||
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
                        <TouchableOpacity style={styles.listHeartBtn}>
                          <Heart size={18} color="#d1d5db" />
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
  // Simple Header
  simpleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  // Shop Card - COMPACT & BEAUTIFUL
  shopCard: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logoContainer: {
    alignSelf: "center",
    marginBottom: 8,
    position: "relative",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  shopName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
  },
  // Stats Grid - COMPACT
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
  },
  // Subscribers - COMPACT
  subscribersContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  subscribersCount: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subscribersLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    marginTop: 1,
  },
  // Subscribe Button - COMPACT
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  subscribedButton: {
    backgroundColor: "#6b7280",
    shadowColor: "#6b7280",
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },
  // Filters Section - ULTRA COMPACT
  filtersSection: {
    backgroundColor: "#fff",
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchWrapper: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
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
  // Products Section - ULTRA COMPACT
  productsSection: {
    padding: 10,
    paddingBottom: 24,
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
  // Grid View - COMPACT & BEAUTIFUL
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  premiumCard: {
    width: (width - 36) / 2,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
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
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  trendingText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 10,
  },
  cardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    minHeight: 36,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
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
  // List View - COMPACT
  productsList: {
    gap: 10,
  },
  premiumListCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  listImageContainer: {
    position: "relative",
    width: 100,
    height: 100,
  },
  listImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
  },
  listImageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  listContent: {
    flex: 1,
    padding: 12,
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
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 19,
    marginRight: 6,
  },
  listHeartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
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
