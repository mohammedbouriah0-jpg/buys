import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Download, RefreshCw } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface ForceUpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  updateMessage: string;
  onUpdate: () => void;
  onRetry?: () => void;
}

/**
 * Modal de mise à jour forcée
 * S'affiche en plein écran et bloque l'utilisation de l'app
 * jusqu'à ce que l'utilisateur mette à jour
 */
export function ForceUpdateModal({
  visible,
  currentVersion,
  latestVersion,
  updateMessage,
  onUpdate,
  onRetry,
}: ForceUpdateModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Illustration */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Download size={64} color="#3b82f6" />
          </View>
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <Text style={styles.title}>Mise à jour requise</Text>
          
          <Text style={styles.message}>
            {updateMessage || 'Une nouvelle version de l\'application est disponible. Veuillez mettre à jour pour continuer.'}
          </Text>

          {/* Versions */}
          <View style={styles.versionContainer}>
            <View style={styles.versionBox}>
              <Text style={styles.versionLabel}>Version actuelle</Text>
              <Text style={styles.versionValue}>{currentVersion}</Text>
            </View>
            <View style={styles.arrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
            <View style={[styles.versionBox, styles.versionBoxNew]}>
              <Text style={styles.versionLabel}>Nouvelle version</Text>
              <Text style={[styles.versionValue, styles.versionValueNew]}>{latestVersion}</Text>
            </View>
          </View>

          {/* Boutons */}
          <TouchableOpacity style={styles.updateButton} onPress={onUpdate}>
            <Download size={20} color="#fff" />
            <Text style={styles.updateButtonText}>
              {Platform.OS === 'ios' ? 'Ouvrir l\'App Store' : 'Ouvrir Play Store'}
            </Text>
          </TouchableOpacity>

          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <RefreshCw size={16} color="#6b7280" />
              <Text style={styles.retryButtonText}>Vérifier à nouveau</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cette mise à jour est nécessaire pour garantir{'\n'}
            la sécurité et les meilleures performances.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#bfdbfe',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  versionBox: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  versionBoxNew: {
    backgroundColor: '#dcfce7',
  },
  versionLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  versionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  versionValueNew: {
    color: '#16a34a',
  },
  arrow: {
    paddingHorizontal: 16,
  },
  arrowText: {
    fontSize: 24,
    color: '#9ca3af',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    gap: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
