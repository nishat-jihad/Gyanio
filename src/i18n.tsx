import React, { createContext, useContext, useState, useEffect } from 'react';

const i18nContext = createContext<any>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState(localStorage.getItem('gyanio_lang') || 'en');
  const [translations, setTranslations] = useState<any>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const res = await fetch(`/locales/${lang}.json`);
        const data = await res.json();
        setTranslations(data);
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', ['ar', 'ur'].includes(lang) ? 'rtl' : 'ltr');
      } catch (err) {
        console.error('Failed to load translations', err);
      }
    };
    loadTranslations();
  }, [lang]);

  const t = (key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], translations) || key;
  };

  const changeLang = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem('gyanio_lang', newLang);
  };

  return (
    <i18nContext.Provider value={{ t, lang, changeLang }}>
      {children}
    </i18nContext.Provider>
  );
};

export const useI18n = () => useContext(i18nContext);
