import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { videosAPI, productsAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import SafeBottomButton from "@/components/safe-bottom-button";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import {
  X,
  Search,
  ChevronRight,
  Video as VideoIcon,
  Camera,
  Film,
  ImageIcon,
  Tag,
} from "lucide-react-native";
import { VerificationGuard } from "@/components/verification-guard";
import { Toast } from "@/components/toast-notification";
import { API_URL } from "@/config";
import { useLanguage } from "@/lib/i18n/language-context";
import { generateThumbnail, getVideoInfo } from "@/lib/video-compression";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
}

export default function AddVideoPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const recordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired"),
          t("cameraPermissionMessage")
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 0.3, // ⭐ Qualité basse pour réduire la taille
        videoMaxDuration: 30, // ⭐ Max 30 secondes pour limiter la taille
        videoQuality: 1, // 0 = low, 1 = medium (plus compatible)
      } as any);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        
        // ⭐ Vérifier la taille (max 50 MB pour les vidéos filmées directement)
        const sizeInMB = video.fileSize ? video.fileSize / 1024 / 1024 : 0;
        console.log(`📹 Vidéo enregistrée: ${sizeInMB.toFixed(1)} MB`);
        
        if (sizeInMB > 50) {
          Alert.alert(
            'Vidéo trop volumineuse',
            `La vidéo fait ${sizeInMB.toFixed(1)} MB.\n\nPour l'instant, filmez une vidéo plus courte (max 15-20 secondes) ou utilisez une vidéo de la galerie.`,
            [{ text: 'OK' }]
          );
          return;
        }
        setVideoUri(video.uri);
        
        // Générer automatiquement une miniature
        if (!thumbnailUri) {
          const thumb = await generateThumbnail(video.uri);
          if (thumb) {
            setThumbnailUri(thumb);
            console.log('✅ Miniature auto-générée');
          }
        }
      }
    } catch (error) {
      Alert.alert(t("error"), t("unableToRecordVideo"));
    }
  };

  const pickVideo = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired"),
          t("galleryPermissionMessage")
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.5, // ⭐ Qualité réduite (50%) pour économiser l'espace
        videoMaxDuration: 60, // ⭐ Max 60 secondes
      } as any);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        
        // ⭐ Vérifier la taille (max 100 MB pour les vidéos de la galerie)
        const sizeInMB = video.fileSize ? video.fileSize / 1024 / 1024 : 0;
        console.log(`📹 Vidéo galerie: ${sizeInMB.toFixed(1)} MB`);
        
        if (sizeInMB > 100) {
          Alert.alert(
            'Vidéo trop volumineuse',
            `La vidéo fait ${sizeInMB.toFixed(1)} MB.\n\nChoisissez une vidéo de moins de 100 MB ou réduisez sa durée.`,
            [{ text: 'OK' }]
          );
          return;
        }
        setVideoUri(video.uri);
        
        // Générer automatiquement une miniature si pas déjà fournie
        if (!thumbnailUri) {
          const thumb = await generateThumbnail(video.uri);
          if (thumb) {
            setThumbnailUri(thumb);
            console.log('✅ Miniature auto-générée');
          }
        }
      }
    } catch (error) {
      Alert.alert(t("error"), t("unableToSelectVideo"));
    }
  };

  const pickThumbnail = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired"),
          t("photosPermissionMessage")
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      } as any);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setThumbnailUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(t("error"), t("unableToSelectThumbnail"));
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      // Charger uniquement les produits de ma boutique
      const data = await productsAPI.getMyProducts();
      
      // Filtrer par recherche si nécessaire
      const filteredData = searchQuery 
        ? data.filter((p: Product) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : data;
      
      setProducts(filteredData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (showProductModal) {
      const timer = setTimeout(() => {
        loadProducts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const handleSave = async () => {
    if (!title) {
      setToastMessage(t("titleRequired"));
      setToastType("error");
      setShowToast(true);
      return;
    }
    if (!videoUri) {
      setToastMessage(t("selectVideoFirst"));
      setToastType("error");
      setShowToast(true);
      return;
    }
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (productId) {
        formData.append("product_id", productId);
      }
      
      const videoFilename = videoUri.split("/").pop() || "video.mp4";
      formData.append("video", {
        uri: videoUri,
        name: videoFilename,
        type: "video/mp4",
      } as any);
      
      if (thumbnailUri) {
        const thumbFilename = thumbnailUri.split("/").pop() || "thumb.jpg";
        const match = /\.(\w+)$/.exec(thumbFilename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("thumbnail", {
          uri: thumbnailUri,
          name: thumbFilename,
          type,
        } as any);
      }

      // Upload avec progression
      await uploadWithProgress(formData);
      
      setToastMessage(t("videoPublishedSuccess"));
      setToastType("success");
      setShowToast(true);
      
      // Retour après 1.5s
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      setToastMessage(error.message || t("unableToPublishVideo"));
      setToastType("error");
      setShowToast(true);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const uploadWithProgress = (formData: FormData): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = await require("@react-native-async-storage/async-storage").default.getItem("auth_token");
      let lastProgress = 0;

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && event.total > 0) {
          // Calculer la progression réelle
          const rawProgress = (event.loaded / event.total) * 100;
          
          // PROTECTION ABSOLUE: ne jamais dépasser 99% pendant l'upload
          let cappedProgress = Math.floor(rawProgress);
          if (cappedProgress > 99) cappedProgress = 99;
          if (cappedProgress < 0) cappedProgress = 0;
          
          // Ne mettre à jour que si la progression augmente et est valide
          if (cappedProgress > lastProgress && cappedProgress <= 99) {
            lastProgress = cappedProgress;
            setUploadProgress(cappedProgress);
          }
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Seulement maintenant on passe à 100%
          setUploadProgress(100);
          resolve();
        } else {
          reject(new Error("Erreur lors de l'upload"));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Erreur réseau"));
      });

      xhr.open("POST", `${API_URL}/videos`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  return (
    <VerificationGuard>
    <View className="flex-1 bg-black">
      {/* Header simple et blanc */}
      <View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: '#ffffff',
          paddingTop: 48,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View style={{ 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              backgroundColor: '#f3f4f6',
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color="#111827" strokeWidth={2.5} />
          </TouchableOpacity>
          
          <Text style={{ 
            color: '#111827',
            fontSize: 17,
            fontWeight: '700',
            letterSpacing: 0.3
          }}>{t("newVideo")}</Text>
          
          {/* Espace vide pour équilibrer */}
          <View style={{ width: 36 }} />
        </View>
      </View>

      {/* Barre de progression MEGA VISIBLE */}
      {loading && uploadProgress > 0 && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 32,
            marginHorizontal: 24,
            width: '85%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 20,
          }}>
            {/* Icône animée */}
            <View style={{
              width: 80,
              height: 80,
              backgroundColor: '#eff6ff',
              borderRadius: 40,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              marginBottom: 24,
              borderWidth: 3,
              borderColor: '#3b82f6'
            }}>
              <VideoIcon size={40} color="#3b82f6" strokeWidth={2.5} />
            </View>

            {/* Texte */}
            <Text style={{ 
              fontSize: 22,
              fontWeight: '900',
              color: '#111827',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: 0.5
            }}>
              Upload en cours...
            </Text>
            <Text style={{ 
              fontSize: 15,
              fontWeight: '600',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: 24
            }}>
              Veuillez patienter
            </Text>

            {/* Pourcentage MEGA */}
            <Text style={{ 
              fontSize: 48,
              fontWeight: '900',
              color: '#3b82f6',
              textAlign: 'center',
              marginBottom: 20,
              letterSpacing: -1
            }}>
              {Math.min(uploadProgress, 100)}%
            </Text>

            {/* Barre de progression LARGE */}
            <View style={{
              height: 12,
              backgroundColor: '#e5e7eb',
              borderRadius: 6,
              overflow: 'hidden',
              marginBottom: 16
            }}>
              <View 
                style={{
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: 6,
                  width: `${Math.min(uploadProgress, 100)}%`,
                }}
              />
            </View>

            {/* Info supplémentaire */}
            <Text style={{ 
              fontSize: 13,
              fontWeight: '600',
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              Ne fermez pas l'application
            </Text>
          </View>
        </View>
      )}

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 100 }}
      >
        <TouchableOpacity
          onPress={() => setShowVideoModal(true)}
          activeOpacity={0.9}
          style={{ height: 500 }}
        >
          {videoUri ? (
            <View style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Video
                source={{ uri: videoUri }}
                style={{ width: "100%", height: "100%" }}
                useNativeControls
                resizeMode={ResizeMode.COVER}
              />
              {/* Badge de modification */}
              <View style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}>
                <Camera size={16} color="#fff" strokeWidth={2.5} />
                <Text style={{ 
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: '700',
                  marginLeft: 6
                }}>{t("changeVideo")}</Text>
              </View>
            </View>
          ) : (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
            }}>
              <View style={{ alignItems: 'center' }}>
                {/* Cercle animé avec gradient */}
                <View style={{
                  width: 140,
                  height: 140,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: 70,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  borderWidth: 3,
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                }}>
                  <View style={{
                    width: 100,
                    height: 100,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <VideoIcon size={50} color="#3b82f6" strokeWidth={2} />
                  </View>
                </View>
                
                <Text style={{ 
                  color: '#ffffff',
                  fontSize: 26,
                  fontWeight: '800',
                  marginBottom: 8,
                  letterSpacing: 0.5
                }}>
                  {t("addVideoPrompt")}
                </Text>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 15,
                  fontWeight: '500',
                  marginBottom: 24
                }}>
                  {t("tapToStart")}
                </Text>
                
                {/* Indicateurs de fonctionnalités */}
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 6
                    }}>
                      <Camera size={22} color="#ef4444" strokeWidth={2.5} />
                    </View>
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: 11,
                      fontWeight: '600'
                    }}>{t("record")}</Text>
                  </View>
                  
                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 6
                    }}>
                      <Film size={22} color="#3b82f6" strokeWidth={2.5} />
                    </View>
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: 11,
                      fontWeight: '600'
                    }}>{t("gallery")}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          marginTop: -20,
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 32,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        }}>
          {/* Titre - Compact */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8
            }}>
              <Text style={{ 
                fontSize: 12,
                fontWeight: '700',
                color: '#111827',
                letterSpacing: 0.3
              }}>
                {t("title")} *
              </Text>
              <Text style={{ 
                fontSize: 11,
                color: '#9ca3af',
                fontWeight: '600'
              }}>
                {title.length}/100
              </Text>
            </View>
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: title ? '#3b82f6' : '#e5e7eb',
              overflow: 'hidden'
            }}>
              <TextInput
                value={title}
                onChangeText={(text) => setTitle(text.slice(0, 100))}
                placeholder={t("giveVideoTitle")}
                placeholderTextColor="#9ca3af"
                maxLength={100}
                style={{
                  padding: 12,
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#111827',
                }}
              />
            </View>
          </View>

          {/* Description - Compact */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8
            }}>
              <Text style={{ 
                fontSize: 12,
                fontWeight: '700',
                color: '#111827',
                letterSpacing: 0.3
              }}>
                {t("description")}
              </Text>
              <Text style={{ 
                fontSize: 11,
                color: '#9ca3af',
                fontWeight: '600'
              }}>
                {description.length}/500
              </Text>
            </View>
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: description ? '#3b82f6' : '#e5e7eb',
              overflow: 'hidden'
            }}>
              <TextInput
                value={description}
                onChangeText={(text) => setDescription(text.slice(0, 500))}
                placeholder={t("describeVideo")}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                maxLength={500}
                style={{
                  padding: 12,
                  fontSize: 14,
                  color: '#111827',
                  textAlignVertical: "top",
                  minHeight: 80,
                  lineHeight: 20
                }}
              />
            </View>
          </View>

          {/* Miniature - Compact */}
          <TouchableOpacity
            onPress={pickThumbnail}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              borderWidth: 1.5,
              borderColor: thumbnailUri ? '#a855f7' : '#e5e7eb',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {thumbnailUri ? (
                <Image
                  source={{ uri: thumbnailUri }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    marginRight: 12
                  }}
                />
              ) : (
                <View style={{
                  width: 56,
                  height: 56,
                  backgroundColor: '#faf5ff',
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: '#e9d5ff'
                }}>
                  <ImageIcon size={24} color="#a855f7" strokeWidth={2} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: 2
                }}>
                  {t("thumbnail")}
                </Text>
                <Text style={{ 
                  fontSize: 12,
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {thumbnailUri ? '✓ ' + t("tapToChange") : t("optional")}
                </Text>
              </View>
            </View>
            <View style={{
              width: 28,
              height: 28,
              backgroundColor: '#f9fafb',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ChevronRight size={16} color="#9ca3af" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          {/* Produit lié - Compact */}
          <TouchableOpacity
            onPress={() => {
              setShowProductModal(true);
              loadProducts();
            }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1.5,
              borderColor: selectedProduct ? '#3b82f6' : '#e5e7eb',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {selectedProduct ? (
                <>
                  <Image
                    source={{ uri: selectedProduct.image_url }}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      marginRight: 12
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: 2
                    }} numberOfLines={1}>
                      {selectedProduct.name}
                    </Text>
                    <Text style={{ 
                      fontSize: 13,
                      color: '#3b82f6',
                      fontWeight: '800'
                    }}>
                      {selectedProduct.price.toLocaleString()} DA
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(null);
                      setProductId("");
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: '#fee2e2',
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 8
                    }}
                  >
                    <X size={16} color="#ef4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={{
                    width: 56,
                    height: 56,
                    backgroundColor: '#eff6ff',
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: '#bfdbfe'
                  }}>
                    <Tag size={24} color="#3b82f6" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: 2
                    }}>
                      {t("linkProduct")}
                    </Text>
                    <Text style={{ 
                      fontSize: 12,
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      {t("optional")}
                    </Text>
                  </View>
                  <View style={{
                    width: 28,
                    height: 28,
                    backgroundColor: '#f9fafb',
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ChevronRight size={16} color="#9ca3af" strokeWidth={2.5} />
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bouton Publier compact */}
      {!loading && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <SafeBottomButton
            onPress={handleSave}
            title={t("publish")}
            variant="black"
          />
        </View>
      )}

      {/* Modal Ajouter Vidéo - Design Pro */}
      <Modal
        visible={showVideoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View style={{ 
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingBottom: Math.max(insets.bottom + 16, 32),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 16,
          }}>
            {/* Handle */}
            <View style={{ paddingTop: 8, paddingBottom: 12, alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: '#d1d5db',
                borderRadius: 2
              }} />
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              {/* Titre compact */}
              <Text style={{ 
                fontSize: 20,
                fontWeight: '800',
                color: '#111827',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                {t("addVideoPrompt")}
              </Text>

              {/* Option Filmer - Compact */}
              <TouchableOpacity
                onPress={() => {
                  setShowVideoModal(false);
                  setTimeout(recordVideo, 300);
                }}
                style={{
                  backgroundColor: '#ef4444',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#ef4444',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14
                }}>
                  <Camera size={24} color="#fff" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: '800',
                    marginBottom: 2
                  }}>{t("record")}</Text>
                  <Text style={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: 12,
                    fontWeight: '500'
                  }}>
                    {t("recordNow")}
                  </Text>
                </View>
                <ChevronRight size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Option Galerie - Compact */}
              <TouchableOpacity
                onPress={() => {
                  setShowVideoModal(false);
                  setTimeout(pickVideo, 300);
                }}
                style={{
                  backgroundColor: '#3b82f6',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14
                }}>
                  <Film size={24} color="#fff" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: '800',
                    marginBottom: 2
                  }}>
                    {t("gallery")}
                  </Text>
                  <Text style={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: 12,
                    fontWeight: '500'
                  }}>
                    {t("chooseVideo")}
                  </Text>
                </View>
                <ChevronRight size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Bouton Annuler - Compact */}
              <TouchableOpacity
                onPress={() => setShowVideoModal(false)}
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'center'
                }}
              >
                <Text style={{ 
                  color: '#111827',
                  fontSize: 15,
                  fontWeight: '700'
                }}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Lier Produit - Design Pro */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={false}
      >
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
          {/* Header compact */}
          <View style={{
            backgroundColor: '#ffffff',
            paddingTop: 48,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}>
            <View style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#eff6ff',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10
                }}>
                  <Tag size={20} color="#3b82f6" strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#111827'
                  }}>{t("linkProduct")}</Text>
                  <Text style={{ 
                    fontSize: 12,
                    color: '#6b7280',
                    fontWeight: '500',
                    marginTop: 1
                  }}>{products.length} {t("products")}</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setShowProductModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} color="#111827" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Barre de recherche compacte */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1.5,
              borderColor: searchQuery ? '#3b82f6' : 'transparent'
            }}>
              <Search size={18} color="#9ca3af" strokeWidth={2.5} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("searchProduct")}
                placeholderTextColor="#9ca3af"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#111827'
                }}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={16} color="#9ca3af" strokeWidth={2.5} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Liste des produits */}
          {loadingProducts ? (
            <View style={{ 
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={{ 
                color: '#6b7280',
                marginTop: 16,
                fontSize: 15,
                fontWeight: '500'
              }}>{t("loading")}</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedProduct(item);
                    setProductId(item.id.toString());
                    setShowProductModal(false);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                    borderWidth: 1.5,
                    borderColor: selectedProduct?.id === item.id ? '#3b82f6' : '#e5e7eb'
                  }}
                >
                  <Image
                    source={{
                      uri: item.image_url || "https://via.placeholder.com/80",
                    }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 12,
                      backgroundColor: '#f3f4f6'
                    }}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ 
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: 4
                    }} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={{ 
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#3b82f6',
                      marginBottom: 3
                    }}>
                      {item.price.toLocaleString()} DA
                    </Text>
                    <View style={{
                      backgroundColor: item.stock > 0 ? '#d1fae5' : '#fee2e2',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 5,
                      alignSelf: 'flex-start'
                    }}>
                      <Text style={{ 
                        fontSize: 10,
                        fontWeight: '700',
                        color: item.stock > 0 ? '#065f46' : '#991b1b'
                      }}>
                        {t("stock")}: {item.stock}
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    width: 32,
                    height: 32,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ChevronRight size={18} color="#9ca3af" strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ 
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 60
                }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16
                  }}>
                    <Tag size={40} color="#9ca3af" strokeWidth={2} />
                  </View>
                  <Text style={{ 
                    color: '#6b7280',
                    fontSize: 15,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    {t("noProductFound")}
                  </Text>
                  <Text style={{ 
                    color: '#9ca3af',
                    fontSize: 13,
                    fontWeight: '500',
                    textAlign: 'center',
                    marginTop: 6
                  }}>
                    {t("createProductsFirst")}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </View>
    </VerificationGuard>
  );
}
