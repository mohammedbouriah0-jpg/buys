import React from "react"
import { View, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface SafeBottomContainerProps {
  children: React.ReactNode
  style?: any
}

export function SafeBottomContainer({ children, style }: SafeBottomContainerProps) {
  const insets = useSafeAreaInsets()
  
  // Hauteur de la bottom nav (identique à bottom-nav.tsx)
  const bottomNavHeight = 75 + Math.max(insets.bottom + 12, 24)
  
  return (
    <View style={[styles.container, { paddingBottom: bottomNavHeight }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
