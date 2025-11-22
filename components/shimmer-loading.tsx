import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Dimensions } from 'react-native'

const { width } = Dimensions.get('window')

interface ShimmerProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: any
}

export function Shimmer({ width: w = '100%', height = 20, borderRadius = 8, style }: ShimmerProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start()
  }, [])

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  })

  return (
    <View style={[styles.container, { width: w, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  )
}

export function VideoCardSkeleton() {
  return (
    <View style={styles.videoSkeleton}>
      {/* Avatar et nom */}
      <View style={styles.skeletonHeader}>
        <Shimmer width={40} height={40} borderRadius={20} />
        <View style={styles.skeletonHeaderText}>
          <Shimmer width={120} height={16} />
          <Shimmer width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Titre et description */}
      <View style={styles.skeletonContent}>
        <Shimmer width="80%" height={14} />
        <Shimmer width="60%" height={12} style={{ marginTop: 6 }} />
      </View>

      {/* Produits */}
      <View style={styles.skeletonProducts}>
        <Shimmer width={100} height={120} borderRadius={12} />
        <Shimmer width={100} height={120} borderRadius={12} style={{ marginLeft: 8 }} />
      </View>
    </View>
  )
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.productSkeleton}>
      <Shimmer width="100%" height={200} borderRadius={12} />
      <Shimmer width="80%" height={16} style={{ marginTop: 12 }} />
      <Shimmer width="40%" height={20} style={{ marginTop: 8 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  videoSkeleton: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    gap: 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonHeaderText: {
    flex: 1,
  },
  skeletonContent: {
    gap: 6,
  },
  skeletonProducts: {
    flexDirection: 'row',
    gap: 8,
  },
  productSkeleton: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
})
