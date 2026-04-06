"use client";

import { useState, useEffect } from 'react';
import { Locale, getStoredLocale, setStoredLocale, getTranslation } from '@/lib/i18n';

interface LanguageSelectorProps {
  onLocaleChange?: (locale: Locale) => void;
}

export function LanguageSelector({ onLocaleChange }: LanguageSelectorProps) {
  const [currentLocale, setCurrentLocale] = useState<Locale>('en');

  useEffect(() => {
    const stored = getStoredLocale();
    setCurrentLocale(stored);
  }, []);

  const handleLocaleChange = (locale: Locale) => {
    setCurrentLocale(locale);
    setStoredLocale(locale);
    if (onLocaleChange) {
      onLocaleChange(locale);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-300">{getTranslation(currentLocale, 'language')}:</span>
      <select
        value={currentLocale}
        onChange={(e) => handleLocaleChange(e.target.value as Locale)}
        className="rounded bg-gray-800 px-2 py-1 text-sm text-gray-100"
      >
        <option value="en">{getTranslation(currentLocale, 'english')}</option>
        <option value="he">{getTranslation(currentLocale, 'hebrew')}</option>
        <option value="ru">{getTranslation(currentLocale, 'russian')}</option>
      </select>
    </div>
  );
}
