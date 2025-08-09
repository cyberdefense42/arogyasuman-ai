"use client"

import Link from "next/link"
import { ArrowRight, Heart, Sparkles, Shield, Zap, Users, Star, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const { t } = useLanguage()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
    // Trigger animations after component mounts
    setIsVisible(true)
  }, [user, loading, router])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-healing-50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-sacred-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-primary-200 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-healing-200 rounded-full opacity-25 animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-60 left-1/2 w-12 h-12 bg-info-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Animated Logo */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="bg-gradient-to-r from-primary-500 to-healing-500 p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300 animate-pulse">
                  <Heart className="h-12 w-12 text-white animate-pulse" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-sacred-400 rounded-full animate-ping"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-primary-400 rounded-full animate-bounce"></div>
              </div>
              <div className="ml-6">
                <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary-600 to-healing-600 bg-clip-text text-transparent animate-pulse">
                  ArogyaSuman
                </h1>
                <div className="flex items-center justify-center mt-2">
                  <Sparkles className="h-5 w-5 text-sacred-500 animate-spin" />
                  <span className="mx-2 text-primary-600 font-semibold">AI Powered Health Assistant</span>
                  <Sparkles className="h-5 w-5 text-sacred-500 animate-spin" />
                </div>
              </div>
            </div>

            {/* Main Headline */}
            <div className={`transition-all duration-1000 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Your Health, <span className="text-primary-600">Analyzed</span> with 
                <br className="hidden md:block" />
                <span className="text-healing-600"> Indian Wisdom</span> 🇮🇳
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
                Get instant, culturally-aware health insights from your blood reports. 
                <br className="hidden md:block" />
                <span className="text-primary-600 font-semibold">Free, Secure, and Made for Indians</span> ✨
              </p>
            </div>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-6 justify-center transition-all duration-1000 delay-500 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <Button asChild size="lg" className="text-lg px-10 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <Link href="/try-app" className="flex items-center">
                  <Zap className="mr-2 h-5 w-5 animate-pulse" />
                  Try Free Analysis 
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-lg px-10 py-4 border-2 border-primary-500 text-primary-600 hover:bg-primary-50 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                <Link href="/dashboard" className="flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  View Dashboard
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className={`mt-16 flex flex-wrap items-center justify-center gap-8 opacity-70 transition-all duration-1000 delay-700 transform ${isVisible ? 'translate-y-0 opacity-70' : 'translate-y-10 opacity-0'}`}>
              <div className="flex items-center text-gray-600">
                <Users className="h-5 w-5 mr-2 text-primary-500" />
                <span className="text-sm font-medium">10,000+ Users Trust Us</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Shield className="h-5 w-5 mr-2 text-healing-500" />
                <span className="text-sm font-medium">100% Privacy Guaranteed</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Star className="h-5 w-5 mr-2 text-sacred-500" />
                <span className="text-sm font-medium">Made in India 🇮🇳</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-primary-100 to-healing-100 rounded-full opacity-50 blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-r from-sacred-100 to-info-100 rounded-full opacity-50 blur-xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose <span className="text-primary-600">ArogyaSuman</span>? 
              <Sparkles className="inline-block h-8 w-8 text-sacred-500 ml-2 animate-spin" />
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Our AI understands <span className="text-healing-600 font-semibold">Indian health patterns</span>, 
              dietary preferences, and lifestyle factors to provide you with the most 
              <span className="text-primary-600 font-semibold"> culturally relevant health insights</span>.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <Card className="p-8 text-center hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-white to-primary-50 group">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Zap className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">⚡ Instant Analysis</h3>
              <p className="text-gray-600 leading-relaxed">
                Get comprehensive health insights in <span className="text-primary-600 font-semibold">seconds, not days</span>. 
                Our AI processes your reports instantly with 95% accuracy.
              </p>
              <div className="mt-4 flex items-center justify-center text-sm text-primary-600 font-medium">
                <CheckCircle className="h-4 w-4 mr-1" />
                Under 10 seconds
              </div>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 text-center hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-white to-healing-50 group">
              <div className="bg-gradient-to-r from-healing-500 to-healing-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Heart className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">🇮🇳 Indian-Specific</h3>
              <p className="text-gray-600 leading-relaxed">
                Recommendations based on <span className="text-healing-600 font-semibold">Indian dietary habits</span>, 
                regional foods, and traditional Ayurvedic wellness practices.
              </p>
              <div className="mt-4 flex items-center justify-center text-sm text-healing-600 font-medium">
                <CheckCircle className="h-4 w-4 mr-1" />
                500+ Indian foods database
              </div>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 text-center hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-white to-info-50 group">
              <div className="bg-gradient-to-r from-info-500 to-info-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">🛡️ Privacy First</h3>
              <p className="text-gray-600 leading-relaxed">
                Your health data is processed securely and <span className="text-info-600 font-semibold">never stored</span>. 
                Complete privacy guaranteed with end-to-end encryption.
              </p>
              <div className="mt-4 flex items-center justify-center text-sm text-info-600 font-medium">
                <CheckCircle className="h-4 w-4 mr-1" />
                256-bit encryption
              </div>
            </Card>
          </div>

          {/* Additional Features Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-16">
            <Card className="p-8 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-white to-sacred-50">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-sacred-500 to-sacred-600 w-12 h-12 rounded-xl flex items-center justify-center mr-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">🌟 AI-Powered Insights</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Our advanced AI analyzes over 50 health parameters and provides personalized 
                recommendations based on your unique health profile and Indian lifestyle.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-white to-alert-50">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-alert-400 to-alert-500 w-12 h-12 rounded-xl flex items-center justify-center mr-4">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">❤️ Made with Love</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Built by Indian healthcare professionals and AI experts who understand 
                the unique health challenges and cultural context of Indian families.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-500 via-primary-600 to-healing-500 relative overflow-hidden">
        {/* Animated Background Patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-20 h-20 border-2 border-white/20 rounded-full animate-ping"></div>
          <div className="absolute bottom-20 right-20 w-16 h-16 border-2 border-white/30 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-bounce"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="mb-8">
            <Sparkles className="h-16 w-16 text-sacred-300 mx-auto mb-4 animate-spin" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
            Ready to Take Control of Your 
            <br className="hidden md:block" />
            <span className="text-sacred-200">Health Journey?</span> 🚀
          </h2>
          <p className="text-xl text-primary-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join <span className="text-sacred-200 font-bold">10,000+ Indians</span> who trust ArogyaSuman for AI-powered health insights. 
            <br className="hidden md:block" />
            Upload your blood report and get instant analysis - <span className="text-white font-bold">completely free!</span> ✨
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-12 py-4 bg-white text-primary-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-bold">
              <Link href="/try-app" className="flex items-center">
                <Zap className="mr-3 h-6 w-6 text-primary-500" />
                Start Free Analysis Now
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-10 py-4 border-2 border-white text-white hover:bg-white hover:text-primary-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              <Link href="/dashboard" className="flex items-center">
                <Heart className="mr-2 h-5 w-5" />
                View Your Dashboard
              </Link>
            </Button>
          </div>

          {/* Final Trust Elements */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-primary-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-sacred-300 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm">No Sign-up Required</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-sacred-300 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm">Results in 10 Seconds</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-sacred-300 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm">100% Privacy Protected</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}