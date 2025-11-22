import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { shopsAPI } from "@/lib/api"
import { X } from "lucide-react-native"

export default function CustomizePage() {
  const { user } = useAuth()
  const { t, isRTL } = useLanguage()
  
  const COLORS = [
    { name: t("black"), value: "#000000" },
    { name: t("blue"), value: "#3b82f6" },
    { name: t("red"), value: "#ef4444" },
    { name: t("green"), value: "#22c55e" },
    { name: t("purple"), value: "#a855f7" },
    { name: t("orange"), value: "#f97316" },
  ]
  const [shopName, setShopName] = useState(user?.shopName || "")
  const [description, setDescription] = useState(user?.shopDescription || "")
  const [accentColor, setAccentColor] = useState("#3b82f6")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadShopData()
  }, [])

  const loadShopData = async () => {
    try {
      if (user?.shopId) {
        const data = await shopsAPI.getById(user.shopId.toString())
        setAccentColor(data.accent_color || "#3b82f6")
        setShopName(data.shop_name || "")
        setDescription(data.description || "")
      }
    } catch (error) {
      console.error("Error loading shop:", error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await shopsAPI.customize({
        shop_name: shopName,
        description,
        primary_color: "#000000",
        accent_color: accentColor,
      })

      Alert.alert(t("successTitle"), t("customizationSaved"), [
        { text: "OK", onPress: () => router.back() }
      ])
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("unableToSave"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View className={`flex-row items-center justify-between p-4 pt-12 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Text className="text-xl font-bold" style={isRTL ? { textAlign: 'right' } : {}}>{t("customize")}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <Text className="text-sm font-semibold text-gray-700 mb-2" style={isRTL ? { textAlign: 'right' } : {}}>{t("shopName")}</Text>
        <TextInput
          value={shopName}
          onChangeText={setShopName}
          placeholder={t("shopNamePlaceholder")}
          className="bg-gray-50 p-4 rounded-xl mb-4"
          style={isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : {}}
        />

        <Text className="text-sm font-semibold text-gray-700 mb-2" style={isRTL ? { textAlign: 'right' } : {}}>{t("description")}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("shopDescriptionPlaceholder")}
          multiline
          numberOfLines={3}
          className="bg-gray-50 p-4 rounded-xl mb-6"
          style={isRTL ? { textAlignVertical: "top", textAlign: 'right', writingDirection: 'rtl' } : { textAlignVertical: "top" }}
        />

        <Text className="text-lg font-bold mb-4" style={isRTL ? { textAlign: 'right' } : {}}>{t("accentColor")}</Text>
        <View className="flex-row flex-wrap mb-6">
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color.value}
              onPress={() => setAccentColor(color.value)}
              className="mr-3 mb-3"
            >
              <View
                style={{ backgroundColor: color.value }}
                className={`w-16 h-16 rounded-xl ${
                  accentColor === color.value ? "border-4 border-gray-400" : ""
                }`}
              />
              <Text className="text-xs text-center mt-1">{color.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-gray-50 p-4 rounded-xl mb-6">
          <Text className="text-sm font-semibold mb-2" style={isRTL ? { textAlign: 'right' } : {}}>{t("preview")}</Text>
          <View style={{ backgroundColor: "#000" }} className="p-4 rounded-xl">
            <Text className="text-white font-bold text-lg mb-2" style={isRTL ? { textAlign: 'right' } : {}}>{t("myShopPreview")}</Text>
            <View style={{ backgroundColor: accentColor }} className="p-3 rounded-lg">
              <Text className="text-white text-center">{t("actionButton")}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className={`p-4 rounded-xl items-center ${loading ? "bg-gray-400" : "bg-black"}`}
        >
          <Text className="text-white font-semibold text-lg">
            {loading ? t("saving") : t("save")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
