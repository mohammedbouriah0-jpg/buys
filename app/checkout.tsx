import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import { ArrowLeft } from "lucide-react-native"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { ordersAPI } from "@/lib/api"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const { user } = useAuth()
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [wilaya, setWilaya] = useState("")
  const [loading, setLoading] = useState(false)

  // Load user data with wilaya
  useState(() => {
    const loadUserData = async () => {
      try {
        const { userAPI } = await import("@/lib/api")
        const userData = await userAPI.getProfile()
        setAddress(userData.address || "")
        setPhone(userData.phone || "")
        setWilaya(userData.wilaya || "")
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }
    loadUserData()
  })

  const handleOrder = async () => {
    if (!address || !phone || !wilaya) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs")
      return
    }

    setLoading(true)
    try {
      console.log('🛒 [CHECKOUT] Création commande(s)');
      console.log('📦 [CHECKOUT] Nombre de produits:', items.length);
      console.log('📦 [CHECKOUT] Items du panier:', JSON.stringify(items, null, 2));
      
      const orderData = {
        items: items.map(item => {
          console.log('🔍 [CHECKOUT] Item:', {
            product_id: item.product.id,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
          });
          return {
            product_id: parseInt(item.product.id),
            quantity: item.quantity,
            price: item.product.price,
            variant_size: item.selectedSize || null,
            variant_color: item.selectedColor || null,
          };
        }),
        total: totalPrice,
        shipping_address: `${address}, ${wilaya}`,
        phone,
      }
      
      console.log('📤 [CHECKOUT] Données envoyées:', JSON.stringify(orderData, null, 2));

      const result = await ordersAPI.create(orderData)
      
      console.log('✅ [CHECKOUT] Résultat:', result);
      
      const ordersCount = result.orders?.length || 1;
      
      Alert.alert(
        "Commande confirmée",
        ordersCount > 1 
          ? `${ordersCount} commandes ont été créées (une par boutique)`
          : "Votre commande a été passée avec succès !",
        [
          {
            text: "OK",
            onPress: async () => {
              await clearCart()
              router.replace("/(tabs)/commandes")
            },
          },
        ]
      )
    } catch (error: any) {
      console.error("❌ [CHECKOUT] Erreur:", error)
      Alert.alert("Erreur", error.message || "Impossible de passer la commande")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passer la commande</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de livraison</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse complète</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Rue, quartier, ville..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="0555 12 34 56"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wilaya</Text>
              <TextInput
                style={styles.input}
                value={wilaya}
                onChangeText={setWilaya}
                placeholder="Alger, Oran, Constantine..."
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résumé de la commande</Text>
            {items.map(({ product, quantity }) => (
              <View key={product.id} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.orderItemQuantity}>x{quantity}</Text>
                <Text style={styles.orderItemPrice}>
                  {(product.price * quantity).toLocaleString()} DA
                </Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>{totalPrice.toLocaleString()} DA</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.orderButton, loading && styles.orderButtonDisabled]} 
          onPress={handleOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.orderButtonText}>
              Confirmer la commande - {totalPrice.toLocaleString()} DA
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    gap: 12,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: "#8e8e8e",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  orderButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  orderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  orderButtonDisabled: {
    opacity: 0.6,
  },
})
