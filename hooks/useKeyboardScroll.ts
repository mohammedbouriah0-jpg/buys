import { useRef, useState, useEffect, useCallback } from 'react';
import { Keyboard, Platform, ScrollView, Dimensions, TextInput, findNodeHandle } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * Hook professionnel pour gérer le scroll automatique vers les inputs
 * quand le clavier est ouvert sur Android et iOS.
 * 
 * Usage:
 * const { scrollViewRef, keyboardHeight, scrollToFocusedInput, keyboardVisible } = useKeyboardScroll();
 * 
 * <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: keyboardHeight + 100 }}>
 *   <TextInput onFocus={(e) => scrollToFocusedInput(e.target)} />
 * </ScrollView>
 */
export function useKeyboardScroll() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const currentScrollY = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Ancienne méthode avec position fixe (gardée pour compatibilité)
  const scrollToInput = useCallback((y: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ 
        y: Math.max(0, y - 50),
        animated: true 
      });
    }, Platform.OS === 'android' ? 200 : 100);
  }, []);

  // Nouvelle méthode: scroll automatique pour centrer le champ focus
  const scrollToFocusedInput = useCallback((target: any) => {
    if (!scrollViewRef.current || !target) return;

    setTimeout(() => {
      // Mesurer la position du champ par rapport à l'écran
      target.measureInWindow((x: number, y: number, width: number, height: number) => {
        // Zone visible = hauteur écran - hauteur clavier - header (~100px)
        const visibleHeight = SCREEN_HEIGHT - keyboardHeight - 100;
        // Position idéale = centrer le champ dans la zone visible
        const targetCenterY = visibleHeight / 2;
        
        // Si le champ est en dessous du centre visible, on doit scroller
        if (y > targetCenterY) {
          const scrollAmount = y - targetCenterY + height;
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, currentScrollY.current + scrollAmount),
            animated: true,
          });
        }
      });
    }, Platform.OS === 'android' ? 250 : 150);
  }, [keyboardHeight]);

  // Track scroll position
  const handleScroll = useCallback((event: any) => {
    currentScrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return {
    scrollViewRef,
    keyboardHeight,
    keyboardVisible,
    scrollToInput,
    scrollToFocusedInput,
    handleScroll,
  };
}
