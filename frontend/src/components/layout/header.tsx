"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Menu, X, User, Moon, Sun } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { LanguageSelector } from "@/components/ui/language-selector"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { useRouter } from "next/navigation"

export function Header() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const navigation = [
    { name: t("navigation.home"), href: "/" },
    { name: t("navigation.dashboard"), href: "/dashboard", requiresAuth: true },
    { name: "Health Hub", href: "/health-hub" },
    { name: t("navigation.tryApp"), href: "/try-app", requiresAuth: true },
    { name: t("navigation.doctors"), href: "/doctors" },
    { name: t("navigation.contact"), href: "/contact" },
  ]

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/" className="flex items-center space-x-2">
              <motion.div 
                className="bg-gradient-to-r from-primary-500 to-healing-500 p-2 rounded-lg shadow-lg"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <Heart className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-healing-600 bg-clip-text text-transparent">
                {t("common.appName")}
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => {
              const requiresAuth = (item as any).requiresAuth;
              const href = requiresAuth && !user ? `/login?redirect=${item.href}` : item.href;
              
              return (
                <motion.div
                  key={item.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    key={item.name}
                    href={href}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      pathname === item.href
                        ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400"
                        : "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    } ${requiresAuth && !user ? "opacity-75" : ""}`}
                    title={requiresAuth && !user ? "Login required" : ""}
                  >
                    {item.name}
                    {requiresAuth && !user && (
                      <span className="ml-1 text-xs">🔒</span>
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSelector />
            
            {/* Dark Mode Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDarkMode ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-sacred-500" />
                ) : (
                  <Moon className="h-5 w-5 text-primary-600" />
                )}
              </motion.div>
            </motion.button>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Button asChild variant="outline" className="text-sacred-700 border-sacred-300 hover:bg-sacred-50">
                    <Link href="/admin">
                      Admin Panel
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="text-gray-700 border-gray-300 hover:bg-primary-50">
                  <Link href="/dashboard">
                    <User className="h-4 w-4 mr-2" />
                    {user.displayName || user.email}
                  </Link>
                </Button>
                <Button onClick={handleLogout} variant="outline" className="text-gray-700 border-gray-300 hover:bg-alert-50 hover:text-alert-600 hover:border-alert-300">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="border-primary-500 text-primary-600 hover:bg-primary-50">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="bg-primary-500 hover:bg-primary-600 text-white">
                  <Link href="/try-app">{t("navigation.tryApp")}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              {navigation.map((item) => {
                const requiresAuth = (item as any).requiresAuth;
                const href = requiresAuth && !user ? `/login?redirect=${item.href}` : item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={href}
                    className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                      pathname === item.href
                        ? "text-primary-600 bg-primary-50"
                        : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                    } ${requiresAuth && !user ? "opacity-75" : ""}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                    {requiresAuth && !user && (
                      <span className="ml-1 text-xs">🔒</span>
                    )}
                  </Link>
                )
              })}
              <div className="px-3 py-2 space-y-2">
                <div className="mb-3">
                  <LanguageSelector />
                </div>
                {user ? (
                  <>
                    {user.role === 'admin' && (
                      <Button asChild className="w-full mb-2 text-sacred-700 border-sacred-300 hover:bg-sacred-50" variant="outline">
                        <Link href="/admin">Admin Panel</Link>
                      </Button>
                    )}
                    <div className="px-3 py-2 text-sm text-gray-700 font-medium">
                      <User className="h-4 w-4 inline mr-2" />
                      {user.displayName || user.email}
                    </div>
                    <Button onClick={handleLogout} className="w-full text-gray-700 border-gray-300 hover:bg-alert-50 hover:text-alert-600 hover:border-alert-300" variant="outline">
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild className="w-full border-primary-500 text-primary-600 hover:bg-primary-50" variant="outline">
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="w-full bg-primary-500 hover:bg-primary-600 text-white">
                      <Link href="/try-app">{t("navigation.tryApp")}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.header>
  )
}