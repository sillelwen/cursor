"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, getStoredLocale, setStoredLocale, getDirection } from '@/lib/i18n';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const storedLocale = getStoredLocale();
    setLocaleState(storedLocale);
    // Set initial HTML attributes
    document.documentElement.dir = getDirection(storedLocale);
    document.documentElement.lang = storedLocale;
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
    // Update the document direction for RTL support
    document.documentElement.dir = getDirection(newLocale);
    document.documentElement.lang = newLocale;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
