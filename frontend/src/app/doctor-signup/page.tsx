"use client"

import { useState } from "react"
import { User, Upload, Calendar, MapPin, Heart, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface DoctorFormData {
  // Personal Information
  fullName: string
  email: string
  phone: string
  
  // Professional Information
  medicalLicense: string
  specialization: string
  experience: string
  hospital: string
  consultationFee: string
  languages: string[]
  about: string
  
  // Availability
  timeSlots: string[]
  
  // Documents
  licenseFile: File | null
  degreeFile: File | null
  photoFile: File | null
  
  // Terms
  acceptTerms: boolean
}

const initialFormData: DoctorFormData = {
  fullName: "",
  email: "",
  phone: "",
  medicalLicense: "",
  specialization: "",
  experience: "",
  hospital: "",
  consultationFee: "",
  languages: [],
  about: "",
  timeSlots: [],
  licenseFile: null,
  degreeFile: null,
  photoFile: null,
  acceptTerms: false
}

const specializations = [
  "General Physician | सामान्य चिकित्सक",
  "Cardiologist | हृदय रोग विशेषज्ञ", 
  "Endocrinologist | अंतःस्रावी विशेषज्ञ",
  "Diabetologist | मधुमेह विशेषज्ञ",
  "Nephrologist | गुर्दा रोग विशेषज्ञ",
  "Gastroenterologist | गैस्ट्रो विशेषज्ञ",
  "Neurologist | न्यूरोलॉजिस्ट",
  "Orthopedic | हड्डी रोग विशेषज्ञ",
  "Dermatologist | त्वचा विशेषज्ञ",
  "Psychiatrist | मनोचिकित्सक"
]

const languages = [
  "English | अंग्रेजी",
  "Hindi | हिंदी", 
  "Tamil | तमिल",
  "Telugu | तेलुगु",
  "Bengali | बंगाली",
  "Gujarati | गुजराती",
  "Marathi | मराठी",
  "Kannada | कन्नड़",
  "Malayalam | मलयालम",
  "Punjabi | पंजाबी"
]

const timeSlots = [
  "9:00 AM - 12:00 PM",
  "12:00 PM - 3:00 PM", 
  "3:00 PM - 6:00 PM",
  "6:00 PM - 9:00 PM",
  "9:00 PM - 12:00 AM"
]

export default function DoctorSignupPage() {
  const [formData, setFormData] = useState<DoctorFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const handleInputChange = (field: keyof DoctorFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayChange = (field: 'languages' | 'timeSlots', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }))
  }

  const handleFileChange = (field: 'licenseFile' | 'degreeFile' | 'photoFile', file: File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Application Submitted Successfully!
            <br />
            <span className="text-lg text-gray-600">आवेदन सफलतापूर्वक जमा किया गया!</span>
          </h2>
          <p className="text-gray-600 mb-6">
            We will review your application and contact you within 2-3 business days.
            <br />
            <span className="text-sm">हम आपके आवेदन की समीक्षा करेंगे और 2-3 व्यावसायिक दिनों के भीतर संपर्क करेंगे।</span>
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full">
            Go to Homepage | होमपेज पर जाएं
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-healing-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 p-3 rounded-lg mr-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Join ArogyaSuman as a Doctor
            </h1>
          </div>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            Help patients with AI-powered health insights and provide consultations to those who need medical guidance.
            <br />
            <span className="text-lg">AI-संचालित स्वास्थ्य अंतर्दृष्टि के साथ रोगियों की मदद करें।</span>
          </p>
        </div>
      </section>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= step ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {step}
              </div>
              {step < totalSteps && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-primary-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Card className="p-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Personal Information | व्यक्तिगत जानकारी
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name | पूरा नाम
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address | ईमेल पता
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number | फोन नंबर
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Professional Information */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Professional Information | व्यावसायिक जानकारी
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical License Number | चिकित्सा लाइसेंस नंबर
                    </label>
                    <input
                      type="text"
                      value={formData.medicalLicense}
                      onChange={(e) => handleInputChange('medicalLicense', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter license number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization | विशेषज्ञता
                    </label>
                    <select
                      value={formData.specialization}
                      onChange={(e) => handleInputChange('specialization', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select specialization</option>
                      {specializations.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience | अनुभव के वर्ष
                    </label>
                    <input
                      type="number"
                      value={formData.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consultation Fee (₹) | परामर्श शुल्क
                    </label>
                    <input
                      type="number"
                      value={formData.consultationFee}
                      onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospital/Clinic Affiliation | अस्पताल/क्लिनिक संबद्धता
                  </label>
                  <input
                    type="text"
                    value={formData.hospital}
                    onChange={(e) => handleInputChange('hospital', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    placeholder="Hospital or clinic name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    About You | आपके बारे में
                  </label>
                  <textarea
                    value={formData.about}
                    onChange={(e) => handleInputChange('about', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    placeholder="Tell patients about your experience, approach to healthcare, and areas of expertise..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Languages and Availability */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Languages & Availability | भाषाएं और उपलब्धता
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages Spoken | बोली जाने वाली भाषाएं
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {languages.map(lang => (
                      <label key={lang} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.languages.includes(lang)}
                          onChange={() => handleArrayChange('languages', lang)}
                          className="mr-2"
                        />
                        <span className="text-sm">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Time Slots | उपलब्ध समय स्लॉट
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {timeSlots.map(slot => (
                      <label key={slot} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.timeSlots.includes(slot)}
                          onChange={() => handleArrayChange('timeSlots', slot)}
                          className="mr-2"
                        />
                        <span className="text-sm">{slot}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents and Terms */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Documents & Final Step | दस्तावेज़ और अंतिम चरण
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical License | चिकित्सा लाइसेंस
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('licenseFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="license-upload"
                      />
                      <label htmlFor="license-upload" className="cursor-pointer text-sm text-primary-600 hover:text-primary-500">
                        Upload License
                      </label>
                      {formData.licenseFile && (
                        <p className="text-xs text-gray-600 mt-1">{formData.licenseFile.name}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Degree | चिकित्सा डिग्री
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('degreeFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="degree-upload"
                      />
                      <label htmlFor="degree-upload" className="cursor-pointer text-sm text-primary-600 hover:text-primary-500">
                        Upload Degree
                      </label>
                      {formData.degreeFile && (
                        <p className="text-xs text-gray-600 mt-1">{formData.degreeFile.name}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo | प्रोफ़ाइल फोटो
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('photoFile', e.target.files?.[0] || null)}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer text-sm text-primary-600 hover:text-primary-500">
                        Upload Photo
                      </label>
                      {formData.photoFile && (
                        <p className="text-xs text-gray-600 mt-1">{formData.photoFile.name}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                    className="mt-1 mr-3"
                  />
                  <label className="text-sm text-gray-700">
                    I agree to the Terms and Conditions and Privacy Policy
                    <br />
                    <span className="text-xs">मैं नियम और शर्तों और गोपनीयता नीति से सहमत हूँ</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6"
            >
              Previous | पिछला
            </Button>
            
            {currentStep < totalSteps ? (
              <Button onClick={nextStep} className="px-6">
                Next | अगला
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!formData.acceptTerms || isSubmitting}
                className="px-6"
              >
                {isSubmitting ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                    Submitting... | जमा कर रहे हैं...
                  </>
                ) : (
                  'Submit Application | आवेदन जमा करें'
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}