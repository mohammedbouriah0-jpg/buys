import React, { useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle, User, Phone, MapPin, Calendar, ShoppingBag } from "lucide-react-native"
import { ordersAPI } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ReturnModal } from "@/components/return-modal"
import { useLanguage } from "@/lib/i18n/language-context"

interface OrderDetails {
  id: number
  total_amount: number
  status: string
  created_at: string
  shipping_address: string
  phone: string
  user_name: string
  user_email: string
  items: Array<{
    product_id: number
    product_name: string
    price: number
    quantity: number
    image_url?: string
  }>
}

export default function OrderDetailsPage() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { t, isRTL } = useLanguage()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReturnModal, setShowReturnModal] = useState(false)
  
  const isShop = user?.type === "shop"

  useEffect(() => {
    loadOrderDetails()
  }, [id])

  const loadOrderDetails = async () => {
    try {
      console.log('🔍 [ORDER DETAILS] Début chargement');
      console.log('📋 [ORDER DETAILS] Order ID:', id);
      console.log('👤 [ORDER DETAILS] User:', { id: user?.id, type: user?.type, isShop });
      
      setLoading(true)
      
      console.log('📡 [ORDER DETAILS] Appel API getById...');
      const orderData = await ordersAPI.getById(id as string)
      
      console.log('✅ [ORDER DETAILS] Commande reçue:', orderData);
      setOrder(orderData)
    } catch (error: any) {
      console.error("❌ [ORDER DETAILS] Erreur:", error)
      console.error("❌ [ORDER DETAILS] Message:", error?.message)
      console.error("❌ [ORDER DETAILS] Stack:", error?.stack)
      Alert.alert("Erreur", `Impossible de charger la commande: ${error?.message || 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus: string) => {
    if (!order || !isShop) return
    
    try {
      await ordersAPI.updateStatus(order.id.toString(), newStatus)
      setOrder({ ...order, status: newStatus })
      Alert.alert("Succès", "Statut mis à jour")
    } catch (error) {
      console.error("Failed to update status:", error)
      Alert.alert("Erreur", "Impossible de mettre à jour le statut")
    }
  }

  const getStatusIcon = (status: string, size = 24) => {
    const color = getStatusColor(status)
    switch (status) {
      case 'pending':
        return <Clock size={size} color={color} />
      case 'confirmed':
        return <Package size={size} color={color} />
      case 'shipped':
        return <Truck size={size} color={color} />
      case 'delivered':
        return <CheckCircle size={size} color={color} />
      case 'cancelled':
        return <XCircle size={size} color={color} />
      default:
        return <Clock size={size} color={color} />
    }
  }

  const requestReturn = async (reason: string) => {
    if (!order) return

    try {
      await ordersAPI.requestReturn(order.id.toString(), reason)
      Alert.alert(t("success"), "Le retour a été enregistré avec succès")
      setShowReturnModal(false)
      loadOrderDetails()
    } catch (error: any) {
      Alert.alert(t("error"), error.message || "Impossible d'enregistrer le retour")
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
      case 'return_requested':
        return t('returned')
      case 'returned':
        return t('returned')
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
      case 'return_requested':
        return '#f97316'
      case 'returned':
        return '#6b7280'
      default:
        return '#8e8e8e'
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
        return 'Confirmer la commande'
      case 'confirmed':
        return 'Marquer comme expédiée'
      case 'shipped':
        return 'Marquer comme livrée'
      default:
        return null
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t("orderDetails")}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={[styles.loadingText, isRTL && { textAlign: 'center' }]}>{t("loading")}</Text>
        </View>
      </View>
    )
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("orderDetails")}</Text>
        </View>
        <View style={styles.emptyState}>
          <Package size={80} color="#8e8e8e" />
          <Text style={styles.emptyTitle}>{t("orderNotFound")}</Text>
          <TouchableOpacity style={styles.backToOrdersButton} onPress={() => router.back()}>
            <Text style={styles.backToOrdersButtonText}>{t("backToOrders")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
            {`${t("order")} #${order.id}`}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && { textAlign: 'right' }]}>{formatDate(order.created_at)}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Status Card */}
        <View style={styles.section}>
          <View style={[styles.statusCard, { backgroundColor: `${getStatusColor(order.status)}10` }]}>
            <View style={styles.statusIconContainer}>
              {getStatusIcon(order.status, 32)}
            </View>
            <View style={styles.statusContent}>
              <Text style={[styles.statusLabel, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t("orderStatusLabel")}</Text>
              <Text style={[styles.statusValue, { color: getStatusColor(order.status) }, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Client Info (pour boutiques) */}
        {isShop && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t("clientInfo")}</Text>
            <View style={styles.card}>
              <View style={[styles.infoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.infoIcon}>
                  <User size={20} color="#6b7280" />
                </View>
                <View style={[styles.infoContent, isRTL && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{t("clientName")}</Text>
                  <Text style={[styles.infoValue, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{order.user_name || t("notSpecified")}</Text>
                </View>
              </View>

              {order.user_email && (
                <View style={[styles.infoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={styles.infoIcon}>
                    <User size={20} color="#6b7280" />
                  </View>
                  <View style={[styles.infoContent, isRTL && { alignItems: 'flex-end' }]}>
                    <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{t("email")}</Text>
                    <Text style={[styles.infoValue, isRTL && { textAlign: 'right' }]}>{order.user_email}</Text>
                  </View>
                </View>
              )}

              <View style={[styles.infoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.infoIcon}>
                  <Phone size={20} color="#6b7280" />
                </View>
                <View style={[styles.infoContent, isRTL && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{t("phone")}</Text>
                  <Text style={[styles.infoValue, isRTL && { textAlign: 'right' }]}>{order.phone || t("notSpecified")}</Text>
                </View>
              </View>

              {/* Badge d'avertissement pour clients à risque */}
              {(order as any).returns_count >= 2 && (
                <View style={[styles.warningBadge, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={styles.warningIcon}>
                    <Text style={styles.warningIconText}>⚠️</Text>
                  </View>
                  <View style={[styles.warningContent, isRTL && { alignItems: 'flex-end' }]}>
                    <Text style={[styles.warningTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t("clientToWatch")}</Text>
                    <Text style={[styles.warningText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                      {`${(order as any).returns_count} ${t("returnsCount")}`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Message retour effectué */}
        {(order as any).return_requested && (
          <View style={styles.section}>
            <View style={styles.returnRequestedCard}>
              <View style={styles.returnRequestedIcon}>
                <Text style={styles.returnRequestedIconText}>↩️</Text>
              </View>
              <View style={styles.returnRequestedContent}>
                <Text style={styles.returnRequestedTitle}>
                  {isShop ? 'Retour enregistré' : 'Colis retourné'}
                </Text>
                <Text style={styles.returnRequestedText}>
                  {isShop 
                    ? 'Ce client a retourné cette commande' 
                    : 'Vous avez retourné cette commande'}
                </Text>
                {(order as any).return_reason && (
                  <Text style={styles.returnReason}>
                    {`Raison: ${(order as any).return_reason}`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t("deliveryAddressLabel")}</Text>
          <View style={styles.card}>
            <View style={[styles.infoRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.infoIcon}>
                <MapPin size={20} color="#6b7280" />
              </View>
              <View style={[styles.infoContent, isRTL && { alignItems: 'flex-end' }]}>
                <Text style={[styles.addressText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{order.shipping_address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t("products")}</Text>
          <View style={styles.card}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <View key={index} style={[styles.productItem, index > 0 && styles.productItemBorder]}>
                  <Image
                    source={{ uri: item.image_url || 'https://via.placeholder.com/80' }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    {((item as any).variant_size || (item as any).variant_color) && (
                      <View style={[styles.variantsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        {(item as any).variant_size && (
                          <View style={styles.variantBadge}>
                            <Text style={styles.variantText}>{(item as any).variant_size}</Text>
                          </View>
                        )}
                        {(item as any).variant_color && (
                          <View style={styles.variantBadge}>
                            <Text style={styles.variantText}>{(item as any).variant_color}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <Text style={styles.productQuantity}>{`Quantité: ${item.quantity}`}</Text>
                    <Text style={styles.productPrice}>
                      {`${item.price.toLocaleString()} DA × ${item.quantity}`}
                    </Text>
                  </View>
                  <View style={styles.productTotal}>
                    <Text style={styles.productTotalPrice}>
                      {`${(item.price * item.quantity).toLocaleString()} DA`}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItems}>Aucun produit</Text>
            )}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>{`${order.total_amount.toLocaleString()} DA`}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Livraison</Text>
              <Text style={styles.summaryValue}>Gratuite</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{`${order.total_amount.toLocaleString()} DA`}</Text>
            </View>
          </View>
        </View>

        {/* Order Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique</Text>
          <View style={styles.card}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineIcon}>
                <Calendar size={16} color="#6b7280" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Commande passée</Text>
                <Text style={styles.timelineDate}>{formatDate(order.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons (pour boutiques) */}
        {isShop && (
          <View style={styles.section}>
            {/* Boutons de progression normale */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'return_requested' && (
              <>
                {getNextStatus(order.status) && (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => updateOrderStatus(getNextStatus(order.status)!)}
                  >
                    <Text style={styles.primaryButtonText}>
                      {getNextStatusText(order.status)}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    Alert.alert(
                      "Annuler la commande",
                      "Êtes-vous sûr de vouloir annuler cette commande ?",
                      [
                        { text: "Non", style: "cancel" },
                        { text: "Oui", onPress: () => updateOrderStatus('cancelled') }
                      ]
                    )
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler la commande</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Bouton marquer comme retourné (si livrée et pas déjà retournée) */}
            {order.status === 'delivered' && !(order as any).return_requested && (
              <TouchableOpacity 
                style={styles.returnButton} 
                onPress={() => setShowReturnModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.returnButtonIcon}>
                  <Text style={styles.returnButtonIconText}>↩️</Text>
                </View>
                <View style={styles.returnButtonContent}>
                  <Text style={styles.returnButtonTitle}>Marquer comme retourné</Text>
                  <Text style={styles.returnButtonSubtitle}>Le client a retourné le colis</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Return Modal */}
      <ReturnModal
        visible={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onConfirm={requestReturn}
        customerName={order?.user_name}
        returnsCount={(order as any)?.returns_count || 0}
      />
    </View>
  )
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
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
  backToOrdersButton: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  backToOrdersButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 16,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  addressText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  productItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  productItemBorder: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  variantsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
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
  productQuantity: {
    fontSize: 13,
    color: "#6b7280",
  },
  productPrice: {
    fontSize: 13,
    color: "#6b7280",
  },
  productTotal: {
    justifyContent: "center",
  },
  productTotalPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  noItems: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 8,
    paddingTop: 16,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 13,
    color: "#6b7280",
  },
  primaryButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fbbf24",
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  warningIconText: {
    fontSize: 20,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: "#78350f",
  },
  returnButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f97316",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  returnButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  returnButtonIconText: {
    fontSize: 24,
  },
  returnButtonContent: {
    flex: 1,
  },
  returnButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f97316",
    marginBottom: 2,
  },
  returnButtonSubtitle: {
    fontSize: 13,
    color: "#9a3412",
  },
  returnRequestedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fbbf24",
  },
  returnRequestedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  returnRequestedIconText: {
    fontSize: 24,
  },
  returnRequestedContent: {
    flex: 1,
  },
  returnRequestedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  returnRequestedText: {
    fontSize: 13,
    color: "#78350f",
    marginBottom: 4,
  },
  returnReason: {
    fontSize: 12,
    color: "#78350f",
    fontStyle: "italic",
  },
})
