import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth-context";
import { verificationAPI } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/language-context";

export default function VerificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    loadPaymentSettings();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await verificationAPI.getStatus();
      setStatus(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('auth_token');
      const API_URL = require('@/config').API_URL;
      
      const response = await fetch(`${API_URL}/payment-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentSettings(data);
      }
    } catch (error) {
      console.error('Erreur chargement paramètres paiement:', error);
    }
  };

  const pickImage = async () => {
    try {
      console.log('📸 Demande de permission...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('📸 Permission status:', status);
      
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Nous avons besoin d'accéder à vos photos");
        return;
      }

      console.log('📸 Ouverture de la galerie...');
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      console.log('📸 Résultat:', result);

      if (!result.canceled && result.assets[0]) {
        console.log('📸 Image sélectionnée:', result.assets[0].uri);
        setSelectedImage(result.assets[0].uri);
        Alert.alert('Succès', 'Document sélectionné');
      }
    } catch (error) {
      console.error('❌ Erreur pickImage:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie: ' + error.message);
    }
  };

  const submitVerification = async () => {
    if (!selectedImage) {
      Alert.alert("Erreur", "Veuillez sélectionner un document");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      const filename = selectedImage.split("/").pop() || "document.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("document", {
        uri: selectedImage,
        name: filename,
        type,
      } as any);

      await verificationAPI.submit(formData);
      Alert.alert("✅ Succès", "Votre demande a été soumise avec succès");
      setSelectedImage(null);
      loadStatus();
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", error.message || "Impossible de soumettre la demande");
    } finally {
      setUploading(false);
    }
  };

  const getStatusInfo = () => {
    if (!status) return null;

    if (status.is_verified) {
      return {
        icon: <CheckCircle size={48} color="#10b981" />,
        title: t('shopVerified'),
        message: t('shopVerifiedMessage'),
        color: "#10b981",
        bgColor: "#d1fae5",
      };
    }

    switch (status.verification_status) {
      case "pending":
        return {
          icon: <Clock size={48} color="#f59e0b" />,
          title: t('pendingVerification'),
          message: t('pendingVerificationMessage'),
          color: "#f59e0b",
          bgColor: "#fef3c7",
        };
      case "rejected":
        return {
          icon: <XCircle size={48} color="#ef4444" />,
          title: t('requestRejected'),
          message: status.rejection_reason || t('requestRejectedMessage'),
          color: "#ef4444",
          bgColor: "#fee2e2",
        };
      default:
        return {
          icon: <AlertTriangle size={48} color="#6b7280" />,
          title: t('verificationRequired'),
          message: t('verificationRequiredMessage'),
          color: "#6b7280",
          bgColor: "#f3f4f6",
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('verificationShort')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('verificationPage')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {statusInfo && (
          <View style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}>
            <View style={styles.statusIcon}>{statusInfo.icon}</View>
            <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
              {statusInfo.title}
            </Text>
            <Text style={styles.statusMessage}>{statusInfo.message}</Text>
          </View>
        )}

        {!status?.is_verified && status?.verification_status !== "pending" && (
          <>
            {/* Informations de paiement */}
            {paymentSettings && (
              <View style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentIconContainer}>
                    <Text style={styles.paymentIcon}>💳</Text>
                  </View>
                  <Text style={styles.paymentTitle}>{t('paymentBaridimob')}</Text>
                </View>

                <View style={styles.paymentInfo}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>{t('ccpNumber')}</Text>
                    <Text style={styles.paymentValue}>{paymentSettings.ccp_number}</Text>
                  </View>
                  
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>{t('ccpKey')}</Text>
                    <Text style={styles.paymentValue}>{paymentSettings.ccp_key}</Text>
                  </View>
                  
                  <View style={[styles.paymentRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.paymentLabel}>{t('accountHolder')}</Text>
                    <Text style={styles.paymentValue}>{paymentSettings.account_holder_name}</Text>
                  </View>
                  
                  <View style={styles.paymentAmountBox}>
                    <Text style={styles.paymentAmountLabel}>{t('amountToPay')}</Text>
                    <Text style={styles.paymentAmount}>{paymentSettings.subscription_amount} DA</Text>
                  </View>

                  {paymentSettings.additional_info && (
                    <View style={styles.paymentNote}>
                      <Text style={styles.paymentNoteText}>ℹ️  {paymentSettings.additional_info}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>{t('submitDocuments')}</Text>
              <Text style={styles.sectionDescription}>
                {t('submitDocumentsDesc')}
              </Text>

            {selectedImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={pickImage}
                >
                  <Text style={styles.changeButtonText}>{t('changeDocument')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Upload size={32} color="#6b7280" />
                <Text style={styles.uploadButtonText}>{t('selectDocument')}</Text>
                <Text style={styles.uploadButtonHint}>{t('documentHint')}</Text>
              </TouchableOpacity>
            )}

            {selectedImage && (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitVerification}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>{t('submitRequest')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            </View>
          </>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('whyVerification')}</Text>
          <Text style={styles.infoText}>
            {t('protectsAgainstFake')}{"\n"}
            {t('guaranteesQuality')}{"\n"}
            {t('strengthensTrust')}{"\n"}
            {t('accessAllFeatures')}
          </Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  statusIcon: {
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
  },
  uploadSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  uploadButtonHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  imagePreview: {
    alignItems: "center",
    gap: 12,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
  changeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 24,
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 0,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentHeader: {
    backgroundColor: "#10b981",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  paymentIcon: {
    fontSize: 18,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  paymentInfo: {
    padding: 14,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  paymentLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  paymentAmountBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#86efac",
  },
  paymentAmountLabel: {
    fontSize: 11,
    color: "#16a34a",
    marginBottom: 4,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  paymentAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#15803d",
  },
  paymentNote: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  paymentNoteText: {
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
});
