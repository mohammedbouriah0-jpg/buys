import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogOut, Edit, Mail, Phone, MapPin, Store, CheckCircle, Lock, Heart, Headphones } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/lib/i18n/language-context";
import { API_URL } from "@/config";
import { getMediaUrl } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileModern() {
  const { user, logout, refreshUser, isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [verificationStatus, setVerificationStatus] = React.useState<any>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(false);
  const [supportActive, setSupportActive] = React.useState(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
      loadSupportStatus();
      if (user?.type === "shop") {
        loadVerificationStatus();
      }
    }
  }, []);

  const loadSupportStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/support/info`);
      if (response.ok) {
        const data = await response.json();
        // Si on a des contacts, le support est actif
        setSupportActive(data.contacts && data.contacts.length > 0);
      }
    } catch (error) {
      console.error("Erreur chargement support:", error);
    }
  };

  const loadVerificationStatus = async () => {
    try {
      setLoadingStatus(true);
      const token = await AsyncStorage.getItem("auth_token");
      
      const response = await fetch(`${API_URL}/verification/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
      }
    } catch (error) {
      console.error("Erreur chargement statut:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const isShop = user?.type === "shop";

  console.log('🎨 Profile Modern loaded');
  console.log('  - isShop:', isShop);
  console.log('  - user name:', user?.name);
  console.log('  - user avatar:', user?.avatar);
  console.log('  - user shopLogo:', user?.shopLogo);
  console.log('  - Full user object:', JSON.stringify(user, null, 2));

  return (
    <View style={styles.container}>
      {/* Header fixe */}
      <View style={styles.header}>
        {/* Bouton Edit */}
        <TouchableOpacity
          onPress={() => router.push("/edit-profile-modern")}
          style={styles.editButton}
        >
          <Edit size={18} color="#fff" />
        </TouchableOpacity>

        {/* Avatar / Logo */}
        <View style={styles.avatarContainer}>
          {isShop ? (
            // Logo de la boutique
            user?.shopLogo ? (
              <Image source={{ uri: getMediaUrl(user.shopLogo) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Store size={40} color="#fff" />
              </View>
            )
          ) : (
            // Avatar du client (Google avatar est déjà une URL complète)
            user?.avatar ? (
              <Image 
                source={{ uri: user.avatar.startsWith('http') ? user.avatar : getMediaUrl(user.avatar) }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
              </View>
            )
          )}
          {isShop && !!user?.verified && (
            <View style={styles.verifiedBadge}>
              <CheckCircle size={24} color="#3b82f6" fill="#3b82f6" />
            </View>
          )}
        </View>

        {/* Nom */}
        <Text style={styles.name}>
          {isShop ? user?.shopName || user?.name : user?.name}
        </Text>
        
        {/* Description boutique ou type */}
        {isShop && user?.shopDescription ? (
          <Text style={[styles.shopDescription, isRTL && { textAlign: 'center', writingDirection: 'rtl' }]}>
            {user.shopDescription}
          </Text>
        ) : !isShop || !user?.shopDescription ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {isShop ? t('shop') : t('client')}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Contenu scrollable */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        {/* Section Coordonnées */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
            {isShop ? t('shopContact') : t('contact')}
          </Text>
          
          <View style={styles.infoCard}>
            {isShop && user?.shopName && (
              <View style={[styles.infoItem, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.infoIcon}>
                  <Store size={18} color="#6b7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{t('shopName')}</Text>
                  <Text style={[styles.infoValue, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{user.shopName}</Text>
                </View>
              </View>
            )}

            <View style={[styles.infoItem, isRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.infoIcon}>
                <Mail size={18} color="#6b7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{t('email')}</Text>
                <Text style={[styles.infoValue, isRTL && { textAlign: 'right' }]}>{user?.email}</Text>
              </View>
            </View>

            {user?.phone && (
              <View style={[styles.infoItem, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.infoIcon}>
                  <Phone size={18} color="#6b7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{t('phone')}</Text>
                  <Text style={[styles.infoValue, isRTL && { textAlign: 'right' }]}>{user.phone}</Text>
                </View>
              </View>
            )}

            {user?.address && (
              <View style={[styles.infoItem, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.infoIcon}>
                  <MapPin size={18} color="#6b7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>
                    {isShop ? t('shopAddress') : t('address')}
                  </Text>
                  <Text style={[styles.infoValue, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{user.address}</Text>
                </View>
              </View>
            )}

            {user?.wilaya && (
              <View style={[styles.infoItem, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.infoIcon, { backgroundColor: '#fef3c7' }]}>
                  <MapPin size={18} color="#f59e0b" fill="#fbbf24" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>Wilaya</Text>
                  <Text style={[styles.infoValue, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{user.wilaya}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Section Statut boutique */}
        {isShop && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('shopStatus')}</Text>
            
            <View style={styles.infoCard}>
              {/* Statut de vérification */}
              <View style={[styles.infoItem, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[
                  styles.infoIcon,
                  verificationStatus?.is_verified ? styles.verifiedIcon : 
                  verificationStatus?.verification_status === "pending" ? styles.pendingIcon :
                  verificationStatus?.verification_status === "rejected" ? styles.rejectedIcon :
                  styles.defaultIcon
                ]}>
                  <CheckCircle 
                    size={18} 
                    color={
                      verificationStatus?.is_verified ? "#22c55e" : 
                      verificationStatus?.verification_status === "pending" ? "#3b82f6" :
                      verificationStatus?.verification_status === "rejected" ? "#ef4444" :
                      "#9ca3af"
                    } 
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, isRTL && { textAlign: 'right' }]}>{t('verificationStatus')}</Text>
                  {loadingStatus ? (
                    <Text style={[styles.infoValue, isRTL && { textAlign: 'right' }]}>{t('loading')}</Text>
                  ) : (
                    <>
                      <Text style={[
                        styles.infoValue,
                        verificationStatus?.is_verified ? styles.verified : 
                        verificationStatus?.verification_status === "pending" ? styles.pending :
                        verificationStatus?.verification_status === "rejected" ? styles.rejected :
                        styles.notSubmitted,
                        isRTL && { textAlign: 'right', writingDirection: 'rtl' }
                      ]}>
                        {verificationStatus?.is_verified ? t('verifiedShop') : 
                         verificationStatus?.verification_status === "pending" ? t('underReview') :
                         verificationStatus?.verification_status === "rejected" ? t('requestRejected') :
                         !verificationStatus?.verification_status ? t('notSubmittedYet') :
                         t('notVerified')}
                      </Text>
                      {verificationStatus?.verification_status === "rejected" && verificationStatus?.rejection_reason && (
                        <Text style={[styles.rejectionReason, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                          {`${t('reason')}: ${verificationStatus.rejection_reason}`}
                        </Text>
                      )}
                      {verificationStatus?.is_verified && (
                        <Text style={[
                          styles.verificationDate, 
                          isRTL && { textAlign: 'right' },
                          !verificationStatus?.is_subscribed && { color: '#ef4444' }
                        ]}>
                          {verificationStatus?.is_subscribed && verificationStatus?.subscription_end_date
                            ? `✅ ${t('until') || "Jusqu'au"} ${new Date(verificationStatus.subscription_end_date).toLocaleDateString(isRTL ? "ar-DZ" : "fr-FR")}`
                            : `⚠️ ${t('noSubscription') || "Pas d'abonnement actif"}`
                          }
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>

              {/* Bouton d'action selon le statut */}
              {!verificationStatus?.is_verified && (
                <TouchableOpacity
                  style={styles.verificationButton}
                  onPress={() => router.push("/gestion/verification")}
                >
                  <Text style={styles.verificationButtonText}>
                    {verificationStatus?.verification_status === "pending" ? t('viewRequest') :
                     verificationStatus?.verification_status === "rejected" ? t('submitAgain') :
                     !verificationStatus?.verification_status ? t('submitVerification') :
                     t('startVerification')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Section Mes j'aime - seulement pour les clients */}
        {!isShop && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
              {t('myActivity') || 'Mon activité'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionCard, isRTL && { flexDirection: 'row-reverse' }]}
              onPress={() => router.push("/my-likes")}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                <Heart size={20} color="#ef4444" fill="#ef4444" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                  {t('myLikes') || 'Mes j\'aime'}
                </Text>
                <Text style={[styles.actionSubtitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                  {t('myLikesSubtitle') || 'Voir les produits que j\'ai aimés'}
                </Text>
              </View>
              <Text style={[styles.actionArrow, isRTL && { transform: [{ scaleX: -1 }] }]}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section Sécurité */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('security')}</Text>
          
          <TouchableOpacity 
            style={[styles.actionCard, isRTL && { flexDirection: 'row-reverse' }]}
            onPress={() => router.push("/change-password")}
          >
            <View style={styles.actionIcon}>
              <Lock size={20} color="#6b7280" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('changePassword')}</Text>
              <Text style={[styles.actionSubtitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('modifyPassword')}</Text>
            </View>
            <Text style={[styles.actionArrow, isRTL && { transform: [{ scaleX: -1 }] }]}>›</Text>
          </TouchableOpacity>
        </View>

        
        {/* Section Support - visible uniquement si le support est actif */}
        {supportActive && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
              {t('contactSupport') || 'Support'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionCard, isRTL && { flexDirection: 'row-reverse' }]}
              onPress={() => router.push("/support")}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                <Headphones size={20} color="#3b82f6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                  {t('contactSupport') || 'Contacter le Support'}
                </Text>
                <Text style={[styles.actionSubtitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                  {t('supportSubtitle') || 'Besoin d\'aide ? Contactez-nous'}
                </Text>
              </View>
              <Text style={[styles.actionArrow, isRTL && { transform: [{ scaleX: -1 }] }]}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sélecteur de langue */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{t('preferences')}</Text>
          <LanguageSelector />
        </View>

        {/* Bouton Déconnexion */}
        <TouchableOpacity style={[styles.logoutButton, isRTL && { flexDirection: 'row-reverse' }]} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

          {/* Espace en bas pour éviter que la barre Android cache le contenu */}
          <View style={{ height: Math.max(insets.bottom, 20) + 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 30,
    backgroundColor: "#000",
    position: "relative",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  editButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  typeBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  shopDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: 32,
    marginTop: 8,
    lineHeight: 20,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoItem: {
    flexDirection: "row",
    gap: 10,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconText: {
    fontSize: 16,
  },
  infoContent: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  verified: {
    color: "#22c55e",
    fontWeight: "600",
  },
  pending: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  rejected: {
    color: "#ef4444",
    fontWeight: "600",
  },
  notSubmitted: {
    color: "#f59e0b",
    fontWeight: "600",
  },
  verifiedIcon: {
    backgroundColor: "#dcfce7",
  },
  pendingIcon: {
    backgroundColor: "#dbeafe",
  },
  rejectedIcon: {
    backgroundColor: "#fee2e2",
  },
  defaultIcon: {
    backgroundColor: "#fef3c7",
  },
  rejectionReason: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    fontStyle: "italic",
  },
  verificationDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  verificationButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  verificationButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#fee2e2",
    borderRadius: 14,
    backgroundColor: "#fff",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
  },
  actionArrow: {
    fontSize: 28,
    color: "#d1d5db",
    fontWeight: "300",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
});
