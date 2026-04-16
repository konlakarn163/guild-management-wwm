
"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "th" | "en";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const defaultContext: LanguageContextValue = {
  language: "th",
  setLanguage: () => { },
  toggleLanguage: () => { },
};

const LanguageContext = createContext<LanguageContextValue>(defaultContext);

interface LanguageProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "guild-management-language";

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>("th");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
    if (storedLanguage === "th" || storedLanguage === "en") {
      setLanguage(storedLanguage);
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguage(nextLanguage);
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      },
      toggleLanguage: () => {
        setLanguage((currentLanguage) => {
          const nextLanguage = currentLanguage === "th" ? "en" : "th";
          window.localStorage.setItem(STORAGE_KEY, nextLanguage);
          return nextLanguage;
        });
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context;
}