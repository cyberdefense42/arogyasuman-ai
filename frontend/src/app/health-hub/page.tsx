"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, BarChart3, Users, Heart } from 'lucide-react'
import HealthChat from '@/components/chat/HealthChat'
import HealthTimeline from '@/components/timeline/HealthTimeline'
import FamilyManagement from '@/components/family/FamilyManagement'

export default function HealthHubPage() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-healing-600 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <div className="bg-white/20 p-3 rounded-lg mr-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Health Hub
              </h1>
              <p className="text-primary-100 mt-2">
                Your comprehensive health management center with AI insights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>AI Health Chat</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Health Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="family" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Family Management</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chat */}
                <div className="lg:col-span-2">
                  <HealthChat className="h-[600px]" />
                </div>
                
                {/* Chat Info Panel */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-6 border">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      What can I help you with?
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                        <span>Explain your blood test results</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                        <span>Get personalized health recommendations</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                        <span>Understand what abnormal values mean</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                        <span>Ask about diet and lifestyle changes</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                        <span>Get guidance on next steps</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-healing-50 to-primary-50 rounded-lg p-6 border">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      💡 Pro Tip
                    </h3>
                    <p className="text-sm text-gray-700">
                      For more accurate responses, mention specific test values or 
                      upload your latest report before asking questions.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <HealthTimeline />
            </TabsContent>

            <TabsContent value="family" className="space-y-6">
              <FamilyManagement />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}