import React, { useState, useEffect } from "react"
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
import { ArrowLeft, Tag, X, Check, Gift } from "lucide-react-native"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import SafeBottomButton from "@/components/safe-bottom-button"
import { SafeBottomContainer } from "@/components/safe-bottom-container"
import { WilayaSelector } from "@/components/wilaya-selector"
import { ordersAPI } from "@/lib/api"
import { API_URL } from "@/config"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface PromoValidation {
  valid: boolean
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  discount_amount: number
  original_amount: number
  final_amount: number
  influencer_name?: string
  description?: string
}

interface WelcomeCode {
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  max_discount?: number
  description?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const { user } = useAuth()
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [wilaya, setWilaya] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [promoCode, setPromoCode] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null)
  const [promoError, setPromoError] = useState("")
  const [isNewUser, setIsNewUser] = useState(false)
  const [welcomeCode, setWelcomeCode] = useState<WelcomeCode | null>(null)

  const finalTotal = promoValidation ? promoValidation.final_amount : totalPrice
  const discountAmount = promoValidation ? promoValidation.discount_amount : 0

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token")
        
        const { userAPI } = await import("@/lib/api")
        const userData = await userAPI.getProfile()
        setAddress(userData.address || "")
        setPhone(userData.phone || "")
        setWilaya(userData.wilaya || "")
        
        if (token) {
          const response = await fetch(`${API_URL}/promo-codes/check-new-user`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (response.ok) {
            const data = await response.json()
            setIsNewUser(data.is_new_user)
            if (data.welcome_code) {
              setWelcomeCode(data.welcome_code)
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }
    loadData()
  }, [])

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError("Entrez un code promo")
      return
    }

    setPromoLoading(true)
    setPromoError("")
    setPromoValidation(null)

    try {
      const token = await AsyncStorage.getItem("auth_token")
      const response = await fetch(`${API_URL}/promo-codes/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: promoCode.trim(),
          order_amount: totalPrice,
          applies_to: "products"
        })
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setPromoValidation(data)
        setPromoError("")
      } else {
        setPromoError(data.error || "Code invalide")
        setPromoValidation(null)
      }
    } catch (error) {
      console.error("Promo validation error:", error)
      setPromoError("Erreur de validation")
    } finally {
      setPromoLoading(false)
    }
  }

  const applyWelcomeCode = () => {
    if (welcomeCode) {
      setPromoCode(welcomeCode.code)
      setTimeout(() => validatePromoCode(), 100)
    }
  }

  const clearPromoCode = () => {
    setPromoCode("")
    setPromoValidation(null)
    setPromoError("")
  }

  const handleOrder = async () => {
    if (!address || !phone || !wilaya) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs")
      return
    }

    setLoading(true)
    try {
      // Save wilaya to profile
      try {
        const { userAPI } = await import("@/lib/api")
        const formData = new FormData()
        formData.append("phone", phone)
        formData.append("address", address)
        formData.append("wilaya", wilaya)
        await userAPI.updateProfile(formData)
      } catch (error) {
        console.log("Erreur sauvegarde wilaya:", error)
      }

      console.log('🛒 [CHECKOUT] Création commande(s)')
      
      const orderData = {
        items: items.map(item => ({
          product_id: parseInt(item.product.id),
          quantity: item.quantity,
          price: item.product.price,
          variant_size: item.selectedSize || null,
          variant_color: item.selectedColor || null,
        })),
        total: finalTotal,
        shipping_address: `${address}, ${wilaya}`,
        phone,
        promo_code: promoValidation?.code || null,
        discount_amount: discountAmount
      }

      const result = await ordersAPI.create(orderData)
      const ordersCount = result.orders?.length || 1
      
      Alert.alert(
        "Commande confirmée",
        ordersCount > 1 
          ? `${ordersCount} commandes ont été créées (une par boutique)`
          : "Votre commande a été passée avec succès !",
        [{
          text: "OK",
          onPress: async () => {
            await clearCart()
            router.replace("/(tabs)/commandes")
          },
        }]
      )
    } catch (error: any) {
      console.error("❌ [CHECKOUT] Erreur:", error)
      Alert.alert("Erreur", error.message || "Impossible de passer la commande")
    } finally {
      setLoading(false)
    }
  }


  return (
    <SafeBottomContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passer la commande</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Welcome banner for new users */}
          {isNewUser && welcomeCode && !promoValidation && (
            <TouchableOpacity style={styles.welcomeBanner} onPress={applyWelcomeCode}>
              <Gift size={20} color="#fff" />
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeTitle}>🎉 Bienvenue !</Text>
                <Text style={styles.welcomeText}>
                  Utilisez le code {welcomeCode.code} pour{" "}
                  {welcomeCode.discount_type === "percentage" 
                    ? `${welcomeCode.discount_value}% de réduction`
                    : `${welcomeCode.discount_value} DA de réduction`}
                </Text>
              </View>
              <Text style={styles.welcomeApply}>Appliquer</Text>
            </TouchableOpacity>
          )}

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
              <WilayaSelector
                value={wilaya}
                onChange={setWilaya}
                label="Wilaya de livraison *"
                placeholder="Sélectionner votre wilaya"
              />
            </View>
          </View>

          {/* Promo Code Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Code promo</Text>
            
            {promoValidation ? (
              <View style={styles.promoApplied}>
                <View style={styles.promoAppliedLeft}>
                  <Check size={20} color="#22c55e" />
                  <View>
                    <Text style={styles.promoAppliedCode}>{promoValidation.code}</Text>
                    <Text style={styles.promoAppliedDiscount}>
                      -{promoValidation.discount_amount.toLocaleString()} DA
                      {promoValidation.influencer_name && ` • ${promoValidation.influencer_name}`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={clearPromoCode} style={styles.promoRemove}>
                  <X size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promoInputContainer}>
                <View style={styles.promoInputWrapper}>
                  <Tag size={18} color="#9ca3af" style={styles.promoIcon} />
                  <TextInput
                    style={styles.promoInput}
                    value={promoCode}
                    onChangeText={(text) => {
                      setPromoCode(text.toUpperCase())
                      setPromoError("")
                    }}
                    placeholder="Entrez votre code"
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.promoButton, promoLoading && styles.promoButtonDisabled]}
                  onPress={validatePromoCode}
                  disabled={promoLoading}
                >
                  {promoLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.promoButtonText}>Appliquer</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {promoError ? (
              <Text style={styles.promoError}>{promoError}</Text>
            ) : null}
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

            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Sous-total</Text>
              <Text style={styles.subtotalPrice}>{totalPrice.toLocaleString()} DA</Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>Réduction ({promoValidation?.code})</Text>
                <Text style={styles.discountPrice}>-{discountAmount.toLocaleString()} DA</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>{finalTotal.toLocaleString()} DA</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeBottomButton
        onPress={handleOrder}
        title={`Confirmer - ${finalTotal.toLocaleString()} DA`}
        loading={loading}
        variant="black"
      />
    </SafeBottomContainer>
  )
}


const styles = StyleSheet.create({
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
    color: "#000",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  welcomeText: {
    color: "#d1d5db",
    fontSize: 13,
    marginTop: 2,
  },
  welcomeApply: {
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  promoInputContainer: {
    flexDirection: "row",
    gap: 10,
  },
  promoInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  promoIcon: {
    marginLeft: 12,
  },
  promoInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: "#000",
  },
  promoButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  promoButtonDisabled: {
    opacity: 0.6,
  },
  promoButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  promoError: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: 8,
  },
  promoApplied: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    padding: 12,
  },
  promoAppliedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  promoAppliedCode: {
    fontWeight: "700",
    color: "#166534",
    fontSize: 15,
  },
  promoAppliedDiscount: {
    color: "#15803d",
    fontSize: 13,
  },
  promoRemove: {
    padding: 6,
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
    color: "#000",
  },
  orderItemQuantity: {
    fontSize: 14,
    color: "#8e8e8e",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
  },
  subtotalLabel: {
    fontSize: 15,
    color: "#6b7280",
  },
  subtotalPrice: {
    fontSize: 15,
    color: "#6b7280",
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  discountLabel: {
    fontSize: 15,
    color: "#22c55e",
  },
  discountPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#22c55e",
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
    color: "#000",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
})
