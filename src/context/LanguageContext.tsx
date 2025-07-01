
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import en from '@/locales/en.json';
import bn from '@/locales/bn.json';

const translations = { en, bn };

export type Language = 'en' | 'bn';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedLang = localStorage.getItem('lekhajokha_language') as Language | null;
    if (storedLang && ['en', 'bn'].includes(storedLang)) {
      setLanguage(storedLang);
    }
    setIsLoaded(true);
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('lekhajokha_language', lang);
  }, []);

  const t = useCallback((key: string, replacements?: { [key: string]: string | number }): string => {
    const keys = key.split('.');
    
    const findTranslation = (lang: Language) => {
        let result: any = translations[lang];
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) return undefined;
        }
        return result;
    };

    let translatedString: string = findTranslation(language) || findTranslation('en') || key;

    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translatedString = translatedString.replace(`{{${rKey}}}`, String(replacements[rKey]));
        });
    }
    return translatedString;
  }, [language]);
  
  const value = useMemo(() => ({
    language,
    setLanguage: handleSetLanguage,
    t,
  }), [language, handleSetLanguage, t]);

  if (!isLoaded) return null;

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
