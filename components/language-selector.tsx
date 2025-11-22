import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Globe, Check, X } from 'lucide-react-native';
import { useLanguage } from '@/lib/i18n/language-context';

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  const languages = [
    { code: 'fr' as const, name: 'Français' },
    { code: 'ar' as const, name: 'العربية' },
    { code: 'en' as const, name: 'English' },
  ];

  const handleSelectLanguage = async (lang: 'fr' | 'ar' | 'en') => {
    await setLanguage(lang);
    setShowModal(false);
  };

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.iconContainer}>
          <Globe size={20} color="#6b7280" />
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>{t('language')}</Text>
          <Text style={styles.value}>{currentLanguage?.name}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    language === lang.code && styles.languageItemActive
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                >
                  <Text style={styles.languageName}>{lang.name}</Text>
                  {language === lang.code && (
                    <Check size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Info RTL */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 {language === 'ar' ? 'سيتم تطبيق الاتجاه من اليمين إلى اليسار' : 'L\'arabe s\'affiche de droite à gauche (RTL)'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    color: '#6b7280',
  },
  arrow: {
    fontSize: 24,
    color: '#d1d5db',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  languageList: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  languageItemActive: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#3b82f6',
    textAlign: 'center',
  },
});
