import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native"
import { ShoppingBag, Package, Truck, CheckCircle, Clock, XCircle, User, PackageX } from "lucide-react-native"
import { useAuth } from "@/lib/auth-context"
import { Link, useRouter } from "expo-router"
import { ordersAPI } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/language-context"

interface Order {
  id: number
  total?: number
  total_amount?: number
  status: string
  created_at: string
  delivery_address?: string
  shipping_address?: string
  phone?: string
  user_name?: string
  return_requested?: boolean
  items: any[]
}

type FilterType = 'all' | 'pending' | 'delivered' | 'returned'

export default function CommandesPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { t, isRTL } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalOrders, setTotalOrders] = useState<number | null>(null)
  const isLoadingRef = React.useRef(false)

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    if (filter === 'returned') return order.return_requested
    return order.status === filter
  })

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders(true)
      loadTotalCount()
    }
  }, [isAuthenticated])

  const loadTotalCount = async () => {
    try {
      const isShop = user?.type === "shop"
      const result = isShop 
        ? await ordersAPI.getShopOrdersCount()
        : await ordersAPI.getMyOrdersCount()
      setTotalOrders(result.count || 0)
    } catch (error) {
      console.error('Error loading orders count:', error)
    }
  }

  const loadOrders = async (reset = false) => {
    // Éviter les chargements multiples
    if (isLoadingRef.current && !reset) return
    
    try {
      isLoadingRef.current = true
      
      let currentPage: number
      if (reset) {
        setLoading(true)
        currentPage = 1
        setHasMore(true)
      } else {
        setLoadingMore(true)
        currentPage = page + 1 // Incrémenter AVANT le chargement
      }
      
      const isShop = user?.type === "shop"
      console.log("📦 [COMMANDES] Chargement page:", currentPage)
      
      // Charger avec pagination (10 par page)
      const data = isShop 
        ? await ordersAPI.getShopOrders(currentPage, 10) 
        : await ordersAPI.getMyOrders(currentPage, 10)
      
      console.log("✅ [COMMANDES] Commandes reçues:", data.length)
      console.log("📋 [COMMANDES] User ID:", user?.id, "Type:", user?.type)
      
      if (reset) {
        setOrders(data)
        setPage(1)
      } else {
        // Filtrer les doublons par ID
        setOrders(prev => {
          const existingIds = new Set(prev.map(o => o.id))
          const newOrders = data.filter((o: Order) => !existingIds.has(o.id))
          return [...prev, ...newOrders]
        })
        setPage(currentPage)
      }
      
      // Si moins de 10 résultats, il n'y a plus de pages
      setHasMore(data.length === 10)
    } catch (error) {
      console.error("Failed to load orders:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
      isLoadingRef.current = false
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadOrders(true)
  }

  const handleScroll = (event: any) => {
    if (!hasMore || loadingMore || loading || isLoadingRef.current) return
    
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const paddingToBottom = 100 // Plus de marge pour charger avant d'arriver en bas
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom
    
    if (isCloseToBottom) {
      loadOrders(false)
    }
  }

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    const isShop = user?.type === "shop"
    if (!isShop) return
    
    try {
      await ordersAPI.updateStatus(orderId.toString(), newStatus)
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
      Alert.alert(t('success'), t('statusUpdated'))
    } catch (error) {
      console.error("Failed to update status:", error)
      Alert.alert(t('error'), t('updateStatusError'))
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed'
      case 'confirmed':
        return 'shipped'
      case 'shipped':
        return 'delivered'
      default:
        return null
    }
  }

  const getNextStatusText = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return t('confirmOrder')
      case 'confirmed':
        return t('shipOrder')
      case 'shipped':
        return t('markDelivered')
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} color="#f59e0b" />
      case 'confirmed':
        return <Package size={20} color="#3b82f6" />
      case 'shipped':
        return <Truck size={20} color="#8b5cf6" />
      case 'delivered':
        return <CheckCircle size={20} color="#10b981" />
      case 'cancelled':
        return <XCircle size={20} color="#ef4444" />
      default:
        return <Clock size={20} color="#8e8e8e" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('pending')
      case 'confirmed':
        return t('confirmed')
      case 'shipped':
        return t('shipped')
      case 'delivered':
        return t('delivered')
      case 'cancelled':
        return t('cancelled')
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b'
      case 'confirmed':
        return '#3b82f6'
      case 'shipped':
        return '#8b5cf6'
      case 'delivered':
        return '#10b981'
      case 'cancelled':
        return '#ef4444'
      default:
        return '#8e8e8e'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <ShoppingBag size={80} color="#8e8e8e" />
          <Text style={[styles.emptyTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('loginToSeeOrders')}</Text>
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.loginButton}>
              <Text style={styles.loginButtonText}>{t('login')}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
            {user?.type === "shop" ? t('shopOrders') : t('myOrders')}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={[styles.loadingText, isRTL && { textAlign: 'right' }]}>{t('loading')}</Text>
        </View>
      </View>
    )
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
            {user?.type === "shop" ? t('shopOrders') : t('myOrders')}
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyState}>
            <ShoppingBag size={80} color="#8e8e8e" />
            <Text style={[styles.emptyTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('noOrders')}</Text>
            <Text style={[styles.emptySubtitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
              {t('noOrdersSubtitle')}
            </Text>
            {(
              <Link href="/" asChild>
                <TouchableOpacity style={styles.shopButton}>
                  <Text style={styles.shopButtonText}>{t('discoverShops')}</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
          {user?.type === "shop" ? t('shopOrders') : t('myOrders')}
        </Text>
        <Text style={[styles.subtitle, isRTL && { textAlign: 'right' }]}>
          {totalOrders !== null ? totalOrders : orders.length} {t('ordersCount')}
        </Text>
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={[styles.filtersScroll, isRTL && { flexDirection: 'row-reverse' }]}
        >
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive, isRTL && { flexDirection: 'row-reverse' }]}
            onPress={() => setFilter('all')}
          >
            <Package size={16} color={filter === 'all' ? '#fff' : '#6b7280'} />
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              {t('all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'pending' && styles.filterChipActive, isRTL && { flexDirection: 'row-reverse' }]}
            onPress={() => setFilter('pending')}
          >
            <Clock size={16} color={filter === 'pending' ? '#fff' : '#f59e0b'} />
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              {t('pending')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'delivered' && styles.filterChipActive, isRTL && { flexDirection: 'row-reverse' }]}
            onPress={() => setFilter('delivered')}
          >
            <CheckCircle size={16} color={filter === 'delivered' ? '#fff' : '#10b981'} />
            <Text style={[styles.filterText, filter === 'delivered' && styles.filterTextActive]}>
              {t('delivered')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'returned' && styles.filterChipActive, isRTL && { flexDirection: 'row-reverse' }]}
            onPress={() => setFilter('returned')}
          >
            <PackageX size={16} color={filter === 'returned' ? '#fff' : '#f97316'} />
            <Text style={[styles.filterText, filter === 'returned' && styles.filterTextActive]}>
              {t('returned')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {filteredOrders.map((order, index) => (
            <TouchableOpacity 
              key={`order-${order.id}-${index}`} 
              style={styles.orderCard}
              onPress={() => router.push(`/order/${order.id}`)}
              activeOpacity={0.7}
            >
              {/* Header */}
              <View style={[styles.orderHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.orderHeaderLeft}>
                  <Text style={[styles.orderNumber, isRTL && { textAlign: 'right' }]}>
                    {t('orderNumber')}{order.id}
                  </Text>
                  <Text style={[styles.orderDate, isRTL && { textAlign: 'right' }]}>{formatDate(order.created_at)}</Text>
                </View>
                <View style={[styles.orderHeaderRight, isRTL && { flexDirection: 'row-reverse' }]}>
                  {/* Badge RETOURNÉ si applicable */}
                  {order.return_requested === true && (
                    <View style={[styles.returnedBadge, isRTL && { flexDirection: 'row-reverse' }]}>
                      <PackageX size={14} color="#fff" />
                      <Text style={styles.returnedBadgeText}>{t('returned').toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }, isRTL && { flexDirection: 'row-reverse' }]}>
                    {getStatusIcon(order.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Client Info (pour boutiques) */}
              {user?.type === "shop" && order.user_name ? (
                <View style={styles.clientInfo}>
                  <View style={styles.clientIcon}>
                    <User size={16} color="#6b7280" />
                  </View>
                  <View style={styles.clientDetails}>
                    <Text style={styles.clientName}>{order.user_name}</Text>
                    {order.phone ? <Text style={styles.clientPhone}>{order.phone}</Text> : null}
                  </View>
                </View>
              ) : null}

              {/* Items */}
              <View style={styles.orderItems}>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, index: number) => (
                    <View key={index} style={styles.orderItemContainer}>
                      <View style={[styles.orderItem, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={[styles.itemName, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={1}>
                          {item.product_name || t('product')}
                        </Text>
                        <Text style={styles.itemQuantity}>x{item.quantity || 1}</Text>
                        <Text style={[styles.itemPrice, isRTL && { textAlign: 'left' }]}>
                          {((item.price || 0) * (item.quantity || 1)).toLocaleString()} DA
                        </Text>
                      </View>
                      {(item.variant_size || item.variant_color) && (
                        <View style={[styles.variantsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                          {item.variant_size && (
                            <View style={styles.variantBadge}>
                              <Text style={styles.variantText}>{item.variant_size}</Text>
                            </View>
                          )}
                          {item.variant_color && (
                            <View style={styles.variantBadge}>
                              <Text style={styles.variantText}>{item.variant_color}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noItems, isRTL && { textAlign: 'right' }]}>{t('detailsNotAvailable')}</Text>
                )}
              </View>

              {/* Footer */}
              <View style={styles.orderFooter}>
                <View style={styles.addressContainer}>
                  <Text style={[styles.addressLabel, isRTL && { textAlign: 'right' }]}>{t('deliveryAddress')}</Text>
                  <Text style={[styles.addressText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={2}>
                    {order.shipping_address || order.delivery_address || t('addressNotAvailable')}
                  </Text>
                </View>
                <View style={[styles.totalContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.totalLabel, isRTL && { textAlign: 'right' }]}>{t('total')}</Text>
                  <Text style={[styles.totalPrice, isRTL && { textAlign: 'left' }]}>
                    {(order.total_amount || order.total || 0).toLocaleString()} DA
                  </Text>
                </View>

                {/* Action Buttons (pour boutiques) */}
                {user?.type === "shop" ? (
                  <View style={styles.actionButtons}>
                    {getNextStatus(order.status) ? (
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                      >
                        <Text style={styles.primaryButtonText}>
                          {getNextStatusText(order.status)}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    
                    {order.status !== 'cancelled' && order.status !== 'delivered' ? (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          Alert.alert(
                            t('cancelOrder'),
                            t('cancelOrderConfirm'),
                            [
                              { text: t('no'), style: "cancel" },
                              { text: t('yes'), onPress: () => updateOrderStatus(order.id, 'cancelled') }
                            ]
                          )
                        }}
                      >
                        <Text style={styles.cancelButtonText}>{t('cancelOrder')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
          
          {loadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={[styles.loadingMoreText, isRTL && { textAlign: 'right' }]}>
                {t('loadingMore')}
              </Text>
            </View>
          )}
          
          {!hasMore && orders.length > 0 && (
            <View style={styles.endMessageContainer}>
              <Text style={[styles.endMessageText, isRTL && { textAlign: 'right' }]}>
                {t('noMoreOrders')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 12,
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#8e8e8e",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#000",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  shopButton: {
    backgroundColor: "#000",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  shopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
    color: "#6b7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  clientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 10,
  },
  clientIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 1,
  },
  clientPhone: {
    fontSize: 11,
    color: "#6b7280",
  },
  orderItems: {
    marginBottom: 10,
    gap: 6,
  },
  orderItemContainer: {
    gap: 4,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  variantsRow: {
    flexDirection: "row",
    gap: 6,
    paddingLeft: 0,
  },
  variantBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  variantText: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
  },
  itemQuantity: {
    fontSize: 12,
    color: "#6b7280",
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  noItems: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  orderFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 8,
  },
  addressContainer: {
    gap: 2,
  },
  addressLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
  },
  addressText: {
    fontSize: 12,
    color: "#374151",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
  },
  filtersContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 12,
  },
  filtersScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTextActive: {
    color: "#fff",
  },
  filterBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  filterBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
  },
  filterBadgeTextActive: {
    color: "#fff",
  },
  orderHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  returnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f97316",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  returnedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  loadingMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  loadingMoreText: {
    fontSize: 14,
    color: "#6b7280",
  },
  endMessageContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endMessageText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
})
