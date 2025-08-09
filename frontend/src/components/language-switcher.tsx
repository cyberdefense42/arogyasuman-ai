"use client"

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { Button } from './ui/button'

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (newLocale: string) => {
    // Remove the current locale from the pathname if it exists
    const pathWithoutLocale = pathname.replace(new RegExp(`^/(${languages.map(l => l.code).join('|')})`), '')
    
    // Create the new path with the selected locale
    const newPath = `/${newLocale}${pathWithoutLocale}`
    
    router.push(newPath)
  }

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  return (
    <div className="relative group">
      <Button variant="outline" size="sm" className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        <span className="sm:hidden">{currentLanguage.code.toUpperCase()}</span>
      </Button>
      
      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[180px]">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
              locale === language.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-sm text-gray-500">{language.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}