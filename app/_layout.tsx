import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { View, I18nManager } from "react-native"
import { CartProvider } from "@/lib/cart-context"
import { AuthProvider } from "@/lib/auth-context"
import { LanguageProvider, useLanguage } from "@/lib/i18n/language-context"
import { useEffect } from "react"
import "../global.css"

function AppContent() {
  const { isRTL } = useLanguage()

  useEffect(() => {
    // Activer le support RTL
    I18nManager.allowRTL(true)
    
    // Forcer le RTL si nécessaire
    if (isRTL && !I18nManager.isRTL) {
      I18nManager.forceRTL(true)
      // Note: Nécessite un redémarrage de l'app pour prendre effet
      console.log('RTL activé - Veuillez redémarrer l\'application')
    } else if (!isRTL && I18nManager.isRTL) {
      I18nManager.forceRTL(false)
      console.log('RTL désactivé - Veuillez redémarrer l\'application')
    }
  }, [isRTL])

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="shop/[id]" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="gestion/add-product" />
        <Stack.Screen name="gestion/products" />
        <Stack.Screen name="gestion/customize" />
        <Stack.Screen name="gestion/add-video" />
        <Stack.Screen name="test-upload" />
      </Stack>
    </View>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  )
}
