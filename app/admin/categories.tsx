import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Trash2, Package, Shirt, ShoppingBag, Watch, Smartphone, Laptop, Gamepad2, Book, Home, Palette, Footprints, Music, UtensilsCrossed, Sparkles, Wrench, Backpack, Glasses, Headphones, Camera, Zap, Flame, Gem, Star, Gift, ShoppingCart, Tag } from 'lucide-react-native';
import { API_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/lib/i18n/language-context';

interface Category {
  id: number;
  name: string;
  name_ar: string;
  name_en: string;
  icon: string;
  products_count: number;
}

const iconMap: { [key: string]: any } = {
  'package': Package,
  'shirt': Shirt,
  'shopping-bag': ShoppingBag,
  'watch': Watch,
  'smartphone': Smartphone,
  'laptop': Laptop,
  'gamepad': Gamepad2,
  'book': Book,
  'home': Home,
  'palette': Palette,
  'footprints': Footprints,
  'music': Music,
  'utensils': UtensilsCrossed,
  'sparkles': Sparkles,
  'wrench': Wrench,
  'backpack': Backpack,
  'glasses': Glasses,
  'headphones': Headphones,
  'camera': Camera,
  'zap': Zap,
  'flame': Flame,
  'gem': Gem,
  'star': Star,
  'gift': Gift,
  'cart': ShoppingCart,
  'tag': Tag,
};

export default function AdminCategories() {
  const router = useRouter();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    name_en: '',
    icon: 'package'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        name_ar: category.name_ar,
        name_en: category.name_en || '',
        icon: category.icon
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', name_ar: '', name_en: '', icon: 'package' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.name_ar.trim() || !formData.name_en.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const url = editingCategory
        ? `${API_URL}/categories/${editingCategory.id}`
        : `${API_URL}/categories`;
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error();

      Alert.alert('Succès', editingCategory ? 'Catégorie modifiée' : 'Catégorie créée');
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la catégorie');
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.products_count > 0) {
      Alert.alert(
        'Impossible',
        `Cette catégorie contient ${category.products_count} produit(s). Supprimez d'abord les produits.`
      );
      return;
    }

    Alert.alert(
      'Confirmer',
      `Supprimer la catégorie "${category.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/categories/${category.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) throw new Error();

              Alert.alert('Succès', 'Catégorie supprimée');
              fetchCategories();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la catégorie');
            }
          }
        }
      ]
    );
  };

  const iconList = [
    'package', 'shirt', 'shopping-bag', 'watch', 'smartphone', 'laptop',
    'gamepad', 'book', 'home', 'palette', 'footprints', 'music',
    'utensils', 'sparkles', 'wrench', 'backpack', 'glasses', 'headphones',
    'camera', 'zap', 'flame', 'gem', 'star', 'gift', 'cart', 'tag'
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catégories</Text>
        <TouchableOpacity onPress={() => handleOpenModal()} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryIcon}>
              {(() => {
                const IconComponent = iconMap[category.icon] || Package;
                return <IconComponent size={24} color="#111827" strokeWidth={2} />;
              })()}
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryNameAr}>{category.name_ar}</Text>
              <Text style={styles.categoryCount}>
                {category.products_count} produit(s)
              </Text>
            </View>
            <View style={styles.categoryActions}>
              <TouchableOpacity
                onPress={() => handleOpenModal(category)}
                style={[styles.actionButton, styles.editButton]}
              >
                <Pencil size={16} color="#ffffff" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(category)}
                style={[styles.actionButton, styles.deleteButton]}
              >
                <Trash2 size={16} color="#ffffff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Modifier' : 'Nouvelle'} catégorie
            </Text>

            <Text style={styles.label}>Nom (Français)</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Ex: Vêtements"
            />

            <Text style={styles.label}>Nom (Arabe)</Text>
            <TextInput
              style={[styles.input, styles.inputAr]}
              value={formData.name_ar}
              onChangeText={(text) => setFormData({ ...formData, name_ar: text })}
              placeholder="مثال: ملابس"
            />

            <Text style={styles.label}>Nom (Anglais)</Text>
            <TextInput
              style={styles.input}
              value={formData.name_en}
              onChangeText={(text) => setFormData({ ...formData, name_en: text })}
              placeholder="Ex: Clothing"
            />

            <Text style={styles.label}>Icône</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconListScroll}>
              {iconList.map((iconName) => {
                const IconComponent = iconMap[iconName];
                return (
                  <TouchableOpacity
                    key={iconName}
                    onPress={() => setFormData({ ...formData, icon: iconName })}
                    style={[
                      styles.iconButton,
                      formData.icon === iconName && styles.iconButtonSelected
                    ]}
                  >
                    <IconComponent 
                      size={22} 
                      color={formData.icon === iconName ? '#ffffff' : '#374151'} 
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>
                  {editingCategory ? 'Modifier' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#000',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  categoryNameAr: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputAr: {
    textAlign: 'right',
  },
  iconListScroll: {
    marginBottom: 20,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#000',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
