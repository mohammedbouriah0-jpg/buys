import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { router } from "expo-router"
import { Plus, Package, Palette, Video, ShoppingBag, AlertTriangle, Shield, Receipt, Star } from "lucide-react-native"
import { notificationsAPI } from "@/lib/api"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/config"
import { useLanguage } from "@/lib/i18n/language-context"

export default function GestionPage() {
  const { user } = useAuth()
  const { t, isRTL } = useLanguage()
  const [unreadCount, setUnreadCount] = useState(0)
  const [verificationStatus, setVerificationStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.type === "shop") {
      loadVerificationStatus()
      loadUnreadCount()
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(loadUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadVerificationStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token")
      
      console.log("🔍 Token dans AsyncStorage:", token ? "Existe" : "Null")
      
      if (!token) {
        console.log("⚠️ Pas de token trouvé")
        setVerificationStatus({ is_verified: false, verification_status: null })
        setLoading(false)
        return
      }
      
      console.log("📡 Appel API verification/status...")
      
      const response = await fetch(`${API_URL}/verification/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      console.log("📡 Réponse reçue:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Statut de vérification:", data)
        setVerificationStatus(data)
      } else {
        const error = await response.json()
        console.error("❌ Erreur API:", error)
        setVerificationStatus({ is_verified: false, verification_status: null })
      }
    } catch (error) {
      console.error("❌ Erreur vérification:", error)
      setVerificationStatus({ is_verified: false, verification_status: null })
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const data = await notificationsAPI.getUnreadCount()
      setUnreadCount(data.count)
    } catch (error) {
      console.error("Failed to load unread count:", error)
    }
  }

  if (!user || user.type !== "shop") {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-lg text-gray-600">{t("accessReservedShops")}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  // Si la boutique n'est pas vérifiée, afficher selon le statut
  if (!verificationStatus?.is_verified) {
    const isPending = verificationStatus?.verification_status === "pending"
    const isRejected = verificationStatus?.verification_status === "rejected"
    const hasNoDocument = !verificationStatus?.verification_status || verificationStatus?.verification_status === null

    return (
      <View className="flex-1 bg-amber-50">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-16 pb-8">
            {/* Header moderne */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 mb-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("shopManagement")}</Text>
              <Text className="text-gray-500" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {isPending ? t("verificationPending") : t("verificationRequired")}
              </Text>
            </View>

            {/* État: En attente */}
            {isPending && (
              <View className="bg-white rounded-3xl p-8 mb-6 shadow-lg">
                <View className="items-center mb-6">
                  <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4">
                    <ActivityIndicator size="large" color="#3b82f6" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 mb-3" style={{ textAlign: 'center' }}>
                    {t("requestInProgress")}
                  </Text>
                  <Text className="text-gray-600 leading-6 mb-2" style={{ textAlign: 'center' }}>
                    {t("documentSubmittedSuccess")}
                  </Text>
                  <Text className="text-gray-500 text-sm leading-5" style={{ textAlign: 'center' }}>
                    {t("teamReviewingRequest")}
                  </Text>
                </View>

                <View className="bg-blue-50 rounded-2xl p-4 border-l-4 border-blue-500">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    <Text className="text-blue-900 font-semibold flex-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      {t("processingTime")}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* État: Rejeté */}
            {isRejected && (
              <View className="bg-white rounded-3xl p-8 mb-6 shadow-lg">
                <View className="items-center mb-6">
                  <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-4">
                    <AlertTriangle size={48} color="#ef4444" strokeWidth={2} />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 mb-3" style={{ textAlign: 'center' }}>
                    {t("requestRejected")}
                  </Text>
                  <Text className="text-gray-600 leading-6 mb-6" style={{ textAlign: 'center' }}>
                    {verificationStatus.rejection_reason || t("documentNotMeetCriteria")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/gestion/verification")}
                  className="bg-red-500 py-4 rounded-2xl items-center shadow-md"
                >
                  <Text className="text-white font-bold text-lg" style={{ textAlign: 'center' }}>{t("submitNewDocument")}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* État: Pas de document soumis */}
            {hasNoDocument && (
              <View className="bg-white rounded-3xl p-8 mb-6 shadow-lg">
                <View className="items-center mb-6">
                  <View className="w-24 h-24 bg-amber-100 rounded-full items-center justify-center mb-4">
                    <AlertTriangle size={48} color="#f59e0b" strokeWidth={2} />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 mb-3" style={{ textAlign: 'center' }}>
                    {t("verificationRequired")}
                  </Text>
                  <Text className="text-gray-600 leading-6 mb-6" style={{ textAlign: 'center' }}>
                    {t("verificationRequiredMessage")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/gestion/verification")}
                  className="bg-amber-500 py-4 rounded-2xl items-center shadow-md"
                >
                  <Text className="text-white font-bold text-lg" style={{ textAlign: 'center' }}>{t("sendMyDocument")}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Aperçu des fonctionnalités */}
            <View className="bg-gray-50 rounded-2xl p-5">
              <Text className="text-gray-700 font-bold mb-4 text-base" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("afterVerificationYouCan")}</Text>
              <View className="space-y-3">
                {[
                  { icon: Plus, text: t("addProducts"), color: "#3b82f6" },
                  { icon: Video, text: t("publishVideos"), color: "#8b5cf6" },
                  { icon: ShoppingBag, text: t("manageOrders"), color: "#f97316" },
                  { icon: Package, text: t("trackInventory"), color: "#10b981" },
                ].map((item, index) => (
                  <View key={index} className="items-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <View className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm" style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
                      <item.icon size={20} color={item.color} strokeWidth={2.5} />
                    </View>
                    <Text className="text-gray-700 flex-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-16 pb-8">
          {/* Header moderne */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("shopManagement")}</Text>
            <Text className="text-gray-500" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("manageYourShop")}</Text>
          </View>

          {/* Actions rapides - Grid 2x2 */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("quickActions")}</Text>
            <View className="flex-row flex-wrap gap-3">
              <TouchableOpacity
                onPress={() => router.push("/gestion/add-product")}
                className="flex-1 min-w-[45%] bg-blue-500 rounded-2xl p-5 shadow-lg"
              >
                <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mb-3">
                  <Plus size={24} color="#fff" strokeWidth={2.5} />
                </View>
                <Text className="text-white font-bold text-base mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("newProduct")}</Text>
                <Text className="text-blue-100 text-xs" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("addToCatalog")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/gestion/add-video")}
                className="flex-1 min-w-[45%] bg-purple-500 rounded-2xl p-5 shadow-lg"
              >
                <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mb-3">
                  <Video size={24} color="#fff" strokeWidth={2.5} />
                </View>
                <Text className="text-white font-bold text-base mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("newVideo")}</Text>
                <Text className="text-purple-100 text-xs" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("publishContent")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu principal */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("managementSection")}</Text>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <TouchableOpacity
                onPress={() => router.push("/gestion/products")}
                className="items-center p-4 border-b border-gray-100 active:bg-gray-50"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
              >
                <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center" style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                  <Package size={22} color="#22c55e" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-base" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("myProducts")}</Text>
                  <Text className="text-gray-500 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("manageYourCatalog")}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/gestion/videos")}
                className="items-center p-4 border-b border-gray-100 active:bg-gray-50"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
              >
                <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center" style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                  <Video size={22} color="#a855f7" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-base" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("myVideos")}</Text>
                  <Text className="text-gray-500 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("publishedContent")}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/gestion/orders")}
                className="items-center p-4 border-b border-gray-100 active:bg-gray-50"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
              >
                <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center" style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                  <ShoppingBag size={22} color="#f97316" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-base" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("orders")}</Text>
                  <Text className="text-gray-500 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("manageSales")}</Text>
                </View>
                {unreadCount > 0 && (
                  <View className="bg-red-500 rounded-full min-w-[24px] h-6 items-center justify-center px-2">
                    <Text className="text-white text-xs font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/gestion/customize")}
                className="items-center p-4 border-b border-gray-100 active:bg-gray-50"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
              >
                <View className="w-12 h-12 bg-pink-100 rounded-xl items-center justify-center" style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                  <Palette size={22} color="#ec4899" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-base" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("customize")}</Text>
                  <Text className="text-gray-500 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("shopStyle")}</Text>
                </View>
              </TouchableOpacity>

            </View>
          </View>

          {/* Admin Section (si admin) */}
          {user?.type === 'admin' && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t("administration")}</Text>
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <TouchableOpacity
                  onPress={() => router.push("/admin/dashboard")}
                  className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
                >
                  <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4">
                    <Shield size={22} color="#3b82f6" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">{t("dashboard")}</Text>
                    <Text className="text-gray-500 text-sm">{t("statsAndManagement")}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/admin/verifications")}
                  className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
                >
                  <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center mr-4">
                    <Shield size={22} color="#f97316" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">Vérifications</Text>
                    <Text className="text-gray-500 text-sm">Approuver les boutiques</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/admin/invoices")}
                  className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
                >
                  <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-4">
                    <Receipt size={22} color="#22c55e" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">Factures</Text>
                    <Text className="text-gray-500 text-sm">Gérer les abonnements</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/admin/videos")}
                  className="flex-row items-center p-4 active:bg-gray-50"
                >
                  <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4">
                    <Video size={22} color="#a855f7" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">Modération Vidéos</Text>
                    <Text className="text-gray-500 text-sm">Supprimer contenus inappropriés</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
