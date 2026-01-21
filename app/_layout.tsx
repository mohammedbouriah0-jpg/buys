import { Stack, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { View } from "react-native"
import { CartProvider } from "@/lib/cart-context"
import { AuthProvider } from "@/lib/auth-context"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { useEffect } from "react"
import * as Linking from "expo-linking"
import { API_URL } from "@/config"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { ForceUpdateModal } from "@/components/ForceUpdateModal"
import "../global.css"

function AppContent() {
  const router = useRouter()
  
  // Vérification des mises à jour
  const { needsForceUpdate, updateInfo, openStore, checkForUpdate, currentVersion } = useAppUpdate()

  // Gérer les deep links
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url
        console.log('🔗 Deep link received (raw):', url)
        
        // Ignorer les URLs vides ou invalides
        if (!url || url === 'buys://' || url === 'buys:///' || url.trim() === '') {
          console.log('🔗 Ignoring empty/invalid deep link')
          return
        }
        
        // Parser l'URL manuellement pour plus de fiabilité
        let videoId: string | null = null
        let shopId: string | null = null
        
        // Format: buys://share/video/123 ou buys://share/shop/456
        // Ou format web: http://xxx/v/123-token ou http://xxx/s/123-token
        
        // Essayer le parsing Expo d'abord
        const { path, queryParams } = Linking.parse(url)
        console.log('🔗 Parsed - path:', path, 'queryParams:', queryParams)
        
        // Ignorer si pas de path valide
        if (!path || path === '' || path === '/') {
          console.log('🔗 No valid path in deep link, ignoring')
          return
        }
        
        // Méthode 1: Parser via Expo Linking
        if (path?.includes('share/video/')) {
          videoId = path.split('/').pop() || null
        } else if (path?.includes('share/shop/')) {
          shopId = path.split('/').pop() || null
        }
        
        // Méthode 2: Parser manuellement l'URL si Expo n'a pas trouvé
        if (!videoId && !shopId) {
          // Format: buys://share/video/123
          const videoMatch = url.match(/share\/video\/(\d+)/i)
          const shopMatch = url.match(/share\/shop\/(\d+)/i)
          
          // Format court: /v/123-token ou /s/123-token
          const shortVideoMatch = url.match(/\/v\/(\d+)/i)
          const shortShopMatch = url.match(/\/s\/(\d+)/i)
          
          if (videoMatch) {
            videoId = videoMatch[1]
          } else if (shortVideoMatch) {
            videoId = shortVideoMatch[1]
          } else if (shopMatch) {
            shopId = shopMatch[1]
          } else if (shortShopMatch) {
            shopId = shortShopMatch[1]
          }
        }
        
        console.log('🔗 Extracted - videoId:', videoId, 'shopId:', shopId)
        
        if (videoId && !isNaN(parseInt(videoId))) {
          console.log('🎬 Navigating to home with video:', videoId)
          // Rediriger vers l'accueil avec la vidéo en premier (avec navbar)
          setTimeout(() => {
            router.replace(`/(tabs)?videoId=${videoId}`)
          }, 500)
        } else if (shopId && !isNaN(parseInt(shopId))) {
          console.log('🏪 Navigating to shop:', shopId)
          setTimeout(() => {
            router.push(`/shop/${shopId}`)
          }, 500)
        }
      } catch (error) {
        console.error('❌ Deep link error:', error)
        // Ne pas rediriger en cas d'erreur, laisser l'app sur la page actuelle
      }
    }

    // Écouter les deep links
    const subscription = Linking.addEventListener('url', handleDeepLink)

    // Vérifier si l'app a été ouverte via un deep link (avec délai plus long pour cold start)
    setTimeout(() => {
      Linking.getInitialURL().then((url) => {
        if (url && url !== 'buys://' && url !== 'buys:///') {
          console.log('🚀 Initial URL:', url)
          handleDeepLink({ url })
        }
      }).catch(err => console.error('Initial URL error:', err))
    }, 1500)

    return () => {
      subscription.remove()
    }
  }, [router])

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      
      {/* Modal de mise à jour forcée */}
      <ForceUpdateModal
        visible={needsForceUpdate}
        currentVersion={currentVersion}
        latestVersion={updateInfo?.latestVersion || ''}
        updateMessage={updateInfo?.updateMessage || ''}
        onUpdate={openStore}
        onRetry={checkForUpdate}
      />
      
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
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
        <Stack.Screen name="video/[id]" />
        <Stack.Screen name="share/video/[id]" />
        <Stack.Screen name="share/shop/[id]" />
        <Stack.Screen name="v/[id]" />
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
