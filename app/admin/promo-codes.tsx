import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Ticket, Users, TrendingUp, Percent, Hash, Calendar, Edit2, Trash2, Plus, X, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';
import { useLanguage } from '@/lib/i18n/language-context';

interface PromoCode {
  id: number;
  code: string;
  influencer_id: number | null;
  influencer_name: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  applies_to: 'all' | 'subscription' | 'products';
  description: string | null;
  total_uses: number;
  total_discounts: number;
}

interface Influencer {
  id: number;
  name: string;
}

interface PromoStats {
  global: {
    total_codes: number;
    total_influencers: number;
    total_uses: number;
    total_discounts: number;
    total_commissions: number;
  };
  top_codes: Array<{ code: string; total_uses: number; total_discounts: number }>;
  top_influencers: Array<{ name: string; total_uses: number; total_earned: number }>;
}

export default function PromoCodesScreen() {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    influencer_id: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '0',
    max_discount: '',
    usage_limit: '',
    valid_until: '',
    applies_to: 'subscription' as 'all' | 'subscription' | 'products',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [codesRes, influencersRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/promo-codes`, { headers }),
        fetch(`${API_URL}/admin/influencers`, { headers }),
        fetch(`${API_URL}/admin/promo-stats`, { headers })
      ]);

      if (codesRes.ok) {
        const data = await codesRes.json();
        setPromoCodes(data);
      }
      if (influencersRes.ok) {
        const data = await influencersRes.json();
        setInfluencers(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openCreateModal = () => {
    setEditingCode(null);
    setFormData({
      code: '',
      influencer_id: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '0',
      max_discount: '',
      usage_limit: '',
      valid_until: '',
      applies_to: 'subscription',
      description: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (promoCode: PromoCode) => {
    setEditingCode(promoCode);
    setFormData({
      code: promoCode.code,
      influencer_id: promoCode.influencer_id?.toString() || '',
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value.toString(),
      min_order_amount: promoCode.min_order_amount?.toString() || '0',
      max_discount: promoCode.max_discount?.toString() || '',
      usage_limit: promoCode.usage_limit?.toString() || '',
      valid_until: promoCode.valid_until?.split('T')[0] || '',
      applies_to: promoCode.applies_to,
      description: promoCode.description || ''
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.discount_value) {
      Alert.alert('Erreur', 'Code et valeur de réduction requis');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const url = editingCode 
        ? `${API_URL}/admin/promo-codes/${editingCode.id}`
        : `${API_URL}/admin/promo-codes`;
      
      const response = await fetch(url, {
        method: editingCode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: formData.code,
          influencer_id: formData.influencer_id ? parseInt(formData.influencer_id) : null,
          discount_type: formData.discount_type,
          discount_value: parseFloat(formData.discount_value),
          min_order_amount: parseFloat(formData.min_order_amount) || 0,
          max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          valid_until: formData.valid_until || null,
          applies_to: formData.applies_to,
          description: formData.description || null
        })
      });

      if (response.ok) {
        Alert.alert('Succès', editingCode ? 'Code promo modifié' : 'Code promo créé');
        setModalVisible(false);
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert('Erreur', error.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (promoCode: PromoCode) => {
    Alert.alert(
      'Supprimer le code',
      `Voulez-vous vraiment supprimer le code "${promoCode.code}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/promo-codes/${promoCode.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.ok) {
                fetchData();
              } else {
                Alert.alert('Erreur', 'Impossible de supprimer');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Erreur de connexion');
            }
          }
        }
      ]
    );
  };

  const toggleActive = async (promoCode: PromoCode) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_URL}/admin/promo-codes/${promoCode.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !promoCode.is_active })
      });
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#8b5cf6',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 14,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Codes Promo</Text>
          <TouchableOpacity onPress={() => router.push('/admin/influencers')} style={{ padding: 8 }}>
            <Users size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        {stats && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 10 }}>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#f3e8ff', padding: 8, borderRadius: 8 }}>
                  <Ticket size={18} color="#8b5cf6" />
                </View>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#111' }}>{stats.global.total_codes}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Codes actifs</Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#dcfce7', padding: 8, borderRadius: 8 }}>
                  <TrendingUp size={18} color="#22c55e" />
                </View>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#111' }}>{stats.global.total_uses}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Utilisations</Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#fef3c7', padding: 8, borderRadius: 8 }}>
                  <Percent size={18} color="#f59e0b" />
                </View>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#111' }}>{stats.global.total_discounts.toLocaleString()} DA</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Réductions totales</Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#dbeafe', padding: 8, borderRadius: 8 }}>
                  <Users size={18} color="#3b82f6" />
                </View>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#111' }}>{stats.global.total_commissions.toLocaleString()} DA</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Commissions</Text>
            </View>
          </View>
        )}

        {/* Add Button */}
        <TouchableOpacity
          onPress={openCreateModal}
          style={{
            backgroundColor: '#8b5cf6',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
            borderRadius: 12,
            marginBottom: 16
          }}
        >
          <Plus size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>Nouveau code promo</Text>
        </TouchableOpacity>

        {/* Promo Codes List */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 }}>
          Tous les codes ({promoCodes.length})
        </Text>

        {promoCodes.map((code) => (
          <View key={code.id} style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            borderLeftWidth: 4,
            borderLeftColor: code.is_active ? '#22c55e' : '#9ca3af'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', letterSpacing: 1 }}>{code.code}</Text>
                  {!code.is_active && (
                    <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                      <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600' }}>INACTIF</Text>
                    </View>
                  )}
                </View>
                {code.influencer_name && (
                  <Text style={{ fontSize: 12, color: '#8b5cf6', fontWeight: '600' }}>
                    👤 {code.influencer_name}
                  </Text>
                )}
              </View>
              <View style={{ backgroundColor: code.discount_type === 'percentage' ? '#f3e8ff' : '#dbeafe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: code.discount_type === 'percentage' ? '#8b5cf6' : '#3b82f6' }}>
                  {code.discount_type === 'percentage' ? `-${code.discount_value}%` : `-${code.discount_value} DA`}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{code.total_uses || 0}</Text>
                <Text style={{ fontSize: 10, color: '#6b7280' }}>Utilisations</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#e5e7eb' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>
                  {code.usage_limit ? `${code.usage_count || 0}/${code.usage_limit}` : '∞'}
                </Text>
                <Text style={{ fontSize: 10, color: '#6b7280' }}>Limite</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#e5e7eb' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#22c55e' }}>{(code.total_discounts || 0).toLocaleString()}</Text>
                <Text style={{ fontSize: 10, color: '#6b7280' }}>DA économisés</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => toggleActive(code)}
                style={{
                  flex: 1,
                  backgroundColor: code.is_active ? '#fef2f2' : '#f0fdf4',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: code.is_active ? '#dc2626' : '#22c55e', fontWeight: '600', fontSize: 12 }}>
                  {code.is_active ? 'Désactiver' : 'Activer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openEditModal(code)}
                style={{ backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8 }}
              >
                <Edit2 size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(code)}
                style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 }}
              >
                <Trash2 size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {promoCodes.length === 0 && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ticket size={48} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', marginTop: 12 }}>Aucun code promo</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Create/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>{editingCode ? 'Modifier le code' : 'Nouveau code promo'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Code */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Code promo *</Text>
              <TextInput
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                placeholder="Ex: PROMO20"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16, fontWeight: '600' }}
                autoCapitalize="characters"
              />

              {/* Influencer */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Influenceur (optionnel)</Text>
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: formData.influencer_id ? '#111' : '#9ca3af' }}>
                    {formData.influencer_id 
                      ? influencers.find(i => i.id.toString() === formData.influencer_id)?.name || 'Sélectionner'
                      : 'Aucun influenceur'}
                  </Text>
                  <ChevronDown size={20} color="#6b7280" />
                </TouchableOpacity>
                {influencers.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                    <TouchableOpacity
                      onPress={() => setFormData({ ...formData, influencer_id: '' })}
                      style={{ padding: 12, backgroundColor: !formData.influencer_id ? '#f3e8ff' : 'transparent' }}
                    >
                      <Text style={{ color: '#6b7280' }}>Aucun</Text>
                    </TouchableOpacity>
                    {influencers.map((inf) => (
                      <TouchableOpacity
                        key={inf.id}
                        onPress={() => setFormData({ ...formData, influencer_id: inf.id.toString() })}
                        style={{ padding: 12, backgroundColor: formData.influencer_id === inf.id.toString() ? '#f3e8ff' : 'transparent' }}
                      >
                        <Text style={{ color: '#111', fontWeight: formData.influencer_id === inf.id.toString() ? '600' : '400' }}>{inf.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Discount Type */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Type de réduction *</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, discount_type: 'percentage' })}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 10,
                    backgroundColor: formData.discount_type === 'percentage' ? '#8b5cf6' : '#f3f4f6',
                    alignItems: 'center'
                  }}
                >
                  <Percent size={20} color={formData.discount_type === 'percentage' ? '#fff' : '#6b7280'} />
                  <Text style={{ marginTop: 4, fontWeight: '600', color: formData.discount_type === 'percentage' ? '#fff' : '#6b7280' }}>Pourcentage</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, discount_type: 'fixed' })}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 10,
                    backgroundColor: formData.discount_type === 'fixed' ? '#8b5cf6' : '#f3f4f6',
                    alignItems: 'center'
                  }}
                >
                  <Hash size={20} color={formData.discount_type === 'fixed' ? '#fff' : '#6b7280'} />
                  <Text style={{ marginTop: 4, fontWeight: '600', color: formData.discount_type === 'fixed' ? '#fff' : '#6b7280' }}>Montant fixe</Text>
                </TouchableOpacity>
              </View>

              {/* Discount Value */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                Valeur {formData.discount_type === 'percentage' ? '(%)' : '(DA)'} *
              </Text>
              <TextInput
                value={formData.discount_value}
                onChangeText={(text) => setFormData({ ...formData, discount_value: text })}
                placeholder={formData.discount_type === 'percentage' ? 'Ex: 20' : 'Ex: 500'}
                keyboardType="numeric"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Min Order */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Montant minimum (DA)</Text>
              <TextInput
                value={formData.min_order_amount}
                onChangeText={(text) => setFormData({ ...formData, min_order_amount: text })}
                placeholder="0"
                keyboardType="numeric"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Max Discount */}
              {formData.discount_type === 'percentage' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Réduction max (DA)</Text>
                  <TextInput
                    value={formData.max_discount}
                    onChangeText={(text) => setFormData({ ...formData, max_discount: text })}
                    placeholder="Ex: 1000 (laisser vide pour illimité)"
                    keyboardType="numeric"
                    style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
                  />
                </>
              )}

              {/* Usage Limit */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Limite d'utilisation</Text>
              <TextInput
                value={formData.usage_limit}
                onChangeText={(text) => setFormData({ ...formData, usage_limit: text })}
                placeholder="Laisser vide pour illimité"
                keyboardType="numeric"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Valid Until */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Date d'expiration</Text>
              <TextInput
                value={formData.valid_until}
                onChangeText={(text) => setFormData({ ...formData, valid_until: text })}
                placeholder="AAAA-MM-JJ (ex: 2025-12-31)"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Applies To */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>S'applique à</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['subscription', 'products', 'all'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setFormData({ ...formData, applies_to: type })}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: formData.applies_to === type ? '#8b5cf6' : '#f3f4f6',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: formData.applies_to === type ? '#fff' : '#6b7280' }}>
                      {type === 'subscription' ? 'Abonnement' : type === 'products' ? 'Produits' : 'Tout'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Description</Text>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Description du code promo..."
                multiline
                numberOfLines={3}
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 24, fontSize: 16, textAlignVertical: 'top', minHeight: 80 }}
              />

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: '#8b5cf6',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 40
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                    {editingCode ? 'Enregistrer' : 'Créer le code'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
