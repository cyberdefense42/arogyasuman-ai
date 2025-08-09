"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }
];

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (languageCode: string) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple translation function that loads from our translation files
const getTranslation = (key: string, languageCode: string, fallback?: string): string => {
  // Basic English translations - in production, these would be loaded dynamically
  const englishTranslations: Record<string, any> = {
    'navigation.home': 'Home',
    'navigation.dashboard': 'Dashboard',
    'navigation.tryApp': 'Try App', 
    'navigation.doctors': 'Find Doctors',
    'navigation.contact': 'Contact',
    'navigation.doctorSignup': 'Doctor Signup',
    'common.appName': 'ArogyaSuman',
    'home.title': 'AI-Powered Health Analysis for Indians',
    'home.subtitle': 'Upload your blood reports and get instant AI analysis with personalized recommendations tailored to Indian dietary habits, lifestyle, and ayurvedic principles.'
  };

  const hindiTranslations: Record<string, any> = {
    'navigation.home': 'होम',
    'navigation.dashboard': 'डैशबोर्ड',
    'navigation.tryApp': 'ऐप आज़माएं',
    'navigation.doctors': 'डॉक्टर खोजें', 
    'navigation.contact': 'संपर्क',
    'navigation.doctorSignup': 'डॉक्टर पंजीकरण',
    'common.appName': 'आरोग्यसुमन',
    'home.title': 'भारतीयों के लिए AI-संचालित स्वास्थ्य विश्लेषण',
    'home.subtitle': 'अपनी रक्त रिपोर्ट अपलोड करें और भारतीय आहार की आदतों, जीवनशैली और आयुर्वेदिक सिद्धांतों के अनुकूल व्यक्तिगत सिफारिशों के साथ तत्काल AI विश्लेषण प्राप्त करें।'
  };

  const translations = languageCode === 'hi' ? hindiTranslations : englishTranslations;
  return translations[key] || fallback || key;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]); // Default to English

  const setLanguage = (languageCode: string) => {
    const language = languages.find(lang => lang.code === languageCode);
    if (language) {
      setCurrentLanguage(language);
    }
  };

  const t = (key: string, fallback?: string): string => {
    return getTranslation(key, currentLanguage.code, fallback);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}