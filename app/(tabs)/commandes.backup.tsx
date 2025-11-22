import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { ShoppingBag, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react-native"
import { useAuth } from "@/lib/auth-context"
import { Link } from "expo-router"
import { ordersAPI } from "@/lib/api"

interface Order {
  id: number
  total?: number
  total_amount?: number
  status: string
  created_at: string
  delivery_address?: string
  shipping_address?: string
  items: any[]
}

export default function CommandesPage() {
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders()
    }
  }, [isAuthenticated])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await ordersAPI.getMyOrders()
      setOrders(data)
    } catch (error) {
      console.error("Failed to load orders:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadOrders()
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
        return 'En attente'
      case 'confirmed':
        return 'Confirmée'
      case 'shipped':
        return 'En livraison'
      case 'delivered':
        return 'Livrée'
      case 'cancelled':
        return 'Annulée'
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
          <Text style={styles.emptyTitle}>Connectez-vous pour voir vos commandes</Text>
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Se connecter</Text>
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
          <Text style={styles.title}>Mes Commandes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    )
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes Commandes</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyState}>
            <ShoppingBag size={80} color="#8e8e8e" />
            <Text style={styles.emptyTitle}>Aucune commande</Text>
            <Text style={styles.emptySubtitle}>
              Vos commandes apparaîtront ici
            </Text>
            <Link href="/" asChild>
              <TouchableOpacity style={styles.shopButton}>
                <Text style={styles.shopButtonText}>Découvrir les boutiques</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Commandes</Text>
        <Text style={styles.subtitle}>{orders.length} commande{orders.length > 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              {/* Header */}
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Text style={styles.orderNumber}>Commande #{order.id}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
                  {getStatusIcon(order.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.orderItems}>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, index: number) => (
                    <View key={index} style={styles.orderItem}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.product_name || 'Produit'}
                      </Text>
                      <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                      <Text style={styles.itemPrice}>
                        {(item.price * item.quantity).toLocaleString()} DA
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItems}>Détails non disponibles</Text>
                )}
              </View>

              {/* Footer */}
              <View style={styles.orderFooter}>
                <View style={styles.addressContainer}>
                  <Text style={styles.addressLabel}>Livraison:</Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {order.shipping_address || order.delivery_address || 'Adresse non disponible'}
                  </Text>
                </View>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalPrice}>
                    {(order.total_amount || order.total || 0).toLocaleString()} DA
                  </Text>
                </View>
              </View>
            </View>
          ))}
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
    padding: 16,
    gap: 16,
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
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: "#6b7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  orderItems: {
    marginBottom: 16,
    gap: 8,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#6b7280",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  noItems: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  orderFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
  },
  addressContainer: {
    gap: 4,
  },
  addressLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  addressText: {
    fontSize: 14,
    color: "#374151",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
})
