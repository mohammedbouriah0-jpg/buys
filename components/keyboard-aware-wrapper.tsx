import React from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface KeyboardAwareWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  extraScrollHeight?: number;
  enableOnAndroid?: boolean;
}

/**
 * Wrapper professionnel pour gérer le clavier sur iOS et Android.
 * Utilise react-native-keyboard-aware-scroll-view pour un comportement fiable.
 * 
 * IMPORTANT: Ce composant remplace la combinaison KeyboardAvoidingView + ScrollView
 * qui ne fonctionne pas correctement sur Android APK avec adjustResize.
 */
export function KeyboardAwareWrapper({
  children,
  style,
  contentContainerStyle,
  extraScrollHeight = 100,
  enableOnAndroid = true,
}: KeyboardAwareWrapperProps) {
  return (
    <KeyboardAwareScrollView
      style={[styles.container, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      enableOnAndroid={enableOnAndroid}
      enableAutomaticScroll={true}
      extraScrollHeight={extraScrollHeight}
      extraHeight={Platform.OS === 'android' ? 150 : 100}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      keyboardOpeningTime={0}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
