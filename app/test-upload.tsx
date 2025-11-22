import { View, Text, TouchableOpacity, Alert, Image, ScrollView } from "react-native"
import { useState } from "react"
import * as ImagePicker from "expo-image-picker"
import { Video } from "expo-av"
import { router } from "expo-router"
import { X } from "lucide-react-native"

export default function TestUploadPage() {
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<string | null>(null)

  const testImagePicker = async () => {
    console.log("🔵 Test Image Picker - Début")
    
    try {
      // 1. Demander permission
      console.log("📱 Demande de permission...")
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log("✅ Permission:", status)
      
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Activez les permissions dans les paramètres")
        return
      }

      // 2. Ouvrir galerie
      console.log("📂 Ouverture galerie...")
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })

      console.log("📸 Résultat:", JSON.stringify(result, null, 2))

      // 3. Vérifier résultat
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri
        console.log("✅ Image sélectionnée:", uri)
        setImages([...images, uri])
        Alert.alert("Succès!", "Image ajoutée")
      } else {
        console.log("❌ Sélection annulée")
      }
    } catch (error) {
      console.error("❌ Erreur:", error)
      Alert.alert("Erreur", String(error))
    }
  }

  const testVideoPicker = async () => {
    console.log("🔵 Test Video Picker - Début")
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log("✅ Permission:", status)
      
      if (status !== "granted") {
        Alert.alert("Permission refusée")
        return
      }

      console.log("📂 Ouverture galerie vidéo...")
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
      })

      console.log("🎥 Résultat:", JSON.stringify(result, null, 2))

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri
        console.log("✅ Vidéo sélectionnée:", uri)
        setVideo(uri)
        Alert.alert("Succès!", "Vidéo ajoutée")
      }
    } catch (error) {
      console.error("❌ Erreur:", error)
      Alert.alert("Erreur", String(error))
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 pt-12 border-b border-gray-200">
        <Text className="text-xl font-bold">Test Upload</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-bold mb-4">Test Sélection Images</Text>
        
        <TouchableOpacity
          onPress={testImagePicker}
          className="bg-blue-500 p-4 rounded-xl mb-4"
        >
          <Text className="text-white text-center font-semibold text-lg">
            📸 Sélectionner une Image
          </Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <View className="mb-6">
            <Text className="font-semibold mb-2">Images sélectionnées ({images.length}):</Text>
            <View className="flex-row flex-wrap">
              {images.map((uri, index) => (
                <Image 
                  key={index}
                  source={{ uri }} 
                  className="w-24 h-24 rounded-lg mr-2 mb-2"
                />
              ))}
            </View>
          </View>
        )}

        <Text className="text-lg font-bold mb-4 mt-6">Test Sélection Vidéo</Text>
        
        <TouchableOpacity
          onPress={testVideoPicker}
          className="bg-red-500 p-4 rounded-xl mb-4"
        >
          <Text className="text-white text-center font-semibold text-lg">
            🎥 Sélectionner une Vidéo
          </Text>
        </TouchableOpacity>

        {video && (
          <View className="mb-6">
            <Text className="font-semibold mb-2">Vidéo sélectionnée:</Text>
            <Video
              source={{ uri: video }}
              style={{ width: "100%", height: 200, borderRadius: 10 }}
              useNativeControls
              resizeMode="contain"
            />
          </View>
        )}

        <View className="bg-gray-100 p-4 rounded-xl mt-6">
          <Text className="font-bold mb-2">Instructions:</Text>
          <Text className="text-sm text-gray-700 mb-1">1. Cliquez sur un bouton</Text>
          <Text className="text-sm text-gray-700 mb-1">2. Vérifiez les logs dans le terminal</Text>
          <Text className="text-sm text-gray-700 mb-1">3. Sélectionnez une image/vidéo</Text>
          <Text className="text-sm text-gray-700">4. Elle devrait s'afficher ci-dessus</Text>
        </View>

        <View className="bg-yellow-100 p-4 rounded-xl mt-4">
          <Text className="font-bold mb-2">⚠️ Si rien ne se passe:</Text>
          <Text className="text-sm text-gray-700 mb-1">• Vérifiez les logs dans le terminal</Text>
          <Text className="text-sm text-gray-700 mb-1">• Vérifiez les permissions Android</Text>
          <Text className="text-sm text-gray-700">• Redémarrez Metro avec --clear</Text>
        </View>
      </ScrollView>
    </View>
  )
}
