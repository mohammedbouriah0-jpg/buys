import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { shopsAPI } from "@/lib/api"
import { X } from "lucide-react-native"
import SafeBottomButton from "@/components/safe-bottom-button"

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
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header moderne */}
      <View style={{
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
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Text style={{ 
          fontSize: 20,
          fontWeight: '800',
          color: '#111827',
          textAlign: isRTL ? 'right' : 'left'
        }}>{t("customize")}</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
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

      <ScrollView 
        style={{ flex: 1, backgroundColor: '#f9fafb' }}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
      >
        {/* Nom de la boutique */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2
        }}>
          <Text style={{ 
            fontSize: 12,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 8,
            textAlign: isRTL ? 'right' : 'left'
          }}>{t("shopName")}</Text>
          <TextInput
            value={shopName}
            onChangeText={setShopName}
            placeholder={t("shopNamePlaceholder")}
            placeholderTextColor="#9ca3af"
            style={{
              backgroundColor: '#f9fafb',
              padding: 10,
              borderRadius: 10,
              fontSize: 14,
              color: '#111827',
              fontWeight: '600',
              borderWidth: 1.5,
              borderColor: shopName ? '#3b82f6' : '#e5e7eb',
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr'
            }}
          />
        </View>

        {/* Description */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2
        }}>
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <Text style={{ 
              fontSize: 12,
              fontWeight: '700',
              color: '#111827',
              textAlign: isRTL ? 'right' : 'left'
            }}>{t("description")}</Text>
            <Text style={{ 
              fontSize: 10,
              color: '#9ca3af',
              fontWeight: '600'
            }}>{description.length}/200</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={(text) => setDescription(text.slice(0, 200))}
            placeholder={t("shopDescriptionPlaceholder")}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            maxLength={200}
            style={{
              backgroundColor: '#f9fafb',
              padding: 10,
              borderRadius: 10,
              fontSize: 13,
              color: '#111827',
              minHeight: 80,
              textAlignVertical: "top",
              borderWidth: 1.5,
              borderColor: description ? '#3b82f6' : '#e5e7eb',
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
              lineHeight: 18
            }}
          />
        </View>

        {/* Couleur d'accent */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2
        }}>
          <Text style={{ 
            fontSize: 12,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 12,
            textAlign: isRTL ? 'right' : 'left'
          }}>{t("accentColor")}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color.value}
                onPress={() => setAccentColor(color.value)}
                style={{ alignItems: 'center' }}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  backgroundColor: color.value,
                  borderRadius: 12,
                  borderWidth: accentColor === color.value ? 2.5 : 0,
                  borderColor: '#111827',
                  shadowColor: color.value,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: accentColor === color.value ? 0.4 : 0.2,
                  shadowRadius: 6,
                  elevation: accentColor === color.value ? 5 : 2,
                  transform: [{ scale: accentColor === color.value ? 1.05 : 1 }]
                }} />
                <Text style={{ 
                  fontSize: 10,
                  color: accentColor === color.value ? '#111827' : '#6b7280',
                  fontWeight: accentColor === color.value ? '700' : '500',
                  marginTop: 4,
                  textAlign: 'center'
                }}>{color.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bouton Enregistrer fixe */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <SafeBottomButton
          onPress={handleSave}
          title={loading ? t("saving") : t("save")}
          loading={loading}
          variant="black"
        />
      </View>
    </View>
  )
}
