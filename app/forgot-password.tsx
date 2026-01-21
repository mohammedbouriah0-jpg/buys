import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll";
import { useRouter } from "expo-router";
import { X, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { useLanguage } from "@/lib/i18n/language-context";
import { API_URL } from "@/config";

export default function ForgotPassword() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSymbol: false,
  });
  
  // Keyboard scroll
  const { scrollViewRef, keyboardHeight, scrollToInput } = useKeyboardScroll();

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(t("success"), t("resetCodeSent"));
        setStep("code");
      } else {
        Alert.alert(t("error"), data.error || t("errorOccurred"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  // Valider la force du mot de passe
  const validatePassword = (pwd: string) => {
    setPasswordStrength({
      hasMinLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    });
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("error"), t("passwordsDoNotMatch"));
      return;
    }

    // Vérifier la force du mot de passe
    if (!passwordStrength.hasMinLength || !passwordStrength.hasUpperCase || 
        !passwordStrength.hasLowerCase || !passwordStrength.hasNumber || 
        !passwordStrength.hasSymbol) {
      Alert.alert(t("error"), t("passwordTooWeak"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          t("success"),
          t("passwordResetSuccess"),
          [{ text: "OK", onPress: () => router.replace("/login") }]
        );
      } else {
        Alert.alert(t("error"), data.error || t("errorOccurred"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: keyboardHeight + 50 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("forgotPassword")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {step === "email" ? (
            <>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Mail size={48} color="#3b82f6" />
              </View>

              <Text style={[styles.title, isRTL && styles.textRTL]}>
                {t("resetPasswordTitle")}
              </Text>

              <Text style={[styles.description, isRTL && styles.textRTL]}>
                {t("resetPasswordDescription")}
              </Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t("email")}</Text>
                <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRTL]}>
                  <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t("yourEmail")}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                    onFocus={() => scrollToInput(300)}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? t("loading") : t("sendCode")}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Lock size={48} color="#3b82f6" />
              </View>

              <Text style={[styles.title, isRTL && styles.textRTL]}>
                {t("enterResetCode")}
              </Text>

              <Text style={[styles.description, isRTL && styles.textRTL]}>
                {t("resetCodeSentTo")} {email}
              </Text>

              {/* Code Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t("resetCode")}</Text>
                <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRTL]}>
                  <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t("enterCode")}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t("newPassword")}</Text>
                <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRTL]}>
                  <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t("enterNewPassword")}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      validatePassword(text);
                    }}
                    secureTextEntry={!showNewPassword}
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? (
                      <EyeOff size={20} color="#9ca3af" />
                    ) : (
                      <Eye size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                </View>
                
                {/* Indicateurs de force du mot de passe */}
                {newPassword.length > 0 && (
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

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t("confirmPassword")}</Text>
                <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRTL]}>
                  <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t("confirmNewPassword")}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#9ca3af" />
                    ) : (
                      <Eye size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <Text style={styles.errorText}>{t("passwordsDoNotMatch")}</Text>
                )}
                {confirmPassword.length > 0 && newPassword === confirmPassword && (
                  <Text style={styles.successText}>✓ {t("passwordsMatch")}</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? t("loading") : t("resetPassword")}
                </Text>
              </TouchableOpacity>

              {/* Resend Code */}
              <TouchableOpacity onPress={() => setStep("email")} style={styles.resendButton}>
                <Text style={[styles.resendText, isRTL && styles.textRTL]}>
                  {t("resendCode")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f7f7f7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputWrapperRTL: {
    flexDirection: "row-reverse",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: "#000",
  },
  inputRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendButton: {
    marginTop: 16,
    alignItems: "center",
  },
  resendText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
  textRTL: {
    textAlign: "right",
    writingDirection: "rtl",
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
});
