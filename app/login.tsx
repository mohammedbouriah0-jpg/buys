import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView,
} from "react-native"
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll"
import { Link, useRouter } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { LanguageSelector } from "@/components/language-selector"
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Store, X } from "lucide-react-native"
import { signInWithGoogle, configureGoogleSignIn } from "@/lib/google-auth"
import { API_URL } from "@/config"
import Svg, { Path } from "react-native-svg"

// Composant Logo Google officiel
const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
)

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [showUserTypeModal, setShowUserTypeModal] = useState(false)
  const [pendingGoogleData, setPendingGoogleData] = useState<any>(null)

  // Keyboard scroll
  const { scrollViewRef, keyboardHeight, scrollToInput } = useKeyboardScroll()
  const { login, loginWithToken } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  // Configurer Google Sign-In au montage
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t("fillAllFields"))
      return
    }

    setLoading(true)
    setError("")

    // Le backend détecte automatiquement le type d'utilisateur (client ou boutique)
    const success = await login(email, password)

    if (success) {
      router.replace("/")
    } else {
      setError(t("incorrectCredentials"))
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const result = await signInWithGoogle();
      
      if (!result.success) {
        if (result.error !== 'Connexion annulée par l\'utilisateur') {
          Alert.alert('Erreur', result.error || 'Connexion Google échouée');
        }
        setGoogleLoading(false);
        return;
      }

      // D'abord vérifier si l'utilisateur existe déjà
      console.log('📤 Vérification utilisateur:', API_URL);
      const checkResponse = await fetch(`${API_URL}/auth/google/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: result.idToken,
        })
      });

      const checkData = await checkResponse.json();
      console.log('📥 Réponse check:', checkData);

      if (checkData.exists) {
        // Utilisateur existe → connexion directe
        const loginResponse = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: result.idToken,
            user: result.user,
          })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
          throw new Error(loginData.error || 'Erreur de connexion');
        }

        // Sauvegarder le token et l'utilisateur directement
        await loginWithToken(loginData.token, loginData.user);
        router.replace('/');
      } else {
        // Nouvel utilisateur → afficher le choix client/boutique
        setPendingGoogleData({
          idToken: result.idToken,
          user: result.user,
        });
        setShowUserTypeModal(true);
      }

    } catch (error: any) {
      console.error('Erreur Google Auth:', error);
      let errorMessage = 'Connexion Google échouée';
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        errorMessage = 'Erreur réseau - Vérifiez votre connexion internet';
      } else if (error.message?.includes('serveur')) {
        errorMessage = 'Erreur serveur lors de l\'authentification Google';
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Erreur', errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  }

  const completeGoogleSignup = async (userType: 'client' | 'shop') => {
    if (!pendingGoogleData) return;
    
    setGoogleLoading(true);
    setShowUserTypeModal(false);
    
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: pendingGoogleData.idToken,
          user: pendingGoogleData.user,
          userType: userType
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur de création de compte');
      }

      // Sauvegarder le token et l'utilisateur directement
      await loginWithToken(data.token, data.user);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la création du compte');
    } finally {
      setGoogleLoading(false);
      setPendingGoogleData(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
        {/* Bouton retour */}
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight + 50 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('@/assets/Logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>{t("welcome")}</Text>
            <Text style={styles.subtitle}>{t("loginToContinue")}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("emailAddress")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                  onFocus={() => scrollToInput(250)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("password")}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#9ca3af"
                  onFocus={() => scrollToInput(320)}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9ca3af" />
                  ) : (
                    <Eye size={20} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            {/* Forgot Password Link */}
            <Link href="/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordText}>{t("forgotPassword")}</Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t("login")}</Text>
              )}
            </TouchableOpacity>

            {/* Séparateur OU */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('or')}</Text>
              <View style={styles.divider} />
            </View>

            {/* Bouton Google amélioré */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <GoogleLogo size={20} />
                  </View>
                  <Text style={styles.googleButtonText}>{t('continueWithGoogle') || 'Continuer avec Google'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t("noAccountYet")}</Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>{t("createAccount")}</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Language Selector */}
          <View style={styles.languageContainer}>
            <LanguageSelector />
          </View>
        </View>
        </ScrollView>

      {/* Modal choix type utilisateur */}
      <Modal
        visible={showUserTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowUserTypeModal(false);
          setPendingGoogleData(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowUserTypeModal(false);
                setPendingGoogleData(null);
              }}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>{t('welcomeToApp') || 'Bienvenue !'}</Text>
            <Text style={styles.modalSubtitle}>
              {t('chooseAccountType') || 'Choisissez votre type de compte'}
            </Text>

            <View style={styles.userTypeOptions}>
              <TouchableOpacity
                style={styles.userTypeCard}
                onPress={() => completeGoogleSignup('client')}
                activeOpacity={0.7}
              >
                <View style={styles.userTypeIconContainer}>
                  <User size={22} color="#4285F4" />
                </View>
                <Text style={styles.userTypeTitle}>{t('client') || 'Client'}</Text>
                <Text style={styles.userTypeDescription}>
                  {t('clientDescription') || 'Achetez des produits et découvrez les boutiques'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.userTypeCard}
                onPress={() => completeGoogleSignup('shop')}
                activeOpacity={0.7}
              >
                <View style={[styles.userTypeIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Store size={22} color="#F59E0B" />
                </View>
                <Text style={styles.userTypeTitle}>{t('shop') || 'Boutique'}</Text>
                <Text style={styles.userTypeDescription}>
                  {t('shopDescription') || 'Vendez vos produits et gérez votre boutique'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  backButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    paddingTop: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 10,
    color: "#000",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    color: "#6b7280",
    fontWeight: "400",
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#000",
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  error: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
    color: "#6b7280",
  },
  link: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  languageContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 4,
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  userTypeOptions: {
    flexDirection: "row",
    gap: 12,
  },
  userTypeCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  userTypeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  userTypeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 2,
  },
  userTypeDescription: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 14,
  },
})
