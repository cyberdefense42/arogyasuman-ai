"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Menu, X, User } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LanguageSelector } from "@/components/ui/language-selector"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

export function Header() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  const { user, logout } = useAuth()
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
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-primary-500 to-healing-500 p-2 rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{t("common.appName")}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => {
              const requiresAuth = (item as any).requiresAuth;
              const href = requiresAuth && !user ? `/login?redirect=${item.href}` : item.href;
              
              return (
                <Link
                  key={item.name}
                  href={href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === item.href
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  } ${requiresAuth && !user ? "opacity-75" : ""}`}
                  title={requiresAuth && !user ? "Login required" : ""}
                >
                  {item.name}
                  {requiresAuth && !user && (
                    <span className="ml-1 text-xs">🔒</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSelector />
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
    </header>
  )
}