import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { router } from "expo-router"
import { Plus, Package, Palette, Video, ShoppingBag, AlertTriangle, Shield, Receipt, CreditCard, X, Info } from "lucide-react-native"
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
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Header moderne avec gradient */}
          <View style={{
            backgroundColor: '#667eea',
            paddingTop: 50,
            paddingBottom: 30,
            paddingHorizontal: 16,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24
          }}>
            <Text style={{ 
              fontSize: 26,
              fontWeight: '900',
              color: '#ffffff',
              marginBottom: 6,
              textAlign: isRTL ? 'right' : 'left',
              letterSpacing: 0.5
            }}>{t("shopManagement")}</Text>
            <Text style={{ 
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {isPending ? t("verificationPending") : t("verificationRequired")}
            </Text>
          </View>

          <View style={{ padding: 16, marginTop: -16 }}>
            {/* État: En attente */}
            {isPending && (
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                shadowColor: '#667eea',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 6,
                borderWidth: 1,
                borderColor: '#e0e7ff'
              }}>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#dbeafe',
                    borderRadius: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12
                  }}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                  </View>
                  <Text style={{ 
                    fontSize: 20,
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    {t("requestInProgress")}
                  </Text>
                  <Text style={{ 
                    fontSize: 14,
                    color: '#6b7280',
                    lineHeight: 20,
                    marginBottom: 6,
                    textAlign: 'center'
                  }}>
                    {t("documentSubmittedSuccess")}
                  </Text>
                  <Text style={{ 
                    fontSize: 12,
                    color: '#9ca3af',
                    lineHeight: 18,
                    textAlign: 'center'
                  }}>
                    {t("teamReviewingRequest")}
                  </Text>
                </View>

                <View style={{
                  backgroundColor: '#eff6ff',
                  borderRadius: 12,
                  padding: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: '#3b82f6'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      backgroundColor: '#3b82f6',
                      borderRadius: 3,
                      marginRight: 8
                    }} />
                    <Text style={{ 
                      color: '#1e40af',
                      fontSize: 13,
                      fontWeight: '700',
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {t("processingTime")}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* État: Rejeté */}
            {isRejected && (
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 6,
                borderWidth: 1,
                borderColor: '#fee2e2'
              }}>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#fee2e2',
                    borderRadius: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12
                  }}>
                    <AlertTriangle size={36} color="#ef4444" strokeWidth={2.5} />
                  </View>
                  <Text style={{ 
                    fontSize: 20,
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    {t("requestRejected")}
                  </Text>
                  <Text style={{ 
                    fontSize: 14,
                    color: '#6b7280',
                    lineHeight: 20,
                    marginBottom: 14,
                    textAlign: 'center',
                    paddingHorizontal: 8
                  }}>
                    {verificationStatus.rejection_reason || t("documentNotMeetCriteria")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/gestion/verification")}
                  style={{
                    backgroundColor: '#ef4444',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5
                  }}
                >
                  <Text style={{ 
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: '800',
                    textAlign: 'center'
                  }}>{t("submitNewDocument")}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* État: Pas de document soumis */}
            {hasNoDocument && (
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                shadowColor: '#f59e0b',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 6,
                borderWidth: 1,
                borderColor: '#fef3c7'
              }}>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#fef3c7',
                    borderRadius: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12
                  }}>
                    <AlertTriangle size={36} color="#f59e0b" strokeWidth={2.5} />
                  </View>
                  <Text style={{ 
                    fontSize: 20,
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    {t("verificationRequired")}
                  </Text>
                  <Text style={{ 
                    fontSize: 14,
                    color: '#6b7280',
                    lineHeight: 20,
                    marginBottom: 14,
                    textAlign: 'center',
                    paddingHorizontal: 8
                  }}>
                    {t("verificationRequiredMessage")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/gestion/verification")}
                  style={{
                    backgroundColor: '#f59e0b',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    shadowColor: '#f59e0b',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5
                  }}
                >
                  <Text style={{ 
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: '800',
                    textAlign: 'center'
                  }}>{t("sendMyDocument")}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Aperçu des fonctionnalités */}
            <View style={{
              backgroundColor: '#f9fafb',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e5e7eb'
            }}>
              <Text style={{ 
                fontSize: 14,
                fontWeight: '800',
                color: '#111827',
                marginBottom: 12,
                textAlign: isRTL ? 'right' : 'left'
              }}>{t("afterVerificationYouCan")}</Text>
              <View style={{ gap: 10 }}>
                {[
                  { icon: Plus, text: t("addProducts"), color: "#3b82f6", bg: "#dbeafe" },
                  { icon: Video, text: t("publishVideos"), color: "#8b5cf6", bg: "#f3e8ff" },
                  { icon: ShoppingBag, text: t("manageOrders"), color: "#f97316", bg: "#ffedd5" },
                  { icon: Package, text: t("trackInventory"), color: "#10b981", bg: "#d1fae5" },
                ].map((item, index) => (
                  <View key={index} style={{ 
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center'
                  }}>
                    <View style={{
                      width: 38,
                      height: 38,
                      backgroundColor: item.bg,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: isRTL ? 0 : 10,
                      marginLeft: isRTL ? 10 : 0
                    }}>
                      <item.icon size={20} color={item.color} strokeWidth={2.5} />
                    </View>
                    <Text style={{ 
                      fontSize: 14,
                      color: '#374151',
                      fontWeight: '600',
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left'
                    }}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  // Si la boutique est vérifiée mais l'abonnement est expiré
  if (verificationStatus?.is_verified && !verificationStatus?.is_subscribed) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Header moderne avec gradient rouge */}
          <View style={{
            backgroundColor: '#ef4444',
            paddingTop: 50,
            paddingBottom: 30,
            paddingHorizontal: 16,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24
          }}>
            <Text style={{ 
              fontSize: 26,
              fontWeight: '900',
              color: '#ffffff',
              marginBottom: 6,
              textAlign: isRTL ? 'right' : 'left',
              letterSpacing: 0.5
            }}>{t("shopManagement")}</Text>
            <Text style={{ 
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {t("subscriptionExpired") || "Abonnement expiré"}
            </Text>
          </View>

          <View style={{ padding: 16, marginTop: -16 }}>
            {/* Carte principale d'abonnement expiré */}
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 24,
              marginBottom: 16,
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 8,
              borderWidth: 1,
              borderColor: '#fee2e2'
            }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{
                  width: 80,
                  height: 80,
                  backgroundColor: '#fee2e2',
                  borderRadius: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <CreditCard size={42} color="#ef4444" strokeWidth={2.5} />
                </View>
                
                <Text style={{ 
                  fontSize: 24,
                  fontWeight: '900',
                  color: '#111827',
                  marginBottom: 12,
                  textAlign: 'center'
                }}>
                  {t("subscriptionExpired") || "Abonnement expiré"}
                </Text>
                
                <Text style={{ 
                  fontSize: 16,
                  color: '#6b7280',
                  lineHeight: 24,
                  marginBottom: 12,
                  textAlign: 'center',
                  paddingHorizontal: 12
                }}>
                  {t("subscriptionExpiredMessage") || "Votre abonnement a expiré. Renouvelez-le pour continuer à gérer votre boutique."}
                </Text>
                
                {verificationStatus?.subscription_end_date && (
                  <View style={{
                    backgroundColor: '#fef2f2',
                    borderRadius: 12,
                    padding: 10,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: '#fecaca'
                  }}>
                    <Text style={{ 
                      fontSize: 13,
                      color: '#dc2626',
                      fontWeight: '700'
                    }}>
                      {t("expiredOn") || "Expiré le"} {new Date(verificationStatus.subscription_end_date).toLocaleDateString(isRTL ? 'ar-DZ' : 'fr-FR')}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => router.push("/gestion/subscription")}
                style={{
                  backgroundColor: '#ef4444',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#ef4444',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                  borderWidth: 2,
                  borderColor: '#dc2626'
                }}
              >
                <Text style={{ 
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: '800',
                  textAlign: 'center',
                  letterSpacing: 0.5
                }}>{t("renewSubscription") || "Renouveler mon abonnement"}</Text>
              </TouchableOpacity>
            </View>

            {/* Section Fonctionnalités bloquées */}
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 24,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#e5e7eb'
            }}>
              <View style={{ 
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#fee2e2',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: isRTL ? 0 : 12,
                  marginLeft: isRTL ? 12 : 0
                }}>
                  <AlertTriangle size={22} color="#ef4444" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: 4,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {t("blockedFeatures") || "Fonctionnalités bloquées"}
                  </Text>
                  <Text style={{ 
                    fontSize: 14,
                    color: '#6b7280',
                    lineHeight: 20,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {t("blockedUntilRenewal") || "Ces fonctionnalités sont bloquées jusqu'au renouvellement de votre abonnement"}
                  </Text>
                </View>
              </View>
              
              <View style={{ gap: 12 }}>
                {[
                  { icon: Plus, text: t("addProductsBlocked") || "Ajouter des produits", color: "#ef4444", bg: "#fee2e2" },
                  { icon: Video, text: t("publishVideosBlocked") || "Publier des vidéos", color: "#ef4444", bg: "#fee2e2" },
                  { icon: ShoppingBag, text: t("manageOrdersBlocked") || "Gérer les commandes", color: "#ef4444", bg: "#fee2e2" },
                  { icon: Package, text: t("trackInventoryBlocked") || "Suivre l'inventaire", color: "#ef4444", bg: "#fee2e2" },
                ].map((item, index) => (
                  <View key={index} style={{ 
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    backgroundColor: '#fafafa',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#f3f4f6'
                  }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      backgroundColor: item.bg,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: isRTL ? 0 : 12,
                      marginLeft: isRTL ? 12 : 0,
                      opacity: 0.7
                    }}>
                      <item.icon size={18} color={item.color} strokeWidth={2.5} />
                    </View>
                    <Text style={{ 
                      fontSize: 14,
                      color: '#6b7280',
                      fontWeight: '600',
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left'
                    }}>{item.text}</Text>
                    <X size={16} color="#d1d5db" />
                  </View>
                ))}
              </View>
            </View>

            {/* Carte d'information */}
            <View style={{
              backgroundColor: '#fef3c7',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#fde68a',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center'
            }}>
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#f59e0b',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Info size={18} color="#ffffff" strokeWidth={2.5} />
              </View>
              <Text style={{ 
                fontSize: 13,
                color: '#92400e',
                fontWeight: '600',
                flex: 1,
                lineHeight: 18,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                Renouvelez votre abonnement dès maintenant pour débloquer toutes les fonctionnalités et continuer à gérer votre boutique efficacement.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#f9fafb' }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header compact */}
        <View style={{ 
          backgroundColor: '#ffffff',
          paddingTop: 50,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb'
        }}>
          <Text style={{ 
            fontSize: 28,
            fontWeight: '800',
            color: '#111827',
            textAlign: isRTL ? 'right' : 'left'
          }}>{t("shopManagement")}</Text>
        </View>

        <View style={{ padding: 16 }}>
          {/* Actions rapides - Compact */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.push("/gestion/add-product")}
              style={{ 
                flex: 1,
                backgroundColor: '#3b82f6',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12
              }}
            >
              <View style={{ 
                width: 44,
                height: 44,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Plus size={24} color="#fff" strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: '700',
                  textAlign: isRTL ? 'right' : 'left'
                }}>{t("newProduct")}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/gestion/add-video")}
              style={{ 
                flex: 1,
                backgroundColor: '#a855f7',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12
              }}
            >
              <View style={{ 
                width: 44,
                height: 44,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Video size={24} color="#fff" strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: '700',
                  textAlign: isRTL ? 'right' : 'left'
                }}>{t("newVideo")}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Menu principal - Compact */}
          <View style={{ 
            backgroundColor: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}>
              <TouchableOpacity
                onPress={() => router.push("/gestion/products")}
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6'
                }}
              >
                <View style={{ 
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: '#dcfce7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: isRTL ? 0 : 12, 
                  marginLeft: isRTL ? 12 : 0 
                }}>
                  <Package size={24} color="#16a34a" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#111827',
                    fontSize: 16,
                    fontWeight: '700',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("myProducts")}</Text>
                  <Text style={{ 
                    color: '#9ca3af',
                    fontSize: 13,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("manageYourCatalog")}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/gestion/videos")}
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6'
                }}
              >
                <View style={{ 
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: '#f3e8ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: isRTL ? 0 : 12, 
                  marginLeft: isRTL ? 12 : 0 
                }}>
                  <Video size={24} color="#9333ea" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#111827',
                    fontSize: 16,
                    fontWeight: '700',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("myVideos")}</Text>
                  <Text style={{ 
                    color: '#9ca3af',
                    fontSize: 13,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("publishedContent")}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/gestion/orders")}
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6'
                }}
              >
                <View style={{ 
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: '#ffedd5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: isRTL ? 0 : 12, 
                  marginLeft: isRTL ? 12 : 0 
                }}>
                  <ShoppingBag size={24} color="#ea580c" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#111827',
                    fontSize: 16,
                    fontWeight: '700',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("orders")}</Text>
                  <Text style={{ 
                    color: '#9ca3af',
                    fontSize: 13,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("manageSales")}</Text>
                </View>
                {unreadCount > 0 && (
                  <View style={{
                    backgroundColor: '#ef4444',
                    borderRadius: 12,
                    minWidth: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6
                  }}>
                    <Text style={{ 
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: '700'
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/gestion/customize")}
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  padding: 14
                }}
              >
                <View style={{ 
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: '#fce7f3',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: isRTL ? 0 : 12, 
                  marginLeft: isRTL ? 12 : 0 
                }}>
                  <Palette size={24} color="#db2777" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#111827',
                    fontSize: 16,
                    fontWeight: '700',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("customize")}</Text>
                  <Text style={{ 
                    color: '#9ca3af',
                    fontSize: 13,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t("shopStyle")}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin Section (si admin) */}
          {false && (
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
      </ScrollView>
    </View>
  )
}
