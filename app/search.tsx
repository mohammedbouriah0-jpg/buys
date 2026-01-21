import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  Keyboard,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X, ArrowLeft, TrendingUp, Clock, Store, ShoppingBag, Sparkles } from 'lucide-react-native';
import { useLanguage } from '@/lib/i18n/language-context';
import { API_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

type SearchTab = 'products' | 'shops';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  shop_name: string;
}

interface Shop {
  id: number;
  shop_name: string;
  logo_url: string;
  description: string;
  products_count: number;
}

const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT_SEARCHES = 10;

export default function SearchPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const inputRef = useRef<TextInput>(null);
  
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [popularCategories, setPopularCategories] = useState<{name: string, icon: string}[]>([]);
  const [hasEnoughData, setHasEnoughData] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRecentSearches();
    loadTrendingData();
    inputRef.current?.focus();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animation du tab indicator
  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab === 'products' ? 0 : 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Charger les vraies tendances depuis le backend
  const loadTrendingData = async () => {
    try {
      setLoadingTrending(true);
      const response = await fetch(`${API_URL}/products/trending`);
      const data = await response.json();
      
      if (data.trendingSearches && data.trendingSearches.length > 0) {
        setTrendingSearches(data.trendingSearches);
      }
      if (data.popularCategories && data.popularCategories.length > 0) {
        setPopularCategories(data.popularCategories);
      }
      setHasEnoughData(data.hasEnoughData);
    } catch (error) {
      console.error('Error loading trending data:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = async (searchQuery: string) => {
    try {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const removeRecentSearch = async (searchQuery: string) => {
    const updated = recentSearches.filter(s => s !== searchQuery);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setProducts([]);
      setShops([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, activeTab]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;
    
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const response = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        const data = await response.json();
        setProducts(data.products || data || []);
      } else {
        const response = await fetch(`${API_URL}/shops/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        const data = await response.json();
        setShops(data.shops || data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length >= 2) {
      saveRecentSearch(searchQuery);
    }
  };

  const handleProductPress = (product: Product) => {
    saveRecentSearch(query);
    router.push(`/product/${product.id}`);
  };

  const handleShopPress = (shop: Shop) => {
    saveRecentSearch(query);
    router.push(`/shop/${shop.id}`);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/100' }} 
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productShop}>{item.shop_name}</Text>
        <Text style={styles.productPrice}>{item.price?.toLocaleString()} DA</Text>
      </View>
    </TouchableOpacity>
  );

  const renderShopItem = ({ item }: { item: Shop }) => (
    <TouchableOpacity 
      style={styles.shopCard}
      onPress={() => handleShopPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.shopLogo}>
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.shopLogoImage} />
        ) : (
          <Store size={24} color="#6b7280" />
        )}
      </View>
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.shop_name}</Text>
        <Text style={styles.shopDescription} numberOfLines={1}>
          {item.description || 'Boutique sur Buys'}
        </Text>
        <View style={styles.shopMeta}>
          <ShoppingBag size={12} color="#9ca3af" />
          <Text style={styles.shopMetaText}>{item.products_count || 0} produits</Text>
        </View>
      </View>
      <View style={styles.visitButton}>
        <Text style={styles.visitButtonText}>Voir</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSuggestions = () => (
    <Animated.View 
      style={[
        styles.suggestionsContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Recherches récentes */}
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Clock size={16} color="#6b7280" />
              <Text style={styles.sectionTitle}>Récentes</Text>
            </View>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearText}>Effacer</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagsContainer}>
            {recentSearches.slice(0, 6).map((search, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.recentTag}
                onPress={() => handleSearch(search)}
              >
                <Text style={styles.recentTagText}>{search}</Text>
                <TouchableOpacity 
                  onPress={() => removeRecentSearch(search)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={14} color="#9ca3af" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tendances - basées sur les vraies données */}
      {trendingSearches.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <TrendingUp size={16} color="#ef4444" />
              <Text style={styles.sectionTitle}>
                {hasEnoughData ? t('searchTrending') : t('products')}
              </Text>
            </View>
            {!hasEnoughData && (
              <Text style={styles.newAppBadge}>Nouveau</Text>
            )}
          </View>
          <View style={styles.trendingList}>
            {trendingSearches.map((search, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.trendingItem}
                onPress={() => handleSearch(search)}
              >
                <View style={styles.trendingRank}>
                  <Text style={[
                    styles.trendingRankText,
                    index < 3 && hasEnoughData && styles.trendingRankTop
                  ]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={styles.trendingText} numberOfLines={1}>{search}</Text>
                {hasEnoughData && index < 3 && (
                  <Sparkles size={14} color="#f59e0b" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loadingTrending ? (
        <View style={styles.section}>
          <View style={styles.loadingTrending}>
            <ActivityIndicator size="small" color="#9ca3af" />
            <Text style={styles.loadingTrendingText}>{t('loading')}</Text>
          </View>
        </View>
      ) : null}

      {/* Catégories populaires - basées sur les vraies données */}
      {popularCategories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Sparkles size={16} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>{t('searchCategoriesTitle')}</Text>
            </View>
          </View>
          <View style={styles.categoriesGrid}>
            {popularCategories.map((cat, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.categoryChip}
                onPress={() => handleSearch(cat.name)}
              >
                <Text style={styles.categoryChipText}>{cat.icon} {cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );

  const hasResults = query.length >= 2 && (
    (activeTab === 'products' && products.length > 0) ||
    (activeTab === 'shops' && shops.length > 0)
  );

  const noResults = query.length >= 2 && !loading && (
    (activeTab === 'products' && products.length === 0) ||
    (activeTab === 'shops' && shops.length === 0)
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header avec barre de recherche */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <Search size={18} color="#9ca3af" />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchProductsShops')}
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.length >= 2) {
                saveRecentSearch(query);
                Keyboard.dismiss();
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('products')}
          >
            <ShoppingBag size={18} color={activeTab === 'products' ? '#111827' : '#9ca3af'} />
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              {t('searchTabProducts')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('shops')}
          >
            <Store size={18} color={activeTab === 'shops' ? '#111827' : '#9ca3af'} />
            <Text style={[styles.tabText, activeTab === 'shops' && styles.tabTextActive]}>
              {t('searchTabShops')}
            </Text>
          </TouchableOpacity>
          
          {/* Indicator animé */}
          <Animated.View 
            style={[
              styles.tabIndicator,
              {
                transform: [{
                  translateX: tabIndicatorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, width / 2 - 32],
                  })
                }]
              }
            ]}
          />
        </View>
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      ) : query.length < 2 ? (
        renderSuggestions()
      ) : noResults ? (
        <View style={styles.noResultsContainer}>
          <View style={styles.noResultsIcon}>
            <Search size={40} color="#d1d5db" />
          </View>
          <Text style={styles.noResultsTitle}>Aucun résultat</Text>
          <Text style={styles.noResultsText}>
            Essayez avec d'autres mots-clés
          </Text>
        </View>
      ) : activeTab === 'products' ? (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderShopItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#111827',
  },
  tabIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    width: '50%',
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  clearText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  newAppBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  loadingTrending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingTrendingText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentTagText: {
    fontSize: 14,
    color: '#374151',
  },
  trendingList: {
    gap: 4,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 14,
  },
  trendingRank: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
  trendingRankTop: {
    color: '#ef4444',
  },
  trendingText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productShop: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  shopLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shopLogoImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  shopDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shopMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  visitButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  visitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
