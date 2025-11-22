import React, { useRef } from 'react'
import { TouchableOpacity, Animated, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native'

interface AnimatedButtonProps {
  onPress: () => void
  children: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

export function AnimatedButton({
  onPress,
  children,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
  disabled = false,
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const variantStyles = {
    primary: styles.primary,
    secondary: styles.secondary,
    outline: styles.outline,
    ghost: styles.ghost,
  }

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.button,
          variantStyles[variant],
          sizeStyles[size],
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : opacityAnim,
          },
          style,
        ]}
      >
        {typeof children === 'string' ? (
          <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primary: {
    backgroundColor: '#000',
  },
  secondary: {
    backgroundColor: '#ef4444',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  text: {
    fontWeight: '600',
    fontSize: 14,
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#000',
  },
  ghostText: {
    color: '#000',
  },
})
