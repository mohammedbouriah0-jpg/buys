import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const isSmallDevice = SCREEN_WIDTH < 375;
const getMinPadding = (base: number) => isSmallDevice ? base * 0.75 : base;

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'both';
  backgroundColor?: string;
  minPadding?: number;
}

export default function SafeAreaWrapper({
  children,
  position = 'bottom',
  backgroundColor = '#fff',
  minPadding = 16
}: SafeAreaWrapperProps) {
  const insets = useSafeAreaInsets();
  const responsiveMinPadding = getMinPadding(minPadding);

  const paddingTop = position === 'top' || position === 'both' 
    ? Math.max(insets.top, responsiveMinPadding) 
    : 0;
    
  // Sur Android, ajouter un padding supplémentaire pour la barre de navigation
  const androidExtraPadding = Platform.OS === 'android' ? 16 : 0;
  const paddingBottom = position === 'bottom' || position === 'both'
    ? Math.max(insets.bottom + androidExtraPadding, responsiveMinPadding + androidExtraPadding)
    : 0;

  return (
    <View style={[
      styles.wrapper,
      { 
        backgroundColor,
        paddingTop,
        paddingBottom
      }
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
  },
});
