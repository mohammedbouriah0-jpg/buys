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
import { X, Lock, Eye, EyeOff } from "lucide-react-native";
import { userAPI } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ChangePassword() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
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
      await userAPI.changePassword(currentPassword, newPassword);
      Alert.alert(
        t("success"),
        t("passwordChangedSuccess"),
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("unableToChangePassword"));
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
          <Text style={styles.headerTitle}>{t("changePassword")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Lock size={48} color="#3b82f6" />
          </View>

          <Text style={[styles.description, isRTL && styles.textRTL]}>
            {t("passwordSecurityMessage")}
          </Text>

          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t("currentPassword")}</Text>
            <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRTL]}>
              <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t("enterCurrentPassword")}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? (
                  <EyeOff size={20} color="#9ca3af" />
                ) : (
                  <Eye size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
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
                secureTextEntry={!showNew}
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                {showNew ? (
                  <EyeOff size={20} color="#9ca3af" />
                ) : (
                  <Eye size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, isRTL && styles.textRTL]}>{t("minimumCharacters")}</Text>
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
                secureTextEntry={!showConfirm}
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? (
                  <EyeOff size={20} color="#9ca3af" />
                ) : (
                  <Eye size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? t("changingPassword") : t("changePassword")}
            </Text>
          </TouchableOpacity>
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
  description: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  textRTL: {
    textAlign: "right",
    writingDirection: "rtl",
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
});
