import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { translations } from './translations';

type Language = 'fr' | 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang && (savedLang === 'fr' || savedLang === 'ar' || savedLang === 'en')) {
        setLanguageState(savedLang as Language);
        const rtl = savedLang === 'ar';
        setIsRTL(rtl);
        
        // Configurer le RTL natif au démarrage
        if (rtl !== I18nManager.isRTL) {
          I18nManager.allowRTL(rtl);
          I18nManager.forceRTL(rtl);
        }
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('app_language', lang);
      setLanguageState(lang);
      const rtl = lang === 'ar';
      setIsRTL(rtl);
      
      // Activer le RTL natif pour l'arabe
      if (rtl !== I18nManager.isRTL) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
        // Note: Un redémarrage de l'app est nécessaire pour appliquer complètement le RTL
        // Vous pouvez utiliser Updates.reloadAsync() d'expo-updates si nécessaire
      }
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
