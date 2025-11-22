import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { X, Mail, Lock } from "lucide-react-native";
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

  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t("error"), t("passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("error"), t("passwordsDoNotMatch"));
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
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
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                </View>
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
                    secureTextEntry
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={[styles.hint, isRTL && styles.textRTL]}>{t("minimumCharacters")}</Text>
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
    </KeyboardAvoidingView>
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
});
