import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import {
  Headphones,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  Globe,
  Clock,
  MapPin,
  ChevronRight,
  ExternalLink,
} from "lucide-react-native";
import { API_URL } from "@/config";

interface SupportInfo {
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  telegram: string | null;
  website: string | null;
  working_hours: string | null;
  address: string | null;
}

interface SupportSectionProps {
  title?: string;
  compact?: boolean;
}

export function SupportSection({ title = "Contacter le Support", compact = false }: SupportSectionProps) {
  const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

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
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  if (!supportInfo) {
    return null;
  }

  // Vérifier s'il y a au moins une info de contact
  const hasAnyContact = 
    supportInfo.phone || 
    supportInfo.email || 
    supportInfo.whatsapp || 
    supportInfo.instagram || 
    supportInfo.facebook || 
    supportInfo.telegram;

  if (!hasAnyContact) {
    return null;
  }

  const contactItems = [
    { type: "phone", value: supportInfo.phone, icon: Phone, color: "#3b82f6", bg: "#eff6ff", label: "Téléphone" },
    { type: "email", value: supportInfo.email, icon: Mail, color: "#ef4444", bg: "#fef2f2", label: "Email" },
    { type: "whatsapp", value: supportInfo.whatsapp, icon: MessageCircle, color: "#22c55e", bg: "#dcfce7", label: "WhatsApp" },
    { type: "telegram", value: supportInfo.telegram, icon: Send, color: "#6366f1", bg: "#e0e7ff", label: "Telegram" },
    { type: "instagram", value: supportInfo.instagram, icon: Instagram, color: "#ec4899", bg: "#fce7f3", label: "Instagram" },
    { type: "facebook", value: supportInfo.facebook, icon: Facebook, color: "#2563eb", bg: "#dbeafe", label: "Facebook" },
    { type: "website", value: supportInfo.website, icon: Globe, color: "#16a34a", bg: "#f0fdf4", label: "Site web" },
  ].filter(item => item.value);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => compact && setExpanded(!expanded)}
        activeOpacity={compact ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Headphones size={20} color="#3b82f6" />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        {compact && (
          <ChevronRight 
            size={20} 
            color="#9ca3af" 
            style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
          />
        )}
      </TouchableOpacity>

      {/* Contact Items */}
      {expanded && (
        <View style={styles.contactList}>
          {contactItems.map((item, index) => (
            <TouchableOpacity
              key={item.type}
              style={[
                styles.contactItem,
                index === contactItems.length - 1 && styles.contactItemLast,
              ]}
              onPress={() => handlePress(item.type, item.value!)}
            >
              <View style={[styles.contactIcon, { backgroundColor: item.bg }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
              <ExternalLink size={16} color="#9ca3af" />
            </TouchableOpacity>
          ))}

          {/* Horaires */}
          {supportInfo.working_hours && (
            <View style={styles.infoRow}>
              <Clock size={16} color="#d97706" />
              <Text style={styles.infoText}>{supportInfo.working_hours}</Text>
            </View>
          )}

          {/* Adresse */}
          {supportInfo.address && (
            <View style={styles.infoRow}>
              <MapPin size={16} color="#dc2626" />
              <Text style={styles.infoText}>{supportInfo.address}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  contactList: {
    padding: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    marginBottom: 8,
  },
  contactItemLast: {
    marginBottom: 0,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
  },
});
