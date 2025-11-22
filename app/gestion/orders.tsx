import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Filter,
  PackageX,
} from "lucide-react-native";
import { ordersAPI } from "@/lib/api";
import { ReturnModal } from "@/components/return-modal";

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address: string;
  phone: string;
  user_name: string;
  returns_count?: number;
  return_requested?: boolean;
  items: any[];
}

type FilterType = "all" | "pending" | "delivered" | "returned";

import { useLanguage } from "@/lib/i18n/language-context";

export default function ShopOrdersPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isLoadingRef = React.useRef(false);

  useEffect(() => {
    loadOrders(true);
  }, []);

  const loadOrders = async (reset = false) => {
    // Éviter les chargements multiples
    if (isLoadingRef.current && !reset) return;
    
    try {
      isLoadingRef.current = true;
      
      if (reset) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentPage = reset ? 1 : page;
      console.log('🏪 [GESTION ORDERS] Chargement page:', currentPage);
      
      // Charger avec pagination (5 par page)
      const data = await ordersAPI.getShopOrders(currentPage, 5);
      console.log('✅ [GESTION ORDERS] Commandes reçues:', data.length);
      
      if (reset) {
        setOrders(data);
      } else {
        setOrders(prev => [...prev, ...data]);
      }
      
      // Si moins de 5 résultats, il n'y a plus de pages
      setHasMore(data.length === 5);
      
      if (!reset) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error("❌ [GESTION ORDERS] Erreur:", error);
      Alert.alert(t("error"), t("updateStatusError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(true);
  };

  const handleScroll = (event: any) => {
    if (!hasMore || loadingMore || loading || isLoadingRef.current) return;
    
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100; // Plus de marge pour charger avant d'arriver en bas
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isCloseToBottom) {
      loadOrders(false);
    }
  };

  const handleReturnClick = (order: Order, e: any) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setShowReturnModal(true);
  };

  const requestReturn = async (reason: string) => {
    if (!selectedOrder) return;

    try {
      await ordersAPI.requestReturn(selectedOrder.id.toString(), reason);
      Alert.alert(t("success"), "Le retour a été enregistré");
      setShowReturnModal(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      Alert.alert(
        t("error"),
        error.message || "Impossible d'enregistrer le retour"
      );
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "returned") return order.return_requested;
    return order.status === filter;
  });

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await ordersAPI.updateStatus(orderId.toString(), newStatus);
      // Mettre à jour localement
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      Alert.alert(t("success"), t("statusUpdated"));
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert(t("error"), t("updateStatusError"));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={20} color="#f59e0b" />;
      case "confirmed":
        return <Package size={20} color="#3b82f6" />;
      case "shipped":
        return <Truck size={20} color="#8b5cf6" />;
      case "delivered":
        return <CheckCircle size={20} color="#10b981" />;
      case "cancelled":
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#8e8e8e" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return t("pending");
      case "confirmed":
        return t("confirmed");
      case "shipped":
        return t("shipped");
      case "delivered":
        return t("delivered");
      case "cancelled":
        return t("cancelled");
      case "":
        return t("unknown");
      default:
        return status || t("unknown");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "confirmed":
        return "#3b82f6";
      case "shipped":
        return "#8b5cf6";
      case "delivered":
        return "#10b981";
      case "cancelled":
        return "#ef4444";
      default:
        return "#8e8e8e";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "confirmed";
      case "confirmed":
        return "shipped";
      case "shipped":
        return "delivered";
      default:
        return null;
    }
  };

  const getNextStatusText = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return t("confirmOrder");
      case "confirmed":
        return t("shipOrder");
      case "shipped":
        return t("markDelivered");
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t("orders")}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={[styles.loadingText, { textAlign: isRTL ? 'right' : 'center' }]}>{t("loading")}</Text>
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t("orders")}</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyState}>
            <Package size={80} color="#8e8e8e" />
            <Text style={[styles.emptyTitle, { textAlign: isRTL ? 'right' : 'center' }]}>{t("noOrders")}</Text>
            <Text style={[styles.emptySubtitle, { textAlign: isRTL ? 'right' : 'center' }]}>
              {t("noOrdersSubtitle")}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t("orders")}</Text>
          <Text style={[styles.headerSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {`${filteredOrders.length} ${t("ordersCount")}${filteredOrders.length > 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === "all" && styles.filterChipActive,
              { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
            onPress={() => setFilter("all")}
          >
            <Package size={16} color={filter === "all" ? "#fff" : "#6b7280"} />
            <Text
              style={[
                styles.filterText,
                filter === "all" && styles.filterTextActive,
              ]}
            >
              {t("allOrders")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === "pending" && styles.filterChipActive,
              { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
            onPress={() => setFilter("pending")}
          >
            <Clock
              size={16}
              color={filter === "pending" ? "#fff" : "#f59e0b"}
            />
            <Text
              style={[
                styles.filterText,
                filter === "pending" && styles.filterTextActive,
              ]}
            >
              {t("pendingOrders")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === "delivered" && styles.filterChipActive,
              { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
            onPress={() => setFilter("delivered")}
          >
            <CheckCircle
              size={16}
              color={filter === "delivered" ? "#fff" : "#10b981"}
            />
            <Text
              style={[
                styles.filterText,
                filter === "delivered" && styles.filterTextActive,
              ]}
            >
              {t("deliveredOrders")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === "returned" && styles.filterChipActive,
              { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
            onPress={() => setFilter("returned")}
          >
            <PackageX
              size={16}
              color={filter === "returned" ? "#fff" : "#f97316"}
            />
            <Text
              style={[
                styles.filterText,
                filter === "returned" && styles.filterTextActive,
              ]}
            >
              {t("returnedOrders")}
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
              style={[
                styles.orderCard,
                (order.returns_count || 0) >= 2 && styles.orderCardWarning,
              ]}
              onPress={() => router.push(`/order/${order.id}`)}
              activeOpacity={0.7}
            >
              {(order.returns_count || 0) >= 2 && (
                <View style={styles.riskBadgeCorner}>
                  <Text style={styles.riskBadgeText}>{`⚠️ ${t("risk")}`}</Text>
                </View>
              )}
              <View style={[styles.orderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.orderHeaderLeft}>
                  <Text style={[styles.orderNumber, { textAlign: isRTL ? 'right' : 'left' }]}>{`Commande #${order.id}`}</Text>
                  <Text style={[styles.orderDate, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {formatDate(order.created_at)}
                  </Text>
                </View>
                <View style={[styles.orderHeaderRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {order.return_requested && (
                    <View style={[styles.returnedBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <PackageX size={14} color="#fff" />
                      <Text style={styles.returnedBadgeText}>{t("returned_badge")}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.statusBadge,
                      { 
                        backgroundColor: `${getStatusColor(order.status)}20`,
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      },
                    ]}
                  >
                    {getStatusIcon(order.status)}
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(order.status) },
                      ]}
                    >
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.clientInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.clientIcon}>
                  <User size={16} color="#6b7280" />
                </View>
                <View style={styles.clientDetails}>
                  <Text style={[styles.clientName, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {order.user_name || t("client")}
                  </Text>
                  <Text style={[styles.clientPhone, { textAlign: isRTL ? 'right' : 'left' }]}>{order.phone || "N/A"}</Text>
                </View>
                {(order.returns_count || 0) >= 2 && (
                  <View style={[styles.warningBadgeSmall, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.warningBadgeIcon}>⚠️</Text>
                    <Text style={styles.warningBadgeText}>
                      {`${order.returns_count || 0} ${t("returns")}`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.orderItems}>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, index: number) => (
                    <View key={index} style={styles.orderItemContainer}>
                      <View style={[styles.orderItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.itemName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                          {item.product_name || t("product")}
                        </Text>
                        <Text style={[styles.itemQuantity, { textAlign: isRTL ? 'right' : 'left' }]}>{`x${item.quantity}`}</Text>
                        <Text style={[styles.itemPrice, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {`${(item.price * item.quantity).toLocaleString()} DA`}
                        </Text>
                      </View>
                      {(item.variant_size || item.variant_color) && (
                        <View style={[styles.variantsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                  <Text style={[styles.noItems, { textAlign: isRTL ? 'right' : 'left' }]}>{t("detailsNotAvailable")}</Text>
                )}
              </View>

              <View style={styles.addressContainer}>
                <Text style={[styles.addressLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t("deliveryAddress")}</Text>
                <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                  {order.shipping_address || t("addressNotSpecified")}
                </Text>
              </View>

              <View style={styles.orderFooter}>
                <View style={[styles.totalContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.totalLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t("total")}</Text>
                  <Text style={[styles.totalPrice, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {`${order.total_amount.toLocaleString()} DA`}
                  </Text>
                </View>

                <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {getNextStatus(order.status) && (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(
                          order.id,
                          getNextStatus(order.status)!
                        );
                      }}
                    >
                      <Text style={styles.primaryButtonText}>
                        {getNextStatusText(order.status)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {order.status === "delivered" && !order.return_requested && (
                    <TouchableOpacity
                      style={[styles.returnButtonSmall, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={(e) => handleReturnClick(order, e)}
                    >
                      <PackageX size={16} color="#f97316" /><Text style={styles.returnButtonSmallText}>{t("return_button")}</Text>
                    </TouchableOpacity>
                  )}

                  {order.status !== "cancelled" &&
                    order.status !== "delivered" &&
                    order.status !== "return_requested" && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            t("cancelOrder"),
                            t("cancelOrderConfirm"),
                            [
                              { text: t("no"), style: "cancel" },
                              {
                                text: t("yes"),
                                onPress: () =>
                                  updateOrderStatus(order.id, "cancelled"),
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
                      </TouchableOpacity>
                    )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          
          {loadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={[styles.loadingMoreText, { textAlign: isRTL ? 'right' : 'center' }]}>
                {t('loadingMore')}
              </Text>
            </View>
          )}
          
          {!hasMore && orders.length > 0 && (
            <View style={styles.endMessageContainer}>
              <Text style={[styles.endMessageText, { textAlign: isRTL ? 'right' : 'center' }]}>
                {t('noMoreOrders')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Return Modal */}
      <ReturnModal
        visible={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setSelectedOrder(null);
        }}
        onConfirm={requestReturn}
        customerName={selectedOrder?.user_name}
        returnsCount={selectedOrder?.returns_count || 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
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
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  addressContainer: {
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
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
  orderFooter: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
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
  warningBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  warningBadgeIcon: {
    fontSize: 14,
  },
  warningBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400e",
    letterSpacing: 0.3,
  },
  orderCardWarning: {
    borderWidth: 2,
    borderColor: "#fbbf24",
    backgroundColor: "#fffbeb",
  },
  riskBadgeCorner: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  returnButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#f97316",
  },
  returnButtonSmallText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f97316",
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
});
