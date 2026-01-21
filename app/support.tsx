import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  Send,
  Globe,
  Clock,
  MapPin,
  Headphones,
  ExternalLink,
} from "lucide-react-native";
import { API_URL } from "@/config";

// Import dynamique de l'icône Facebook
const FacebookIcon = ({ size, color }: { size: number; color: string }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size * 0.7, fontWeight: 'bold', color }}>f</Text>
  </View>
);

interface Contact {
  type: string;
  value: string;
  label: string;
}

interface SupportInfo {
  contacts: Contact[];
  working_hours: string | null;
  address: string | null;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'phone':
      return { icon: Phone, color: '#3b82f6', bg: '#eff6ff' };
    case 'email':
      return { icon: Mail, color: '#ef4444', bg: '#fef2f2' };
    case 'whatsapp':
      return { icon: MessageCircle, color: '#22c55e', bg: '#dcfce7' };
    case 'telegram':
      return { icon: Send, color: '#0088cc', bg: '#e0f2fe' };
    case 'instagram':
      return { icon: Instagram, color: '#e4405f', bg: '#fce7f3' };
    case 'facebook':
      return { icon: FacebookIcon, color: '#1877f2', bg: '#dbeafe' };
    case 'website':
      return { icon: Globe, color: '#16a34a', bg: '#f0fdf4' };
    default:
      return { icon: Phone, color: '#6b7280', bg: '#f3f4f6' };
  }
};

export default function SupportPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupportInfo();
  }, []);

  const loadSupportInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/support/info`);
      if (response.ok) {
        const data = await response.json();
        setSupportInfo(data);
      }
    } catch (error) {
      console.error("Error loading support info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (type: string, value: string) => {
    let url = "";
    switch (type) {
      case "phone":
        url = `tel:${value.replace(/\s/g, "")}`;
        break;
      case "email":
        url = `mailto:${value}`;
        break;
      case "whatsapp":
        const cleanNumber = value.replace(/\s/g, "").replace("+", "");
        url = `https://wa.me/${cleanNumber}`;
        break;
      case "instagram":
        const instaHandle = value.replace("@", "");
        url = `https://instagram.com/${instaHandle}`;
        break;
      case "facebook":
        url = value.startsWith("http") ? value : `https://facebook.com/${value}`;
        break;
      case "telegram":
        const telegramHandle = value.replace("@", "");
        url = `https://t.me/${telegramHandle}`;
        break;
      case "website":
        url = value.startsWith("http") ? value : `https://${value}`;
        break;
    }
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Error opening URL:", err));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Headphones size={48} color="#3b82f6" />
          </View>
          <Text style={styles.heroTitle}>Comment pouvons-nous vous aider ?</Text>
          <Text style={styles.heroSubtitle}>
            Notre équipe est là pour vous accompagner. Choisissez le canal qui vous convient le mieux.
          </Text>
        </View>

        {/* Contacts */}
        {supportInfo && supportInfo.contacts.length > 0 ? (
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>Nous contacter</Text>
            
            {supportInfo.contacts.map((contact, index) => {
              const { icon: IconComponent, color, bg } = getIconForType(contact.type);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.contactCard}
                  onPress={() => handlePress(contact.type, contact.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: bg }]}>
                    <IconComponent size={24} color={color} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>{contact.label}</Text>
                    <Text style={styles.contactValue}>{contact.value}</Text>
                  </View>
                  <View style={styles.contactArrow}>
                    <ExternalLink size={18} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.noContactsSection}>
            <Text style={styles.noContactsText}>
              Aucune information de contact disponible pour le moment.
            </Text>
          </View>
        )}

        {/* Infos pratiques */}
        {(supportInfo?.working_hours || supportInfo?.address) && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informations pratiques</Text>
            
            {supportInfo.working_hours && (
              <View style={styles.infoCard}>
                <View style={[styles.infoIconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Clock size={20} color="#d97706" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Horaires d'ouverture</Text>
                  <Text style={styles.infoValue}>{supportInfo.working_hours}</Text>
                </View>
              </View>
            )}

            {supportInfo.address && (
              <View style={styles.infoCard}>
                <View style={[styles.infoIconContainer, { backgroundColor: '#fee2e2' }]}>
                  <MapPin size={20} color="#dc2626" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Adresse</Text>
                  <Text style={styles.infoValue}>{supportInfo.address}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + 40 }} />
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#3b82f6",
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 20,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#bfdbfe",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  contactsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contactLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  contactArrow: {
    padding: 8,
  },
  noContactsSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  noContactsText: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
    marginLeft: 14,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 22,
  },
});
