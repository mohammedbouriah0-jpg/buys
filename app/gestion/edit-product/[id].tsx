import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Save, Image as ImageIcon } from "lucide-react-native";
import { productsAPI } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";

export default function EditProductPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{id?: number, size: string, color: string, stock: string}>>([]);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const product = await productsAPI.getById(id as string);
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setStock(product.stock?.toString() || "0");
      setImageUri(product.image_url);
      
      // Load variants
      if (product.has_variants && product.variants) {
        setHasVariants(true);
        setVariants(product.variants.map((v: any) => ({
          id: v.id,
          size: v.size || '',
          color: v.color || '',
          stock: v.stock?.toString() || '0'
        })));
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger le produit");
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const addVariant = () => {
    setVariants([...variants, { size: '', color: '', stock: '0' }]);
  };
  
  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };
  
  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom est requis");
      return;
    }

    if (!price || isNaN(Number(price))) {
      Alert.alert("Erreur", "Prix invalide");
      return;
    }
    
    if (hasVariants && variants.length === 0) {
      Alert.alert("Erreur", "Veuillez ajouter au moins une variante ou désactiver les variantes");
      return;
    }

    try {
      setSaving(true);
      
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("stock", hasVariants ? "0" : (stock || "0"));
      formData.append("has_variants", hasVariants.toString());
      
      if (hasVariants) {
        formData.append("variants", JSON.stringify(variants.map(v => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: parseInt(v.stock) || 0
        }))));
      }

      if (imageUri && !imageUri.startsWith("http")) {
        const filename = imageUri.split("/").pop() || "image.jpg";
        formData.append("image", {
          uri: imageUri,
          type: "image/jpeg",
          name: filename,
        } as any);
      }

      await productsAPI.update(id as string, formData);
      Alert.alert("Succès", "Produit modifié", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de modifier le produit");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le produit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ImageIcon size={48} color="#9ca3af" />
              <Text style={styles.imagePlaceholderText}>Ajouter une image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Nom */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du produit *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: T-shirt Nike"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez votre produit..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Prix et Stock */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Prix (DA) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {!hasVariants && (
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Stock</Text>
              <TextInput
                style={styles.input}
                value={stock}
                onChangeText={setStock}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}
        </View>

        {/* Variants Toggle */}
        <TouchableOpacity
          style={styles.variantsToggle}
          onPress={() => setHasVariants(!hasVariants)}
        >
          <View style={[styles.checkbox, hasVariants && styles.checkboxChecked]}>
            {hasVariants && <Text style={styles.checkboxText}>✓</Text>}
          </View>
          <Text style={styles.variantsToggleText}>Ce produit a des variantes</Text>
        </TouchableOpacity>

        {/* Variants Section */}
        {hasVariants && (
          <View style={styles.variantsSection}>
            <View style={styles.variantsHeader}>
              <Text style={styles.variantsTitle}>✨ Variantes ({variants.length})</Text>
              <TouchableOpacity style={styles.addVariantButton} onPress={addVariant}>
                <Text style={styles.addVariantButtonText}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>

            {variants.length === 0 ? (
              <View style={styles.emptyVariants}>
                <Text style={styles.emptyVariantsText}>📦</Text>
                <Text style={styles.emptyVariantsSubtext}>Aucune variante</Text>
              </View>
            ) : (
              variants.map((variant, index) => (
                <View key={index} style={styles.variantCard}>
                  <View style={styles.variantHeader}>
                    <View style={styles.variantBadge}>
                      <Text style={styles.variantBadgeText}>#{index + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeVariantButton}
                      onPress={() => removeVariant(index)}
                    >
                      <Text style={styles.removeVariantButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.variantInputGroup}>
                    <Text style={styles.variantLabel}>Option 1 (optionnel)</Text>
                    <TextInput
                      style={styles.variantInput}
                      value={variant.size}
                      onChangeText={(text) => updateVariant(index, 'size', text)}
                      placeholder="Ex: M, 128GB, 1kg..."
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.variantInputGroup}>
                    <Text style={styles.variantLabel}>Option 2 (optionnel)</Text>
                    <TextInput
                      style={styles.variantInput}
                      value={variant.color}
                      onChangeText={(text) => updateVariant(index, 'color', text)}
                      placeholder="Ex: Noir, Plastique..."
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.variantInputGroup}>
                    <Text style={styles.variantLabel}>📦 Stock</Text>
                    <TextInput
                      style={styles.variantInput}
                      value={variant.stock}
                      onChangeText={(text) => updateVariant(index, 'stock', text)}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Bouton Enregistrer */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#f9fafb",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: "row",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 40,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  variantsToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  checkboxText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  variantsToggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  variantsSection: {
    marginBottom: 20,
  },
  variantsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  variantsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  addVariantButton: {
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addVariantButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyVariants: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyVariantsText: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyVariantsSubtext: {
    fontSize: 14,
    color: "#6b7280",
  },
  variantCard: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  variantBadge: {
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  variantBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  removeVariantButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  removeVariantButtonText: {
    color: "#ef4444",
    fontSize: 20,
    fontWeight: "bold",
  },
  variantInputGroup: {
    marginBottom: 12,
  },
  variantLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
  },
  variantInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
  },
});
