import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { Header } from "@/components/layout/header"
import { ToastProvider } from "@/components/ui/Toast"
import PageTransition from "@/components/ui/PageTransition"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title: "ArogyaSuman AI - Indian Healthcare Assistant",
  description: "AI-powered health analysis for Indian families with culturally aware insights",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-primary-25 via-white to-healing-25 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-500`}
      >
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <Header />
              <PageTransition>
                <main className="min-h-screen">
                  {children}
                </main>
              </PageTransition>
              <ToastProvider />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
