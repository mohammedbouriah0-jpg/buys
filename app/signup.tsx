import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { Link, useRouter } from "expo-router"
import { useAuth, UserType } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [userType, setUserType] = useState<UserType>("client")
  const [shopName, setShopName] = useState("")
  const [shopDescription, setShopDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { signup } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const handleSignup = async () => {
    if (!email || !password || !name) {
      setError(t("fillRequiredFields"))
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
      router.replace("/")
    } else {
      setError(t("emailAlreadyUsed"))
    }

    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{t("signupTitle")}</Text>
          <Text style={styles.subtitle}>{t("createYourAccount")}</Text>

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
              <Text style={styles.label}>{t("fullName")}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t("yourName")}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("email")}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t("yourEmail")}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("password")}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
              />
            </View>

            {userType === "shop" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("shopName")}</Text>
                  <TextInput
                    style={styles.input}
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder={t("myShop")}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("description")}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={shopDescription}
                    onChangeText={setShopDescription}
                    placeholder={t("describeYourShop")}
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
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
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
})
