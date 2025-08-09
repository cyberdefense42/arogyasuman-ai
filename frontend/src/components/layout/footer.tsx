import Link from "next/link"
import { Heart, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">ArogyaSuman | आरोग्यसुमन</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Empowering Indians with AI-powered health insights. Analyze your blood reports 
              and get personalized recommendations tailored to Indian dietary habits and lifestyle.
              <br />
              <span className="text-sm">भारतीयों को AI-संचालित स्वास्थ्य अंतर्दृष्टि के साथ सशक्त बनाना।</span>
            </p>
            <div className="flex space-x-4">
              <Mail className="h-5 w-5 text-gray-400" />
              <Phone className="h-5 w-5 text-gray-400" />
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links | त्वरित लिंक</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Home | होम
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard | डैशबोर्ड
                </Link>
              </li>
              <li>
                <Link href="/try-app" className="text-gray-300 hover:text-white transition-colors">
                  Try App | ऐप आज़माएं
                </Link>
              </li>
              <li>
                <Link href="/doctors" className="text-gray-300 hover:text-white transition-colors">
                  Find Doctors | डॉक्टर खोजें
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact Us | संपर्क करें
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services | सेवाएं</h3>
            <ul className="space-y-2">
              <li className="text-gray-300">Blood Report Analysis | रक्त रिपोर्ट विश्लेषण</li>
              <li className="text-gray-300">Health Recommendations | स्वास्थ्य सिफारिशें</li>
              <li className="text-gray-300">Indian Diet Planning | भारतीय आहार योजना</li>
              <li className="text-gray-300">Doctor Consultations | डॉक्टर परामर्श</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2025 ArogyaSuman | आरोग्यसुमन. All rights reserved. Made with ❤️ for India's health.
          </p>
          <p className="text-gray-400 text-sm mt-2 md:mt-0">
            Powered by AI • Designed for Indians | AI द्वारा संचालित • भारतीयों के लिए डिज़ाइन किया गया
          </p>
        </div>
      </div>
    </footer>
  )
}