import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native"
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll"
import { Link, useRouter } from "expo-router"
import { useAuth, UserType } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native"
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

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState("")
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSymbol: false,
  })
  const [userType, setUserType] = useState<UserType>("client")
  const [shopName, setShopName] = useState("")
  const [shopDescription, setShopDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const { signup, loginWithToken } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  
  // Keyboard scroll
  const { scrollViewRef, keyboardHeight, scrollToInput } = useKeyboardScroll()

  // Configurer Google Sign-In au montage
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      
      if (!result.success) {
        if (result.error !== 'Connexion annulée par l\'utilisateur') {
          Alert.alert('Erreur', result.error || 'Connexion Google échouée');
        }
        return;
      }

      // Créer le compte avec le type sélectionné
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: result.idToken,
          user: result.user,
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
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'inscription Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  // Valider la force du mot de passe
  const validatePassword = (pwd: string) => {
    setPasswordStrength({
      hasMinLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    })
  }

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !name) {
      setError(t("fillRequiredFields"))
      return
    }

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"))
      return
    }

    // Vérifier la force du mot de passe
    if (!passwordStrength.hasMinLength || !passwordStrength.hasUpperCase || 
        !passwordStrength.hasLowerCase || !passwordStrength.hasNumber || 
        !passwordStrength.hasSymbol) {
      setError(t("passwordTooWeak"))
      return
    }

    if (userType === "shop" && (!shopName || !shopDescription)) {
      setError(t("fillShopInfo"))
      return
    }

    setLoading(true)
    setError("")

    const success = await signup({
      email,
      password,
      name,
      type: userType,
      shopName: userType === "shop" ? shopName : undefined,
      shopDescription: userType === "shop" ? shopDescription : undefined,
    })

    if (success) {
      // Rediriger directement vers la vérification email
      router.replace("/verify-email")
    } else {
      setError(t("emailAlreadyUsed"))
    }

    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
        {/* Header avec bouton retour */}
        <View style={styles.header}>
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>{t("signupTitle") || "Créez votre compte buys"}</Text>
            <Text style={styles.subtitle}>{t("createYourAccount") || "Inscrivez-vous pour commencer"}</Text>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, userType === "client" && styles.typeButtonActive]}
              onPress={() => setUserType("client")}
            >
              <Text
                style={[styles.typeButtonText, userType === "client" && styles.typeButtonTextActive]}
              >
                {t("client")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, userType === "shop" && styles.typeButtonActive]}
              onPress={() => setUserType("shop")}
            >
              <Text
                style={[styles.typeButtonText, userType === "shop" && styles.typeButtonTextActive]}
              >
                {t("shop")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("fullName") || "Nom complet"}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t("yourName") || "Votre nom"}
                placeholderTextColor="#9ca3af"
                onFocus={() => scrollToInput(200)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("email") || "Email"}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t("yourEmail") || "votre@email.com"}
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => scrollToInput(280)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("password") || "Mot de passe"}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text)
                    validatePassword(text)
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => scrollToInput(360)}
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
              
              {/* Indicateurs de force du mot de passe */}
              {password.length > 0 && (
                <View style={styles.passwordStrength}>
                  <View style={styles.strengthItem}>
                    <Text style={passwordStrength.hasMinLength ? styles.checkValid : styles.checkInvalid}>
                      {passwordStrength.hasMinLength ? "✓" : "✗"}
                    </Text>
                    <Text style={styles.strengthText}>{t("minLength8")}</Text>
                  </View>
                  <View style={styles.strengthItem}>
                    <Text style={passwordStrength.hasUpperCase ? styles.checkValid : styles.checkInvalid}>
                      {passwordStrength.hasUpperCase ? "✓" : "✗"}
                    </Text>
                    <Text style={styles.strengthText}>{t("oneUpperCase")}</Text>
                  </View>
                  <View style={styles.strengthItem}>
                    <Text style={passwordStrength.hasLowerCase ? styles.checkValid : styles.checkInvalid}>
                      {passwordStrength.hasLowerCase ? "✓" : "✗"}
                    </Text>
                    <Text style={styles.strengthText}>{t("oneLowerCase")}</Text>
                  </View>
                  <View style={styles.strengthItem}>
                    <Text style={passwordStrength.hasNumber ? styles.checkValid : styles.checkInvalid}>
                      {passwordStrength.hasNumber ? "✓" : "✗"}
                    </Text>
                    <Text style={styles.strengthText}>{t("oneNumber")}</Text>
                  </View>
                  <View style={styles.strengthItem}>
                    <Text style={passwordStrength.hasSymbol ? styles.checkValid : styles.checkInvalid}>
                      {passwordStrength.hasSymbol ? "✓" : "✗"}
                    </Text>
                    <Text style={styles.strengthText}>{t("oneSymbol")}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("confirmPassword") || "Confirmer le mot de passe"}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => scrollToInput(500)}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#9ca3af" />
                  ) : (
                    <Eye size={20} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>{t("passwordsDoNotMatch")}</Text>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && (
                <Text style={styles.successText}>✓ {t("passwordsMatch")}</Text>
              )}
            </View>

            {userType === "shop" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("shopName") || "Nom de la boutique"}</Text>
                  <TextInput
                    style={styles.input}
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder={t("myShop") || "Ma Boutique"}
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("description") || "Description"}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={shopDescription}
                    onChangeText={setShopDescription}
                    placeholder={t("describeYourShop") || "Décrivez votre boutique..."}
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t("signup")}</Text>
              )}
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.divider} />
            </View>

            {/* Bouton Google */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignup}
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
                  <Text style={styles.googleButtonText}>
                    {t('signupWithGoogle') || `S'inscrire avec Google (${userType === 'client' ? 'Client' : 'Boutique'})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t("alreadyHaveAccountQuestion")}</Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>{t("login")}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
        </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8e8e8e",
    marginBottom: 32,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8e8e8e",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  error: {
    color: "#ef4444",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#8e8e8e",
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  passwordStrength: {
    marginTop: 8,
    gap: 4,
  },
  strengthItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  strengthText: {
    fontSize: 12,
    color: "#666",
  },
  checkValid: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkInvalid: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "bold",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: "#10b981",
    fontSize: 12,
    marginTop: 4,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
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
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: "600",
  },
})
