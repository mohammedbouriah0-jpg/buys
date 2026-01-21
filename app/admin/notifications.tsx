import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useKeyboardScroll } from '@/hooks/useKeyboardScroll';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Send, Users, Store, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { API_URL } from '@/config';

type TargetType = 'all' | 'clients' | 'shops';

export default function AdminNotifications() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<TargetType>('all');
  const [sending, setSending] = useState(false);
  
  // Keyboard scroll
  const { scrollViewRef, keyboardHeight, scrollToInput } = useKeyboardScroll();

  if (user?.type !== 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ef4444', fontSize: 16 }}>{t('accessDenied')}</Text>
      </View>
    );
  }

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert(t('error'), t('fillTitleAndMessage'));
      return;
    }

    Alert.alert(
      t('confirmSend'),
      `${t('confirmSendMessage')} ${target === 'all' ? t('allUsers') : target === 'clients' ? t('clientsOnly') : t('shopsOnly')} ?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('sendNotification'),
          onPress: async () => {
            setSending(true);
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/send-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  title: title.trim(),
                  body: body.trim(),
                  target,
                }),
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert(
                  t('success'),
                  `${t('notificationSent')} ${data.sent_count || 0} ${t('users')}`,
                  [{ text: 'OK', onPress: () => {
                    setTitle('');
                    setBody('');
                  }}]
                );
              } else {
                Alert.alert(t('error'), data.error || t('sendError'));
              }
            } catch (error) {
              console.error('Error sending notification:', error);
              Alert.alert(t('error'), t('sendError'));
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const targetOptions: { value: TargetType; label: string; icon: any; color: string }[] = [
    { value: 'all', label: t('allUsers'), icon: Users, color: '#3b82f6' },
    { value: 'clients', label: t('clientsOnly'), icon: User, color: '#10b981' },
    { value: 'shops', label: t('shopsOnly'), icon: Store, color: '#f59e0b' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#f3f4f6',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: isRTL ? 0 : 12,
            marginLeft: isRTL ? 12 : 0,
          }}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '800',
            color: '#111827',
            textAlign: isRTL ? 'right' : 'left',
          }}>
            {t('pushNotifications')}
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#6b7280',
            textAlign: isRTL ? 'right' : 'left',
          }}>
            {t('sendAnnouncementToAll')}
          </Text>
        </View>
      </View>

      <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: keyboardHeight + 50 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info */}
          <View style={{
            backgroundColor: '#fef3c7',
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}>
            <Bell size={20} color="#d97706" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={{ flex: 1, color: '#92400e', fontSize: 13, lineHeight: 18 }}>
              {t('notificationWarning')}
            </Text>
          </View>

          {/* Cible */}
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#374151',
            marginBottom: 10,
          }}>
            {t('recipients')}
          </Text>
          
          <View style={{ marginBottom: 20 }}>
            {targetOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setTarget(option.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 8,
                  backgroundColor: target === option.value ? `${option.color}15` : '#f9fafb',
                  borderWidth: 2,
                  borderColor: target === option.value ? option.color : '#e5e7eb',
                }}
              >
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: target === option.value ? option.color : '#e5e7eb',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <option.icon size={18} color={target === option.value ? '#ffffff' : '#9ca3af'} />
                </View>
                <Text style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: target === option.value ? option.color : '#6b7280',
                }}>
                  {option.label}
                </Text>
                {target === option.value && (
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: option.color,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Titre */}
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#374151',
            marginBottom: 8,
          }}>
            {t('notificationTitle')}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('notificationTitlePlaceholder')}
            placeholderTextColor="#9ca3af"
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: '#111827',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              marginBottom: 16,
            }}
            maxLength={50}
          />

          {/* Message */}
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#374151',
            marginBottom: 8,
          }}>
            {t('notificationMessage')}
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('notificationMessagePlaceholder')}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: '#111827',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              marginBottom: 24,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
            maxLength={200}
          />

          {/* Prévisualisation */}
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#374151',
            marginBottom: 10,
          }}>
            {t('preview')}
          </Text>
          <View style={{
            backgroundColor: '#1f2937',
            borderRadius: 14,
            padding: 14,
            marginBottom: 24,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: '#ec4899',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
              }}>
                <Bell size={14} color="#fff" />
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 11 }}>BUYS • now</Text>
            </View>
            <Text style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: '700',
              marginBottom: 4,
            }}>
              {title || t('notificationTitle')}
            </Text>
            <Text style={{
              color: '#d1d5db',
              fontSize: 13,
              lineHeight: 18,
            }} numberOfLines={2}>
              {body || t('notificationMessage')}
            </Text>
          </View>

          {/* Bouton envoyer */}
          <TouchableOpacity
            onPress={sendNotification}
            disabled={sending || !title.trim() || !body.trim()}
            style={{
              backgroundColor: sending || !title.trim() || !body.trim() ? '#d1d5db' : '#ec4899',
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#ec4899',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: '800',
                }}>
                  {t('sendNotification')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
    </View>
  );
}
