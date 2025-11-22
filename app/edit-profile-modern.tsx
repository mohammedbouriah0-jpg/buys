import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Camera, Save, X, User, Mail, Phone, MapPin, Store, FileText } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth-context";
import { userAPI, shopsAPI } from "@/lib/api";

export default function EditProfileModern() {
  const { user, refreshUser, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // États pour les champs
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [wilaya, setWilaya] = useState(user?.wilaya || "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  
  // États spécifiques boutique
  const [shopName, setShopName] = useState(user?.shopName || "");
  const [shopDescription, setShopDescription] = useState(user?.shopDescription || "");
  const [shopLogo, setShopLogo] = useState<string | null>(user?.shopLogo || null);

  const isShop = user?.type === "shop";

  // Animation d'entrée
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!isAuthenticated) {
    router.replace("/login");
    return null;
  }

  const pickImage = async (type: "avatar" | "logo") => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission requise",
          "Nous avons besoin de votre permission pour accéder à vos photos."
        );
        return;
      }

      console.log('Opening image picker for:', type);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        console.log('Selected image URI:', result.assets[0].uri);
        if (type === "avatar") {
          setAvatar(result.assets[0].uri);
        } else {
          setShopLogo(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert("Erreur", "Impossible de sélectionner l'image");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("wilaya", wilaya);

      // Handle avatar
      if (avatar && avatar.startsWith("file://")) {
        formData.append("avatar", {
          uri: avatar,
          type: "image/jpeg",
          name: "avatar.jpg",
        } as any);
      } else if (!avatar) {
        // Signal to remove avatar
        formData.append("removeAvatar", "true");
      }

      if (isShop) {
        formData.append("shopName", shopName);
        formData.append("shopDescription", shopDescription);
        
        // Handle logo
        if (shopLogo && shopLogo.startsWith("file://")) {
          formData.append("logo", {
            uri: shopLogo,
            type: "image/jpeg",
            name: "logo.jpg",
          } as any);
        } else if (!shopLogo) {
          // Signal to remove logo
          formData.append("removeLogo", "true");
        }
      }

      console.log('Sending profile update...');
      const result = await userAPI.updateProfile(formData);
      console.log('Profile updated:', result);
      
      // Refresh user data in context
      await refreshUser();
      
      Alert.alert("Succès", "Profil mis à jour avec succès");
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert("Erreur", error.message || "Impossible de mettre à jour le profil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isShop ? "Modifier ma boutique" : "Modifier le profil"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        >
          <Save size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Logo boutique ou Photo de profil */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity 
                onPress={() => pickImage(isShop ? "logo" : "avatar")} 
                activeOpacity={0.7}
              >
                {isShop ? (
                  // Logo boutique
                  shopLogo ? (
                    <Image source={{ uri: shopLogo }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Store size={40} color="#8e8e8e" />
                    </View>
                  )
                ) : (
                  // Avatar client
                  avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={40} color="#8e8e8e" />
                    </View>
                  )
                )}
                <View style={styles.cameraButton}>
                  <Camera size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              
              {/* Bouton supprimer */}
              {(isShop ? shopLogo : avatar) && (
                <TouchableOpacity 
                  onPress={() => isShop ? setShopLogo(null) : setAvatar(null)}
                  style={styles.deleteButton}
                  activeOpacity={0.7}
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.avatarLabel}>
              {isShop ? "Logo de la boutique" : "Photo de profil"}
            </Text>
            {(isShop ? shopLogo : avatar) && (
              <TouchableOpacity onPress={() => isShop ? setShopLogo(null) : setAvatar(null)}>
                <Text style={styles.removeText}>
                  {isShop ? "Supprimer le logo" : "Supprimer la photo"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Champs boutique en premier si boutique */}
          {isShop && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations de la boutique</Text>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <Store size={20} color="#8e8e8e" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nom de la boutique"
                  value={shopName}
                  onChangeText={setShopName}
                  placeholderTextColor="#8e8e8e"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <FileText size={20} color="#8e8e8e" />
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description de la boutique"
                  value={shopDescription}
                  onChangeText={setShopDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#8e8e8e"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <Phone size={20} color="#8e8e8e" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Téléphone de la boutique"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#8e8e8e"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <MapPin size={20} color="#8e8e8e" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Adresse de la boutique"
                  value={address}
                  onChangeText={setAddress}
                  placeholderTextColor="#8e8e8e"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={[styles.inputIcon, { backgroundColor: '#fef3c7' }]}>
                  <MapPin size={20} color="#f59e0b" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Wilaya"
                  value={wilaya}
                  onChangeText={setWilaya}
                  placeholderTextColor="#8e8e8e"
                />
              </View>
            </View>
          )}

          {/* Champs communs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isShop ? "Informations du compte" : "Informations personnelles"}
            </Text>
            
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <User size={20} color="#8e8e8e" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={isShop ? "Nom du responsable" : "Nom complet"}
                value={name}
                onChangeText={setName}
                placeholderTextColor="#8e8e8e"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Mail size={20} color="#8e8e8e" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#8e8e8e"
                editable={false}
              />
            </View>

            {!isShop && (
              <>
                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <Phone size={20} color="#8e8e8e" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Téléphone"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#8e8e8e"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <MapPin size={20} color="#8e8e8e" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Adresse"
                    value={address}
                    onChangeText={setAddress}
                    placeholderTextColor="#8e8e8e"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={[styles.inputIcon, { backgroundColor: '#fef3c7' }]}>
                    <MapPin size={20} color="#f59e0b" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Wilaya"
                    value={wilaya}
                    onChangeText={setWilaya}
                    placeholderTextColor="#8e8e8e"
                  />
                </View>
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomColor: "#f0f0f0",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f7f7f7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f7f7f7",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarLabel: {
    marginTop: 12,
    fontSize: 14,
    color: "#8e8e8e",
  },
  deleteButton: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  removeText: {
    marginTop: 8,
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "600",
  },
  removeLogoButton: {
    marginTop: 12,
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: "#000",
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    paddingBottom: 16,
  },
  logoUpload: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: 150,
  },
  logoPlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#f7f7f7",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 14,
    color: "#8e8e8e",
  },
});
