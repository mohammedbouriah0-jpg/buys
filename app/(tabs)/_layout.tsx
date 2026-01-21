import { View, StyleSheet } from "react-native"
import { Slot } from "expo-router"
import { BottomNav } from "@/components/bottom-nav"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  // Hauteur de la navbar : paddingTop(10) + contenu(~50) + paddingBottom(max(insets.bottom+12, 24))
  const bottomNavHeight = 60 + Math.max(insets.bottom + 12, 24)
  
  return (
    <View style={styles.container}>
      <View style={[styles.content, { marginBottom: bottomNavHeight }]}>
        <Slot />
      </View>
      <BottomNav />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
})
