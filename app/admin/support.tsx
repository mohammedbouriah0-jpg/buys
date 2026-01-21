import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Save,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  Globe,
  Clock,
  MapPin,
  Headphones,
} from "lucide-react-native";
import { API_URL } from "@/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SupportConfig {
  phone: string;
  email: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  telegram: string;
  website: string;
  working_hours: string;
  address: string;
  phone_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  instagram_enabled: boolean;
  facebook_enabled: boolean;
  telegram_enabled: boolean;
  website_enabled: boolean;
  working_hours_enabled: boolean;
  address_enabled: boolean;
  is_active: boolean;
}

export default function AdminSupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SupportConfig>({
    phone: "",
    email: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    telegram: "",
    website: "",
    working_hours: "",
    address: "",
    phone_enabled: true,
    email_enabled: true,
    whatsapp_enabled: true,
    instagram_enabled: true,
    facebook_enabled: true,
    telegram_enabled: true,
    website_enabled: true,
    working_hours_enabled: true,
    address_enabled: true,
    is_active: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/support/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({
          phone: data.phone || "",
          email: data.email || "",
          whatsapp: data.whatsapp || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          telegram: data.telegram || "",
          website: data.website || "",
          working_hours: data.working_hours || "",
          address: data.address || "",
          phone_enabled: data.phone_enabled ?? true,
          email_enabled: data.email_enabled ?? true,
          whatsapp_enabled: data.whatsapp_enabled ?? true,
          instagram_enabled: data.instagram_enabled ?? true,
          facebook_enabled: data.facebook_enabled ?? true,
          telegram_enabled: data.telegram_enabled ?? true,
          website_enabled: data.website_enabled ?? true,
          working_hours_enabled: data.working_hours_enabled ?? true,
          address_enabled: data.address_enabled ?? true,
          is_active: data.is_active ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading support config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("auth_token");
      
      const response = await fetch(`${API_URL}/support/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        Alert.alert("Succès", "Configuration du support mise à jour");
      } else {
        throw new Error("Erreur lors de la mise à jour");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder la configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Headphones size={24} color="#fff" />
          <Text style={styles.headerTitle}>Configuration Support</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, config.is_active && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {config.is_active ? "Support actif" : "Support désactivé"}
            </Text>
          </View>
          <Switch
            value={config.is_active}
            onValueChange={(value) => setConfig({ ...config, is_active: value })}
            trackColor={{ false: "#d1d5db", true: "#86efac" }}
            thumbColor={config.is_active ? "#22c55e" : "#9ca3af"}
          />
        </View>

        {/* Section Téléphone & Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Principal</Text>
          
          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, !config.phone_enabled && styles.inputIconDisabled]}>
              <Phone size={20} color={config.phone_enabled ? "#3b82f6" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Téléphone</Text>
                <Switch
                  value={config.phone_enabled}
                  onValueChange={(value) => setConfig({ ...config, phone_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.phone_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.phone_enabled && styles.inputDisabled]}
                value={config.phone}
                onChangeText={(text) => setConfig({ ...config, phone: text })}
                placeholder="+213 XX XX XX XX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                editable={config.phone_enabled}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, !config.email_enabled && styles.inputIconDisabled]}>
              <Mail size={20} color={config.email_enabled ? "#ef4444" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Email</Text>
                <Switch
                  value={config.email_enabled}
                  onValueChange={(value) => setConfig({ ...config, email_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.email_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.email_enabled && styles.inputDisabled]}
                value={config.email}
                onChangeText={(text) => setConfig({ ...config, email: text })}
                placeholder="support@buys.dz"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={config.email_enabled}
              />
            </View>
          </View>
        </View>

        {/* Section Messagerie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messagerie Instantanée</Text>
          
          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, { backgroundColor: config.whatsapp_enabled ? "#dcfce7" : "#f3f4f6" }]}>
              <MessageCircle size={20} color={config.whatsapp_enabled ? "#22c55e" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>WhatsApp</Text>
                <Switch
                  value={config.whatsapp_enabled}
                  onValueChange={(value) => setConfig({ ...config, whatsapp_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.whatsapp_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.whatsapp_enabled && styles.inputDisabled]}
                value={config.whatsapp}
                onChangeText={(text) => setConfig({ ...config, whatsapp: text })}
                placeholder="+213 XX XX XX XX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                editable={config.whatsapp_enabled}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, { backgroundColor: config.telegram_enabled ? "#e0e7ff" : "#f3f4f6" }]}>
              <Send size={20} color={config.telegram_enabled ? "#6366f1" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Telegram</Text>
                <Switch
                  value={config.telegram_enabled}
                  onValueChange={(value) => setConfig({ ...config, telegram_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.telegram_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.telegram_enabled && styles.inputDisabled]}
                value={config.telegram}
                onChangeText={(text) => setConfig({ ...config, telegram: text })}
                placeholder="@buys_support"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                editable={config.telegram_enabled}
              />
            </View>
          </View>
        </View>

        {/* Section Réseaux Sociaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Réseaux Sociaux</Text>
          
          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, { backgroundColor: config.instagram_enabled ? "#fce7f3" : "#f3f4f6" }]}>
              <Instagram size={20} color={config.instagram_enabled ? "#ec4899" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Instagram</Text>
                <Switch
                  value={config.instagram_enabled}
                  onValueChange={(value) => setConfig({ ...config, instagram_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.instagram_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.instagram_enabled && styles.inputDisabled]}
                value={config.instagram}
                onChangeText={(text) => setConfig({ ...config, instagram: text })}
                placeholder="@buys.dz"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                editable={config.instagram_enabled}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, { backgroundColor: config.facebook_enabled ? "#dbeafe" : "#f3f4f6" }]}>
              <Facebook size={20} color={config.facebook_enabled ? "#2563eb" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Facebook</Text>
                <Switch
                  value={config.facebook_enabled}
                  onValueChange={(value) => setConfig({ ...config, facebook_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.facebook_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.facebook_enabled && styles.inputDisabled]}
                value={config.facebook}
                onChangeText={(text) => setConfig({ ...config, facebook: text })}
                placeholder="buys.dz"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                editable={config.facebook_enabled}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, { backgroundColor: config.website_enabled ? "#f0fdf4" : "#f3f4f6" }]}>
              <Globe size={20} color={config.website_enabled ? "#16a34a" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Site Web</Text>
                <Switch
                  value={config.website_enabled}
                  onValueChange={(value) => setConfig({ ...config, website_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.website_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.website_enabled && styles.inputDisabled]}
                value={config.website}
                onChangeText={(text) => setConfig({ ...config, website: text })}
                placeholder="https://buys.dz"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="url"
                editable={config.website_enabled}
              />
            </View>
          </View>
        </View>

        {/* Section Infos Pratiques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Pratiques</Text>
          
          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, { backgroundColor: config.working_hours_enabled ? "#fef3c7" : "#f3f4f6" }]}>
              <Clock size={20} color={config.working_hours_enabled ? "#d97706" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Horaires</Text>
                <Switch
                  value={config.working_hours_enabled}
                  onValueChange={(value) => setConfig({ ...config, working_hours_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.working_hours_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, !config.working_hours_enabled && styles.inputDisabled]}
                value={config.working_hours}
                onChangeText={(text) => setConfig({ ...config, working_hours: text })}
                placeholder="Dim - Jeu: 9h - 18h"
                placeholderTextColor="#9ca3af"
                editable={config.working_hours_enabled}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputIcon, { backgroundColor: config.address_enabled ? "#fee2e2" : "#f3f4f6" }]}>
              <MapPin size={20} color={config.address_enabled ? "#dc2626" : "#9ca3af"} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Adresse</Text>
                <Switch
                  value={config.address_enabled}
                  onValueChange={(value) => setConfig({ ...config, address_enabled: value })}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={config.address_enabled ? "#22c55e" : "#9ca3af"}
                  style={styles.switch}
                />
              </View>
              <TextInput
                style={[styles.input, styles.textArea, !config.address_enabled && styles.inputDisabled]}
                value={config.address}
                onChangeText={(text) => setConfig({ ...config, address: text })}
                placeholder="Alger, Algérie"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                editable={config.address_enabled}
              />
            </View>
          </View>
        </View>

        {/* Bouton Enregistrer */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#3b82f6",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#d1d5db",
  },
  statusDotActive: {
    backgroundColor: "#22c55e",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  inputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
  },
  inputIconDisabled: {
    backgroundColor: "#f3f4f6",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
    gap: 10,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
