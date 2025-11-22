import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import * as ImagePicker from "expo-image-picker"
import { X, Camera } from "lucide-react-native"

export default function EditProfilePage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [wilaya, setWilaya] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { userAPI } = await import("@/lib/api")
        const userData = await userAPI.getProfile()
        setPhone(userData.phone || "")
        setAddress(userData.address || "")
        setWilaya(userData.wilaya || "")
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }
    loadUserData()
  }, [])

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== "granted") {
        Alert.alert("Permission requise", "Nous avons besoin d'accéder à vos photos")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Erreur", "Impossible de sélectionner l'image")
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom est obligatoire")
      return
    }

    setLoading(true)

    try {
      const { userAPI } = await import("@/lib/api")
      
      const formData = new FormData()
      formData.append("name", name)
      formData.append("phone", phone)
      formData.append("address", address)
      formData.append("wilaya", wilaya)
      
      if (avatar) {
        const filename = avatar.split("/").pop() || "avatar.jpg"
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : "image/jpeg"
        
        formData.append("avatar", {
          uri: avatar,
          name: filename,
          type,
        } as any)
      }
      
      await userAPI.updateProfile(formData)

      Alert.alert("Succès", "Profil mis à jour", [
        { text: "OK", onPress: () => router.back() }
      ])
    } catch (error: any) {
      console.error("Error updating profile:", error)
      Alert.alert("Erreur", error.message || "Impossible de mettre à jour le profil")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 pt-12 border-b border-gray-200">
        <Text className="text-xl font-bold">Modifier le profil</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Photo de profil */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickImage} className="relative">
            {avatar || user?.avatar ? (
              <Image 
                source={{ uri: avatar || user?.avatar || 'https://via.placeholder.com/120' }} 
                className="w-32 h-32 rounded-full"
              />
            ) : (
              <View className="w-32 h-32 rounded-full bg-gray-200 items-center justify-center">
                <Text className="text-4xl text-gray-500">
                  {name.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-black rounded-full p-2">
              <Camera size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text className="text-gray-600 mt-2 text-sm">Appuyez pour changer la photo</Text>
        </View>

        {/* Nom */}
        <Text className="text-sm font-semibold text-gray-700 mb-2">Nom *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Votre nom"
          className="bg-gray-50 p-4 rounded-xl mb-4"
        />

        {/* Email (non modifiable) */}
        <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
        <TextInput
          value={email}
          editable={false}
          className="bg-gray-100 p-4 rounded-xl mb-4 text-gray-500"
        />
        <Text className="text-xs text-gray-500 -mt-2 mb-4">
          L'email ne peut pas être modifié
        </Text>

        {/* Téléphone */}
        <Text className="text-sm font-semibold text-gray-700 mb-2">Téléphone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Ex: 0555123456"
          keyboardType="phone-pad"
          className="bg-gray-50 p-4 rounded-xl mb-4"
        />

        {/* Adresse */}
        <Text className="text-sm font-semibold text-gray-700 mb-2">Adresse</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Rue, quartier, ville..."
          multiline
          numberOfLines={2}
          className="bg-gray-50 p-4 rounded-xl mb-4"
          style={{ textAlignVertical: 'top' }}
        />

        {/* Wilaya */}
        <Text className="text-sm font-semibold text-gray-700 mb-2">Wilaya</Text>
        <TextInput
          value={wilaya}
          onChangeText={setWilaya}
          placeholder="Ex: Alger, Oran, Constantine..."
          className="bg-gray-50 p-4 rounded-xl mb-6"
        />

        {/* Type de compte */}
        <View className="bg-blue-50 p-4 rounded-xl mb-6">
          <Text className="font-semibold mb-1">Type de compte</Text>
          <Text className="text-gray-700">
            {user?.type === 'shop' ? '🏪 Boutique' : '👤 Client'}
          </Text>
          {user?.type === 'shop' && user?.shopName && (
            <Text className="text-gray-600 text-sm mt-1">
              Boutique: {user.shopName}
            </Text>
          )}
        </View>

        {/* Bouton sauvegarder */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className={`p-4 rounded-xl items-center ${loading ? "bg-gray-400" : "bg-black"}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Enregistrer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
