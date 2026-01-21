import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Star, CreditCard, Upload, Info, Clock, CheckCircle, XCircle, FileText, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_CONFIG } from '@/config';
import { useLanguage } from '@/lib/i18n/language-context';

export default function SubscriptionManagement() {
  const { t, isRTL } = useLanguage();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [amount, setAmount] = useState('');

  const buildDocumentUrl = (path?: string | null) => {
    if (!path) return null;
    const protocol = API_CONFIG.USE_HTTPS ? 'https' : 'http';
    const port = (API_CONFIG as any).PORT ? `:${(API_CONFIG as any).PORT}` : '';
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${protocol}://${API_CONFIG.SERVER_IP}${port}${normalized}`;
  };

  const handleOpenDocument = async (path?: string | null) => {
    const url = buildDocumentUrl(path);
    if (!url) {
      Alert.alert(t('error') || 'Erreur', t('unableToOpenDocument') || 'Document indisponible');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Erreur ouverture document:', error);
      Alert.alert(t('error') || 'Erreur', t('unableToOpenDocument') || 'Impossible d’ouvrir le document');
    }
  };

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      // Récupérer le statut d'abonnement
      const statusResponse = await fetch(`${API_URL}/subscription-invoices/subscription-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSubscriptionStatus(statusData);
      }

      // Récupérer les factures
      const invoicesResponse = await fetch(`${API_URL}/subscription-invoices/my-invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setInvoices(invoicesData);
      }

      // Récupérer les paramètres de paiement
      const paymentResponse = await fetch(`${API_URL}/payment-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        setPaymentSettings(paymentData);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUploadInvoice = async () => {
    try {
      // Demander la permission d'accéder à la galerie
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error') || 'Erreur', t('galleryPermissionMessage') || 'Permission requise pour accéder à la galerie');
        return;
      }

      // Sélectionner une image depuis la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setSelectedFile(file);
      setAmount(paymentSettings?.subscription_amount?.toString() || '');
      setShowAmountModal(true);
    } catch (error) {
      console.error('Erreur sélection document:', error);
      Alert.alert(t('error') || 'Erreur', t('unableToSelectDocument') || 'Impossible de sélectionner le document');
    }
  };

  const submitInvoice = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert(t('error') || 'Erreur', t('invalidAmount') || 'Montant invalide');
      return;
    }

    if (!selectedFile) return;

    setShowAmountModal(false);
    setUploading(true);

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const formData = new FormData();
      
      formData.append('invoice', {
        uri: selectedFile.uri,
        type: 'image/jpeg',
        name: 'invoice.jpg'
      } as any);
      
      formData.append('amount', amount);

      const response = await fetch(`${API_URL}/subscription-invoices/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        Alert.alert(t('success') || 'Succès', t('invoiceSubmitted') || 'Facture soumise avec succès');
        setSelectedFile(null);
        setAmount('');
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert(t('error') || 'Erreur', error.error || t('unableToSubmitInvoice') || 'Impossible de soumettre la facture');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      Alert.alert(t('error') || 'Erreur', t('errorOccurred') || 'Une erreur est survenue');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('pending') || 'En attente';
      case 'approved': return t('approved') || 'Approuvée';
      case 'rejected': return t('rejected') || 'Rejetée';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    if (!subscriptionStatus?.subscription_end_date) return 0;
    const endDate = new Date(subscriptionStatus.subscription_end_date);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const daysRemaining = getDaysRemaining();
  const isActive = subscriptionStatus?.is_subscribed && daysRemaining > 0;

  const latestInvoiceStatus = subscriptionStatus?.latest_invoice_status;
  const latestInvoiceDocument = subscriptionStatus?.latest_invoice_document;
  const latestInvoiceSubmittedAt = subscriptionStatus?.latest_invoice_submitted_at;
  const hasPendingInvoice = latestInvoiceStatus === 'pending';

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        backgroundColor: isActive ? '#10b981' : '#6b7280',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 10,
              borderRadius: 12
            }}
          >
            <ArrowLeft size={22} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>
            {t("subscription") || "Abonnement"}
          </Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Statut abonnement */}
        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: 14,
            borderRadius: 16,
            marginRight: 14
          }}>
            <Star size={28} color="white" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>
              {isActive ? (t("activeSubscription") || "Abonnement Actif") : (t("noSubscription") || "Pas d'abonnement")}
            </Text>
            {isActive && (
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 }}>
                {daysRemaining} {t("daysRemaining") || "jour(s) restant(s)"}
              </Text>
            )}
            {isActive && subscriptionStatus?.subscription_end_date && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
                {t("expiresOn") || "Expire le"} {formatDate(subscriptionStatus.subscription_end_date)}
              </Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Bandeau en attente de validation */}
        {hasPendingInvoice && (
          <View style={{
            backgroundColor: '#fff7ed',
            borderRadius: 18,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#fed7aa',
            shadowColor: '#f97316',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Clock size={18} color="#c2410c" strokeWidth={2.5} />
              <Text style={{ color: '#9a3412', fontWeight: '800', fontSize: 15, marginLeft: 8 }}>
                {t('waitingForValidation') || 'En attente de validation'}
              </Text>
            </View>
            {latestInvoiceSubmittedAt && (
              <Text style={{ color: '#9a3412', fontSize: 12, marginBottom: 10 }}>
                {t('submittedOn') || 'Soumise le'} {formatDate(latestInvoiceSubmittedAt)}
              </Text>
            )}
            {latestInvoiceDocument && (
              <TouchableOpacity
                onPress={() => handleOpenDocument(latestInvoiceDocument)}
                style={{
                  backgroundColor: '#fed7aa',
                  borderRadius: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FileText size={16} color="#9a3412" strokeWidth={2.5} />
                <Text style={{ color: '#9a3412', fontWeight: '700', marginLeft: 8 }}>
                  {t('viewPaymentProof') || 'Voir la preuve de paiement'}
                </Text>
              </TouchableOpacity>
            )}
            {!latestInvoiceDocument && (
              <Text style={{ color: '#9a3412', fontSize: 12, textAlign: 'center' }}>
                {t('paymentProofPending') || 'Votre preuve de paiement est en cours de consultation.'}
              </Text>
            )}
          </View>
        )}

        {/* Informations de paiement */}
        {paymentSettings && (
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                backgroundColor: '#dcfce7',
                padding: 10,
                borderRadius: 12,
                marginRight: 12
              }}>
                <CreditCard size={22} color="#16a34a" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
                {t("paymentInfo") || "Informations de paiement"}
              </Text>
            </View>

            <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, fontWeight: '600' }}>
                  {t("ccpNumber") || "Numéro CCP"}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {paymentSettings.ccp_number}
                </Text>
              </View>
              
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, fontWeight: '600' }}>
                  {t("key") || "Clé"}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {paymentSettings.ccp_key}
                </Text>
              </View>
              
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, fontWeight: '600' }}>
                  {t("accountHolder") || "Nom du titulaire"}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {paymentSettings.account_holder_name}
                </Text>
              </View>
            </View>

            <View style={{
              backgroundColor: '#dcfce7',
              borderRadius: 12,
              padding: 14,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 11, color: '#16a34a', marginBottom: 2, fontWeight: '600' }}>
                {t("amountToPay") || "Montant à payer"}
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#15803d' }}>
                {paymentSettings.subscription_amount} DA
              </Text>
            </View>

            {paymentSettings.additional_info && (
              <View style={{
                backgroundColor: '#fef3c7',
                borderRadius: 10,
                padding: 12,
                marginTop: 12
              }}>
                <Text style={{ fontSize: 13, color: '#92400e', lineHeight: 18 }}>
                  {paymentSettings.additional_info}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bouton soumettre facture */}
        <TouchableOpacity
          onPress={handleUploadInvoice}
          disabled={uploading}
          style={{
            backgroundColor: '#3b82f6',
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5
          }}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Upload size={22} color="white" strokeWidth={2.5} />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '800', marginLeft: 10 }}>
                {t("submitScreenshot") || "Soumettre la capture d'écran"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={{
          backgroundColor: '#eff6ff',
          borderRadius: 14,
          padding: 14,
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderLeftWidth: 4,
          borderLeftColor: '#3b82f6'
        }}>
          <Info size={20} color="#3b82f6" strokeWidth={2.5} style={{ marginTop: 2 }} />
          <Text style={{ color: '#1e40af', marginLeft: 10, flex: 1, fontSize: 13, lineHeight: 19 }}>
            {t("paymentInstructions") || "Effectuez le paiement via Baridimob puis soumettez la capture d'écran. Une fois approuvée par l'admin, vous recevrez 1 mois d'abonnement."}
          </Text>
        </View>

        {/* Historique des factures */}
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 }}>
          {t("myInvoices") || "Mes factures"}
        </Text>

        {invoices.map((invoice) => (
          <View key={invoice.id} style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: `${getStatusColor(invoice.status)}15`
              }}>
                <Text style={{ color: getStatusColor(invoice.status), fontWeight: '700', fontSize: 12 }}>
                  {getStatusText(invoice.status)}
                </Text>
              </View>
              <Text style={{ color: '#111827', fontWeight: '800', fontSize: 17 }}>{invoice.amount} DA</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Clock size={14} color="#6b7280" strokeWidth={2.5} />
              <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 6 }}>
                {t("submittedOn") || "Soumise le"} {formatDate(invoice.submitted_at)}
              </Text>
            </View>

            {invoice.status === 'approved' && invoice.reviewed_by_name && (
              <View style={{ backgroundColor: '#dcfce7', borderRadius: 10, padding: 12, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={16} color="#16a34a" strokeWidth={2.5} />
                  <Text style={{ color: '#15803d', fontWeight: '700', marginLeft: 6, fontSize: 13 }}>
                    {t("approvedBy") || "Approuvée par"} {invoice.reviewed_by_name}
                  </Text>
                </View>
                {invoice.subscription_start_date && invoice.subscription_end_date && (
                  <Text style={{ color: '#16a34a', fontSize: 11, marginTop: 4 }}>
                    {t("subscription") || "Abonnement"}: {formatDate(invoice.subscription_start_date)} → {formatDate(invoice.subscription_end_date)}
                  </Text>
                )}
              </View>
            )}

            {invoice.status === 'rejected' && invoice.rejection_reason && (
              <View style={{ backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <XCircle size={16} color="#dc2626" strokeWidth={2.5} />
                  <Text style={{ color: '#dc2626', fontWeight: '700', marginLeft: 6, fontSize: 13 }}>
                    {t("rejected") || "Rejetée"}
                  </Text>
                </View>
                <Text style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{invoice.rejection_reason}</Text>
              </View>
            )}

            {invoice.status === 'pending' && (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={16} color="#f59e0b" strokeWidth={2.5} />
                <Text style={{ color: '#d97706', fontSize: 12, marginLeft: 6, fontWeight: '600' }}>
                  {t("waitingForValidation") || "En attente de validation"}
                </Text>
              </View>
            )}
          </View>
        ))}

        {invoices.length === 0 && (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <FileText size={56} color="#d1d5db" strokeWidth={1.5} />
            <Text style={{ color: '#9ca3af', fontSize: 15, marginTop: 12, fontWeight: '600' }}>
              {t("noInvoicesSubmitted") || "Aucune facture soumise"}
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal pour entrer le montant */}
      <Modal
        visible={showAmountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAmountModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                {t("invoiceAmount") || "Montant de la facture"}
              </Text>
              <TouchableOpacity onPress={() => setShowAmountModal(false)}>
                <X size={22} color="#6b7280" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              {t("enterAmountDA") || "Entrez le montant en DA:"}
            </Text>

            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="2000"
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 12,
                padding: 14,
                fontSize: 18,
                fontWeight: '700',
                color: '#111827',
                textAlign: 'center',
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#e5e7eb'
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowAmountModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#6b7280', fontSize: 15, fontWeight: '700' }}>
                  {t("cancel") || "Annuler"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitInvoice}
                style={{
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                  {t("submit") || "Soumettre"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
