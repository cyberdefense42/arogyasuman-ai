"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, languages } from "@/contexts/LanguageContext";

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, setLanguage } = useLanguage();

  const handleLanguageChange = (newLocale: string) => {
    setLanguage(newLocale);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden md:inline">{currentLanguage.nativeName}</span>
        <span className="md:hidden">{currentLanguage.code.toUpperCase()}</span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                    currentLanguage.code === language.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <div>
                    <div className="font-medium">{language.nativeName}</div>
                    <div className="text-xs text-gray-500">{language.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}