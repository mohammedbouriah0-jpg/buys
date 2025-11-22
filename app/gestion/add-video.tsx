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
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { videosAPI, productsAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
        quality: 0.5, // ⭐ Qualité réduite pour économiser l'espace
        videoMaxDuration: 60, // ⭐ Max 60 secondes
      } as any);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        
        // ⭐ Vérifier la taille (max 50 MB)
        if (video.fileSize && video.fileSize > 50 * 1024 * 1024) {
          Alert.alert(
            'Vidéo trop volumineuse',
            'La vidéo ne doit pas dépasser 50 MB. Veuillez enregistrer une vidéo plus courte.'
          );
          return;
        }
        
        console.log(`✅ Vidéo enregistrée: ${(video.fileSize! / 1024 / 1024).toFixed(1)} MB`);
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
        
        // ⭐ Vérifier la taille (max 50 MB)
        if (video.fileSize && video.fileSize > 50 * 1024 * 1024) {
          Alert.alert(
            'Vidéo trop volumineuse',
            `La vidéo fait ${(video.fileSize / 1024 / 1024).toFixed(1)} MB. Elle ne doit pas dépasser 50 MB.\n\nVeuillez choisir une vidéo plus courte ou de moindre qualité.`
          );
          return;
        }
        
        console.log(`✅ Vidéo sélectionnée: ${(video.fileSize! / 1024 / 1024).toFixed(1)} MB`);
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

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
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
      <View className="absolute top-0 left-0 right-0 z-10 pt-12 pb-4 px-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
        >
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">{t("newVideo")}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className="px-5 py-2 bg-white rounded-full"
        >
          <Text className="text-black font-bold">
            {loading ? `${uploadProgress}%` : t("publish")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barre de progression */}
      {loading && uploadProgress > 0 && (
        <View className="absolute top-24 left-0 right-0 px-5">
          <View className="bg-white/90 rounded-2xl p-4 shadow-lg">
            <Text className="text-center text-sm font-semibold mb-2">
              {t("uploadInProgress")} {uploadProgress}%
            </Text>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </View>
          </View>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => setShowVideoModal(true)}
          activeOpacity={0.9}
          style={{ height: 500 }}
        >
          {videoUri ? (
            <Video
              source={{ uri: videoUri }}
              style={{ width: "100%", height: "100%" }}
              useNativeControls
              resizeMode={ResizeMode.COVER}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-gradient-to-b from-gray-900 to-black">
              <View className="items-center">
                <View
                  className="w-28 h-28 bg-white/10 rounded-3xl items-center justify-center mb-6"
                  style={{
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                >
                  <VideoIcon size={48} color="#fff" strokeWidth={1.5} />
                </View>
                <Text className="text-white text-2xl font-bold mb-2">
                  {t("addVideoPrompt")}
                </Text>
                <Text className="text-white/50 text-base">
                  {t("tapToStart")}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View className="bg-white rounded-t-3xl -mt-6 pt-6 px-5 pb-10">
          <View className="mb-5">
            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
              {t("title")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("giveVideoTitle")}
              placeholderTextColor="#9ca3af"
              className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3"
            />
          </View>

          <View className="mb-5">
            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
              {t("description")}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("describeVideo")}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              className="text-base text-gray-900 border-b border-gray-200 pb-3"
              style={{ textAlignVertical: "top", minHeight: 60 }}
            />
          </View>

          <TouchableOpacity
            onPress={pickThumbnail}
            className="mb-5 flex-row items-center justify-between py-4 border-b border-gray-200"
          >
            <View className="flex-row items-center flex-1">
              {thumbnailUri ? (
                <Image
                  source={{ uri: thumbnailUri }}
                  className="w-16 h-16 rounded-xl mr-4"
                />
              ) : (
                <View className="w-16 h-16 bg-purple-50 rounded-xl items-center justify-center mr-4">
                  <ImageIcon size={28} color="#a855f7" strokeWidth={1.5} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {t("thumbnail")}
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  {thumbnailUri ? t("tapToChange") : t("optional")}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setShowProductModal(true);
              loadProducts();
            }}
            className="flex-row items-center justify-between py-4 border-b border-gray-200"
          >
            <View className="flex-row items-center flex-1">
              {selectedProduct ? (
                <>
                  <Image
                    source={{ uri: selectedProduct.image_url }}
                    className="w-16 h-16 rounded-xl mr-4"
                  />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {selectedProduct.name}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {selectedProduct.price.toLocaleString()} DA
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(null);
                      setProductId("");
                    }}
                    className="ml-2"
                  >
                    <X size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View className="w-16 h-16 bg-blue-50 rounded-xl items-center justify-center mr-4">
                    <Tag size={28} color="#3b82f6" strokeWidth={1.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {t("linkProduct")}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {t("optional")}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#9ca3af" />
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showVideoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View className="flex-1 bg-black/95 justify-end">
          <View className="bg-white rounded-t-3xl overflow-hidden">
            <View className="pt-3 pb-6">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center" />
            </View>
            <View className="px-6 pb-10">
              <Text className="text-2xl font-bold text-gray-900 mb-8">
                {t("addVideoPrompt")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowVideoModal(false);
                  setTimeout(recordVideo, 300);
                }}
                className="mb-3 rounded-2xl overflow-hidden"
                style={{ backgroundColor: "#ef4444" }}
              >
                <View className="p-5 flex-row items-center">
                  <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center mr-4">
                    <Camera size={28} color="#fff" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xl font-bold">{t("record")}</Text>
                    <Text className="text-white/70 text-sm mt-0.5">
                      {t("recordNow")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowVideoModal(false);
                  setTimeout(pickVideo, 300);
                }}
                className="mb-3 rounded-2xl overflow-hidden"
                style={{ backgroundColor: "#3b82f6" }}
              >
                <View className="p-5 flex-row items-center">
                  <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center mr-4">
                    <Film size={28} color="#fff" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xl font-bold">
                      {t("gallery")}
                    </Text>
                    <Text className="text-white/70 text-sm mt-0.5">
                      {t("chooseVideo")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowVideoModal(false)}
                className="bg-gray-100 rounded-2xl p-5"
              >
                <Text className="text-gray-900 text-center font-bold text-base">
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-white">
          <View className="pt-12 pb-4 px-5 border-b border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-bold">{t("products")}</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <X size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
              <Search size={20} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("searchProduct")}
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-3 text-base"
              />
            </View>
          </View>
          {loadingProducts ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedProduct(item);
                    setProductId(item.id.toString());
                    setShowProductModal(false);
                  }}
                  className="flex-row items-center py-4 border-b border-gray-100"
                >
                  <Image
                    source={{
                      uri: item.image_url || "https://via.placeholder.com/80",
                    }}
                    className="w-16 h-16 rounded-xl"
                  />
                  <View className="flex-1 ml-4">
                    <Text className="text-base font-semibold text-gray-900 mb-1">
                      {item.name}
                    </Text>
                    <Text className="text-sm font-bold text-gray-900">
                      {item.price.toLocaleString()} DA
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {t("stock")}: {item.stock}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                    <Tag size={40} color="#9ca3af" strokeWidth={1.5} />
                  </View>
                  <Text className="text-gray-500 text-base font-medium">
                    {t("noProductFound")}
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
