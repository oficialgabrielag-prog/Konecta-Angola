import { createContext, useContext, useState, useEffect } from 'react';
import { pt } from '../i18n/pt';
import { en } from '../i18n/en';

type Language = 'pt' | 'en';
type Translations = typeof pt;

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}>({
  language: 'pt',
  setLanguage: () => {},
  t: (key) => pt[key] || key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'pt';
  });

  const translations = language === 'en' ? en : pt;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    // Here we would also update the Supabase user_settings
  };

  const t = (key: keyof Translations) => translations[key] || pt[key] || key;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useT = () => {
  const ctx = useContext(LanguageContext);
  const fn = ((key: keyof Translations) => ctx.t(key)) as ((key: keyof Translations) => string) & {
    t: (key: keyof Translations) => string;
    language: Language;
    setLanguage: (lang: Language) => void;
  };
  fn.t = ctx.t;
  fn.language = ctx.language;
  fn.setLanguage = ctx.setLanguage;
  return fn;
};
