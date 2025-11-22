import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { X, PackageX, AlertCircle } from 'lucide-react-native'

const { height } = Dimensions.get('window')

interface ReturnModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  customerName?: string
  returnsCount?: number
}

export function ReturnModal({ visible, onClose, onConfirm, customerName, returnsCount = 0 }: ReturnModalProps) {
  const [reason, setReason] = useState('')
  const [selectedReason, setSelectedReason] = useState<string | null>(null)

  const predefinedReasons = [
    { id: 'defective', label: 'Produit défectueux', icon: '🔧' },
    { id: 'wrong', label: 'Mauvais produit', icon: '❌' },
    { id: 'damaged', label: 'Colis endommagé', icon: '📦' },
    { id: 'notAsDescribed', label: 'Non conforme', icon: '⚠️' },
    { id: 'other', label: 'Autre raison', icon: '💬' },
  ]

  const handleConfirm = () => {
    const finalReason = selectedReason 
      ? predefinedReasons.find(r => r.id === selectedReason)?.label + (reason ? `: ${reason}` : '')
      : reason || 'Retour client'
    
    onConfirm(finalReason)
    setReason('')
    setSelectedReason(null)
  }

  const handleClose = () => {
    setReason('')
    setSelectedReason(null)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <PackageX size={28} color="#f97316" />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Signaler un retour</Text>
              <Text style={styles.subtitle}>
                {customerName ? `Client: ${customerName}` : 'Enregistrer le retour du colis'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Warning if multiple returns */}
          {returnsCount >= 1 && (
            <View style={styles.warningBox}>
              <AlertCircle size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                {`Ce client a déjà effectué ${returnsCount} retour${returnsCount > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}

          {/* Predefined reasons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raison du retour</Text>
            <View style={styles.reasonsGrid}>
              {predefinedReasons.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.reasonChip,
                    selectedReason === item.id && styles.reasonChipSelected
                  ]}
                  onPress={() => setSelectedReason(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reasonIcon}>{item.icon}</Text>
                  <Text style={[
                    styles.reasonLabel,
                    selectedReason === item.id && styles.reasonLabelSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom reason input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails supplémentaires (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="Précisez la raison du retour..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                !selectedReason && !reason && styles.confirmButtonDisabled
              ]} 
              onPress={handleConfirm}
              disabled={!selectedReason && !reason}
              activeOpacity={0.7}
            >
              <PackageX size={20} color="#fff" /><Text style={styles.confirmButtonText}>Confirmer le retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 20,
    marginBottom: 0,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  section: {
    padding: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  reasonChipSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  reasonIcon: {
    fontSize: 16,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  reasonLabelSelected: {
    color: '#f97316',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})
