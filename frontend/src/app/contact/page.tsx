import { Mail, Phone, MapPin, Heart } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-healing-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 p-3 rounded-lg mr-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Contact ArogyaSuman
            </h1>
          </div>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            We're here to help you on your health journey. Reach out to us for any questions, 
            feedback, or support regarding your AI-powered health analysis.
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="flex items-start">
                <Mail className="h-6 w-6 text-primary-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-gray-600">hello@arogyasuman.in</p>
                  <p className="text-gray-600">support@arogyasuman.in</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-start">
                <Phone className="h-6 w-6 text-primary-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-gray-600">+91 98765 43210</p>
                  <p className="text-sm text-gray-500">Mon-Fri, 9 AM - 6 PM IST</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-start">
                <MapPin className="h-6 w-6 text-primary-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Office</p>
                  <p className="text-gray-600">
                    Bangalore, Karnataka<br />
                    India 560001
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is ArogyaSuman free to use?
              </h3>
              <p className="text-gray-600">
                Yes, ArogyaSuman is completely free to use. We believe everyone should have access to AI-powered health insights 
                without any cost barriers.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How secure is my health data?
              </h3>
              <p className="text-gray-600">
                Your privacy is our top priority. We process your health reports locally and never store them on our servers. 
                All data is encrypted and deleted immediately after analysis.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I trust the AI recommendations?
              </h3>
              <p className="text-gray-600">
                Our AI provides educational insights based on medical knowledge and Indian health patterns. However, these are not 
                medical diagnoses. Always consult qualified healthcare providers for medical decisions.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}