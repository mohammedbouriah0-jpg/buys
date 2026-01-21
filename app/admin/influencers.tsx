import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Users, Instagram, Youtube, TrendingUp, Edit2, Trash2, Plus, X, DollarSign, Ticket } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';
import { useLanguage } from '@/lib/i18n/language-context';

interface Influencer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  commission_rate: number;
  total_earnings: number;
  is_active: boolean;
  notes: string | null;
  promo_codes_count: number;
  total_commissions: number;
  created_at: string;
}

export default function InfluencersScreen() {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    commission_rate: '10',
    notes: ''
  });

  useEffect(() => {
    fetchInfluencers();
  }, []);

  const fetchInfluencers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/influencers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInfluencers(data);
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
    fetchInfluencers();
  };

  const openCreateModal = () => {
    setEditingInfluencer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      commission_rate: '10',
      notes: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (influencer: Influencer) => {
    setEditingInfluencer(influencer);
    setFormData({
      name: influencer.name,
      email: influencer.email || '',
      phone: influencer.phone || '',
      instagram: influencer.instagram || '',
      tiktok: influencer.tiktok || '',
      youtube: influencer.youtube || '',
      commission_rate: influencer.commission_rate?.toString() || '10',
      notes: influencer.notes || ''
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const url = editingInfluencer 
        ? `${API_URL}/admin/influencers/${editingInfluencer.id}`
        : `${API_URL}/admin/influencers`;
      
      const response = await fetch(url, {
        method: editingInfluencer ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          instagram: formData.instagram || null,
          tiktok: formData.tiktok || null,
          youtube: formData.youtube || null,
          commission_rate: parseFloat(formData.commission_rate) || 10,
          notes: formData.notes || null
        })
      });

      if (response.ok) {
        Alert.alert('Succès', editingInfluencer ? 'Influenceur modifié' : 'Influenceur créé');
        setModalVisible(false);
        fetchInfluencers();
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

  const handleDelete = (influencer: Influencer) => {
    Alert.alert(
      'Supprimer l\'influenceur',
      `Voulez-vous vraiment supprimer "${influencer.name}" ? Ses codes promo seront dissociés mais conservés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/influencers/${influencer.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.ok) {
                fetchInfluencers();
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

  const toggleActive = async (influencer: Influencer) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_URL}/admin/influencers/${influencer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !influencer.is_active })
      });
      fetchInfluencers();
    } catch (error) {
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  // Calculate totals
  const totalInfluencers = influencers.length;
  const totalCommissions = influencers.reduce((sum, i) => sum + (i.total_commissions || 0), 0);
  const totalCodes = influencers.reduce((sum, i) => sum + (i.promo_codes_count || 0), 0);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ec4899',
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
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Influenceurs</Text>
          <TouchableOpacity onPress={() => router.push('/admin/promo-codes')} style={{ padding: 8 }}>
            <Ticket size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View style={{ backgroundColor: '#fce7f3', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 }}>
              <Users size={18} color="#ec4899" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111' }}>{totalInfluencers}</Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Influenceurs</Text>
          </View>

          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View style={{ backgroundColor: '#dcfce7', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 }}>
              <DollarSign size={18} color="#22c55e" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111' }}>{totalCommissions.toLocaleString()}</Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>DA Commissions</Text>
          </View>

          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View style={{ backgroundColor: '#f3e8ff', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 }}>
              <Ticket size={18} color="#8b5cf6" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111' }}>{totalCodes}</Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Codes</Text>
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={openCreateModal}
          style={{
            backgroundColor: '#ec4899',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
            borderRadius: 12,
            marginBottom: 16
          }}
        >
          <Plus size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>Nouvel influenceur</Text>
        </TouchableOpacity>

        {/* Influencers List */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 }}>
          Liste des influenceurs
        </Text>

        {influencers.map((influencer) => (
          <View key={influencer.id} style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            borderLeftWidth: 4,
            borderLeftColor: influencer.is_active ? '#ec4899' : '#9ca3af'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{influencer.name}</Text>
                  {!influencer.is_active && (
                    <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                      <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600' }}>INACTIF</Text>
                    </View>
                  )}
                </View>
                {influencer.email && (
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{influencer.email}</Text>
                )}
              </View>
              <View style={{ backgroundColor: '#fce7f3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ec4899' }}>{influencer.commission_rate}%</Text>
              </View>
            </View>

            {/* Social Links */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {influencer.instagram && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Instagram size={14} color="#E4405F" />
                  <Text style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>{influencer.instagram}</Text>
                </View>
              )}
              {influencer.tiktok && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>TikTok: {influencer.tiktok}</Text>
                </View>
              )}
              {influencer.youtube && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Youtube size={14} color="#FF0000" />
                  <Text style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>{influencer.youtube}</Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{influencer.promo_codes_count || 0}</Text>
                <Text style={{ fontSize: 10, color: '#6b7280' }}>Codes promo</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#e5e7eb' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#22c55e' }}>{(influencer.total_commissions || 0).toLocaleString()} DA</Text>
                <Text style={{ fontSize: 10, color: '#6b7280' }}>Commissions</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => toggleActive(influencer)}
                style={{
                  flex: 1,
                  backgroundColor: influencer.is_active ? '#fef2f2' : '#f0fdf4',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: influencer.is_active ? '#dc2626' : '#22c55e', fontWeight: '600', fontSize: 12 }}>
                  {influencer.is_active ? 'Désactiver' : 'Activer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openEditModal(influencer)}
                style={{ backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8 }}
              >
                <Edit2 size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(influencer)}
                style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 }}
              >
                <Trash2 size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {influencers.length === 0 && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Users size={48} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', marginTop: 12 }}>Aucun influenceur</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Create/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>{editingInfluencer ? 'Modifier' : 'Nouvel influenceur'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Name */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Nom *</Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nom de l'influenceur"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Email */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Email</Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Phone */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Téléphone</Text>
              <TextInput
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="0X XX XX XX XX"
                keyboardType="phone-pad"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Instagram */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Instagram</Text>
              <TextInput
                value={formData.instagram}
                onChangeText={(text) => setFormData({ ...formData, instagram: text })}
                placeholder="@username"
                autoCapitalize="none"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* TikTok */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>TikTok</Text>
              <TextInput
                value={formData.tiktok}
                onChangeText={(text) => setFormData({ ...formData, tiktok: text })}
                placeholder="@username"
                autoCapitalize="none"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* YouTube */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>YouTube</Text>
              <TextInput
                value={formData.youtube}
                onChangeText={(text) => setFormData({ ...formData, youtube: text })}
                placeholder="Nom de la chaîne"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Commission Rate */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Taux de commission (%)</Text>
              <TextInput
                value={formData.commission_rate}
                onChangeText={(text) => setFormData({ ...formData, commission_rate: text })}
                placeholder="10"
                keyboardType="numeric"
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 }}
              />

              {/* Notes */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Notes</Text>
              <TextInput
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Notes internes..."
                multiline
                numberOfLines={3}
                style={{ backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 24, fontSize: 16, textAlignVertical: 'top', minHeight: 80 }}
              />

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: '#ec4899',
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
                    {editingInfluencer ? 'Enregistrer' : 'Créer'}
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
