"use client"

import { useState } from "react"
import { Search, MapPin, Star, Calendar, Heart, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Doctor {
  id: string
  name: string
  specialization: string
  experience: number
  rating: number
  consultationFee: number
  location: string
  languages: string[]
  availableNow: boolean
  image?: string
  about: string
}

const mockDoctors: Doctor[] = [
  {
    id: "1",
    name: "डॉ. राज पटेल",
    specialization: "कार्डियोलॉजिस्ट",
    experience: 15,
    rating: 4.8,
    consultationFee: 800,
    location: "मुंबई, महाराष्ट्र",
    languages: ["हिंदी", "English", "गुजराती"],
    availableNow: true,
    about: "15 साल के अनुभव के साथ हृदय रोग विशेषज्ञ। मधुमेह और उच्च रक्तचाप के विशेषज्ञ।"
  },
  {
    id: "2", 
    name: "Dr. Priya Sharma",
    specialization: "Endocrinologist",
    experience: 12,
    rating: 4.9,
    consultationFee: 600,
    location: "Delhi, India",
    languages: ["Hindi", "English"],
    availableNow: false,
    about: "Specialist in diabetes, thyroid disorders, and hormonal imbalances. Focuses on lifestyle-based treatments."
  },
  {
    id: "3",
    name: "Dr. ராமன் சுப்ரமணியன்",
    specialization: "General Physician", 
    experience: 20,
    rating: 4.7,
    consultationFee: 500,
    location: "Chennai, Tamil Nadu",
    languages: ["Tamil", "English", "Hindi"],
    availableNow: true,
    about: "Family medicine specialist with expertise in preventive care and traditional medicine integration."
  }
]

export default function DoctorsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSpecialization, setSelectedSpecialization] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")

  const specializations = [
    "All Specializations",
    "Cardiologist", 
    "Endocrinologist",
    "General Physician",
    "Diabetologist",
    "Nephrologist"
  ]

  const locations = [
    "All Locations",
    "Mumbai",
    "Delhi", 
    "Bangalore",
    "Chennai",
    "Hyderabad",
    "Pune"
  ]

  const filteredDoctors = mockDoctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSpecialization = !selectedSpecialization || 
                                 selectedSpecialization === "All Specializations" ||
                                 doctor.specialization.includes(selectedSpecialization)
    const matchesLocation = !selectedLocation || 
                           selectedLocation === "All Locations" ||
                           doctor.location.includes(selectedLocation)
    
    return matchesSearch && matchesSpecialization && matchesLocation
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-healing-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 p-3 rounded-lg mr-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Find Doctors | डॉक्टर खोजें
            </h1>
          </div>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            Connect with certified doctors for personalized consultations based on your health analysis.
            <br />
            <span className="text-lg">अपने स्वास्थ्य विश्लेषण के आधार पर व्यक्तिगत परामर्श के लिए प्रमाणित डॉक्टरों से जुड़ें।</span>
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Doctors | डॉक्टर खोजें
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or specialization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization | विशेषज्ञता
                </label>
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {specializations.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location | स्थान
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  Search | खोजें
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Doctors List */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                    </div>
                  </div>
                  {doctor.availableNow && (
                    <span className="bg-healing-100 text-healing-800 text-xs px-2 py-1 rounded-full">
                      Available Now
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {doctor.experience} years experience | {doctor.experience} साल का अनुभव
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {doctor.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 mr-2 text-sacred-500" />
                    {doctor.rating}/5 ({Math.floor(Math.random() * 200) + 50} reviews)
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 line-clamp-3">{doctor.about}</p>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Languages | भाषाएं:</p>
                  <div className="flex flex-wrap gap-1">
                    {doctor.languages.map(lang => (
                      <span key={lang} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">₹{doctor.consultationFee}</p>
                    <p className="text-xs text-gray-500">Consultation Fee</p>
                  </div>
                  <div className="space-y-2">
                    <Button size="sm" className="w-full">
                      Book Consultation
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
              <p className="text-gray-600">कोई डॉक्टर नहीं मिला। कृपया अपने खोज मापदंड बदलें।</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}