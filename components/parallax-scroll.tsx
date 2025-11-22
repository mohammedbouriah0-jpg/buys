import React, { useRef } from 'react'
import { ScrollView, Animated, ViewStyle, ScrollViewProps } from 'react-native'

interface ParallaxScrollProps extends ScrollViewProps {
  children: React.ReactNode
  parallaxHeaderHeight?: number
  renderHeader?: (scrollY: Animated.Value) => React.ReactNode
  style?: ViewStyle
}

export function ParallaxScroll({
  children,
  parallaxHeaderHeight = 300,
  renderHeader,
  style,
  ...props
}: ParallaxScrollProps) {
  const scrollY = useRef(new Animated.Value(0)).current

  return (
    <>
      {renderHeader && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: parallaxHeaderHeight,
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [-parallaxHeaderHeight, 0, parallaxHeaderHeight],
                  outputRange: [parallaxHeaderHeight / 2, 0, -parallaxHeaderHeight / 2],
                  extrapolate: 'clamp',
                }),
              },
              {
                scale: scrollY.interpolate({
                  inputRange: [-parallaxHeaderHeight, 0],
                  outputRange: [2, 1],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: scrollY.interpolate({
              inputRange: [0, parallaxHeaderHeight / 2, parallaxHeaderHeight],
              outputRange: [1, 0.5, 0],
              extrapolate: 'clamp',
            }),
          }}
        >
          {renderHeader(scrollY)}
        </Animated.View>
      )}
      <Animated.ScrollView
        {...props}
        style={style}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {renderHeader && <Animated.View style={{ height: parallaxHeaderHeight }} />}
        {children}
      </Animated.ScrollView>
    </>
  )
}

// Hook pour créer des animations basées sur le scroll
export function useScrollAnimation(scrollY: Animated.Value) {
  const fadeIn = (start: number, end: number) => {
    return scrollY.interpolate({
      inputRange: [start, end],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    })
  }

  const fadeOut = (start: number, end: number) => {
    return scrollY.interpolate({
      inputRange: [start, end],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    })
  }

  const translateY = (start: number, end: number, distance: number) => {
    return scrollY.interpolate({
      inputRange: [start, end],
      outputRange: [distance, 0],
      extrapolate: 'clamp',
    })
  }

  const scale = (start: number, end: number, fromScale: number = 0.8, toScale: number = 1) => {
    return scrollY.interpolate({
      inputRange: [start, end],
      outputRange: [fromScale, toScale],
      extrapolate: 'clamp',
    })
  }

  return { fadeIn, fadeOut, translateY, scale }
}
