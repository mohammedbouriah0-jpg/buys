import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
} from 'react-native';
import { X, Plus, Trash2, Package, Tag, Edit3 } from 'lucide-react-native';

// Nouvelle interface flexible - chaque variante a des attributs libres
interface Variant {
  attributes: { [key: string]: string }; // ex: { "Taille": "L", "Couleur": "Noir" }
  stock: string;
  price?: string; // Prix optionnel spécifique à cette variante
}

interface VariantManagerProps {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
}

export function VariantManager({ variants, onChange }: VariantManagerProps) {
  const [newAttributeName, setNewAttributeName] = useState('');
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  
  // Liste des attributs utilisés (ex: ["Taille", "Couleur"])
  const getUsedAttributes = (): string[] => {
    const attrs = new Set<string>();
    variants.forEach(v => {
      Object.keys(v.attributes).forEach(key => attrs.add(key));
    });
    return Array.from(attrs);
  };

  const usedAttributes = getUsedAttributes();

  // Suggestions d'attributs
  const attributeSuggestions = ['Taille', 'Couleur', 'Pointure', 'Matière', 'Style', 'Modèle', 'Capacité', 'Poids'];
  const availableSuggestions = attributeSuggestions.filter(s => !usedAttributes.includes(s));

  const addVariant = () => {
    const newVariant: Variant = {
      attributes: {},
      stock: '1',
    };
    // Copier les attributs existants avec valeurs vides
    usedAttributes.forEach(attr => {
      newVariant.attributes[attr] = '';
    });
    onChange([...variants, newVariant]);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const updateVariantAttribute = (variantIndex: number, attrName: string, value: string) => {
    const newVariants = [...variants];
    newVariants[variantIndex] = {
      ...newVariants[variantIndex],
      attributes: {
        ...newVariants[variantIndex].attributes,
        [attrName]: value,
      },
    };
    onChange(newVariants);
  };

  const updateVariantStock = (index: number, stock: string) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], stock };
    onChange(newVariants);
  };

  const addNewAttribute = (attrName: string) => {
    if (!attrName.trim()) return;
    
    // Ajouter l'attribut à toutes les variantes existantes
    const newVariants = variants.map(v => ({
      ...v,
      attributes: { ...v.attributes, [attrName.trim()]: '' },
    }));
    onChange(newVariants);
    setNewAttributeName('');
    setShowAddAttribute(false);
  };

  const removeAttribute = (attrName: string) => {
    // Supprimer l'attribut de toutes les variantes
    const newVariants = variants.map(v => {
      const { [attrName]: removed, ...rest } = v.attributes;
      return { ...v, attributes: rest };
    });
    onChange(newVariants);
  };

  return (
    <View style={styles.container}>
      {/* Header moderne */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Package size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Variantes</Text>
            <Text style={styles.headerSubtitle}>
              {variants.length} variante{variants.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={addVariant} style={styles.addButton}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Attributs utilisés (tags) */}
      {usedAttributes.length > 0 && (
        <View style={styles.attributesSection}>
          <Text style={styles.sectionLabel}>Attributs actifs</Text>
          <View style={styles.tagsContainer}>
            {usedAttributes.map((attr) => (
              <View key={attr} style={styles.attributeTag}>
                <Tag size={12} color="#3b82f6" />
                <Text style={styles.attributeTagText}>{attr}</Text>
                <TouchableOpacity 
                  onPress={() => removeAttribute(attr)}
                  style={styles.removeTagButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={12} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Bouton ajouter un attribut */}
            {!showAddAttribute ? (
              <TouchableOpacity 
                onPress={() => setShowAddAttribute(true)}
                style={styles.addAttributeButton}
              >
                <Plus size={14} color="#3b82f6" />
                <Text style={styles.addAttributeText}>Attribut</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Formulaire ajout attribut */}
      {showAddAttribute && (
        <View style={styles.addAttributeForm}>
          <View style={styles.addAttributeInputContainer}>
            <Edit3 size={16} color="#9ca3af" />
            <TextInput
              value={newAttributeName}
              onChangeText={setNewAttributeName}
              placeholder="Nom de l'attribut (ex: Taille, Couleur...)"
              placeholderTextColor="#9ca3af"
              style={styles.addAttributeInput}
              autoFocus
            />
          </View>
          
          {/* Suggestions rapides */}
          {availableSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {availableSuggestions.slice(0, 4).map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  onPress={() => addNewAttribute(suggestion)}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <View style={styles.addAttributeActions}>
            <TouchableOpacity 
              onPress={() => {
                setShowAddAttribute(false);
                setNewAttributeName('');
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => addNewAttribute(newAttributeName)}
              style={[styles.confirmButton, !newAttributeName.trim() && styles.confirmButtonDisabled]}
              disabled={!newAttributeName.trim()}
            >
              <Text style={styles.confirmButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Liste des variantes */}
      {variants.length === 0 ? (
        <TouchableOpacity onPress={addVariant} style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Package size={32} color="#9ca3af" />
          </View>
          <Text style={styles.emptyText}>Aucune variante</Text>
          <Text style={styles.emptySubtext}>
            Appuyez pour ajouter votre première variante
          </Text>
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintText}>
              💡 Créez des variantes personnalisées avec vos propres attributs
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.variantsList}>
          {variants.map((variant, index) => (
            <View key={index} style={styles.variantCard}>
              {/* Header carte */}
              <View style={styles.variantHeader}>
                <View style={styles.variantBadge}>
                  <Text style={styles.variantBadgeText}>#{index + 1}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeVariant(index)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Attributs de la variante */}
              {usedAttributes.length === 0 ? (
                <TouchableOpacity 
                  onPress={() => setShowAddAttribute(true)}
                  style={styles.noAttributesHint}
                >
                  <Plus size={16} color="#3b82f6" />
                  <Text style={styles.noAttributesText}>
                    Ajouter un attribut (Taille, Couleur...)
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.attributesGrid}>
                  {usedAttributes.map((attrName) => (
                    <View key={attrName} style={styles.attributeField}>
                      <Text style={styles.attributeLabel}>{attrName}</Text>
                      <TextInput
                        value={variant.attributes[attrName] || ''}
                        onChangeText={(value) => updateVariantAttribute(index, attrName, value)}
                        placeholder={`Ex: ${attrName === 'Taille' ? 'M, L, XL' : attrName === 'Couleur' ? 'Noir, Blanc' : '...'}`}
                        placeholderTextColor="#9ca3af"
                        style={styles.attributeInput}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Stock */}
              <View style={styles.stockField}>
                <View style={styles.stockLabel}>
                  <Text style={styles.stockLabelText}>📦 Stock</Text>
                </View>
                <View style={styles.stockInputContainer}>
                  <TouchableOpacity 
                    onPress={() => {
                      const current = parseInt(variant.stock) || 0;
                      if (current > 0) updateVariantStock(index, String(current - 1));
                    }}
                    style={styles.stockButton}
                  >
                    <Text style={styles.stockButtonText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={variant.stock}
                    onChangeText={(text) => updateVariantStock(index, text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={styles.stockInput}
                    textAlign="center"
                  />
                  <TouchableOpacity 
                    onPress={() => {
                      const current = parseInt(variant.stock) || 0;
                      updateVariantStock(index, String(current + 1));
                    }}
                    style={styles.stockButton}
                  >
                    <Text style={styles.stockButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          
          {/* Bouton ajouter en bas */}
          <TouchableOpacity onPress={addVariant} style={styles.addMoreButton}>
            <Plus size={18} color="#3b82f6" />
            <Text style={styles.addMoreText}>Ajouter une autre variante</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  attributesSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  attributeTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  removeTagButton: {
    marginLeft: 2,
  },
  addAttributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  addAttributeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  addAttributeForm: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addAttributeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addAttributeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  suggestionChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
  },
  addAttributeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 16,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyHintText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  variantsList: {
    gap: 12,
  },
  variantCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  variantBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  variantBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAttributesHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  noAttributesText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  attributesGrid: {
    gap: 12,
  },
  attributeField: {
    gap: 6,
  },
  attributeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  attributeInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#111827',
  },
  stockField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  stockLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  stockInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stockButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  stockInput: {
    width: 50,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 8,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
