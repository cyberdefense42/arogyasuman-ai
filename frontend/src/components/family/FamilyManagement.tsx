"use client"

import { useState, useEffect } from 'react'
import { Users, Plus, Heart, Calendar, UserCheck, Settings, Crown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface FamilyMember {
  id: string
  name: string
  relationship: string
  role: string
  age: number
  gender: string
  bloodGroup?: string
  lastReport?: {
    date: string
    healthScore?: number
  }
}

interface Family {
  id: string
  name: string
  ownerId: string
}

interface FamilyData {
  family: Family | null
  members: FamilyMember[]
  stats: {
    totalMembers: number
    reportsThisMonth: number
  }
}

export default function FamilyManagement() {
  const [familyData, setFamilyData] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  useEffect(() => {
    fetchFamilyData()
  }, [])

  const fetchFamilyData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8080/api/v1/family/members')
      if (response.ok) {
        const data = await response.json()
        setFamilyData(data)
      }
    } catch (error) {
      console.error('Failed to fetch family data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createFamily = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: "My Family",
          description: "Family health management"
        })
      })
      
      if (response.ok) {
        fetchFamilyData()
      }
    } catch (error) {
      console.error('Failed to create family:', error)
    }
  }

  const switchToMember = async (memberId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/family/members/${memberId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedMember(memberId)
        // Handle member switch - you might want to update global state here
        console.log('Switched to member:', data.member)
      }
    } catch (error) {
      console.error('Failed to switch member:', error)
    }
  }

  const getHealthScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'self':
        return <UserCheck className="h-4 w-4" />
      case 'spouse':
        return <Heart className="h-4 w-4" />
      case 'child':
        return <Users className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="h-3 w-3 text-yellow-600" />
    if (role === 'admin') return <Settings className="h-3 w-3 text-blue-600" />
    return null
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  // No family created yet
  if (!familyData?.family) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Create Your Family Health Hub
        </h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Manage health reports for your entire family in one place. 
          Track everyone's health trends and get family health insights.
        </p>
        <Button onClick={createFamily} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Family
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Family Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {familyData.family.name}
              </h1>
              <p className="text-gray-600">
                {familyData.stats.totalMembers} member{familyData.stats.totalMembers !== 1 ? 's' : ''} • 
                {familyData.stats.reportsThisMonth} report{familyData.stats.reportsThisMonth !== 1 ? 's' : ''} this month
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddMember(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </Card>

      {/* Family Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {familyData.members.map((member) => (
          <Card 
            key={member.id} 
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
              selectedMember === member.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => switchToMember(member.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-gray-100 p-2 rounded-lg mr-3">
                  {getRelationshipIcon(member.relationship)}
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="text-sm text-gray-600 capitalize">
                    {member.relationship} • {member.age} years
                  </p>
                </div>
              </div>
              {member.lastReport?.healthScore && (
                <div className="text-right">
                  <div className={`text-lg font-bold ${getHealthScoreColor(member.lastReport.healthScore)}`}>
                    {member.lastReport.healthScore}
                  </div>
                  <div className="text-xs text-gray-500">Health Score</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Gender:</span>
                <span className="capitalize">{member.gender}</span>
              </div>
              {member.bloodGroup && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Blood Group:</span>
                  <span className="font-medium">{member.bloodGroup}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Report:</span>
                <span>
                  {member.lastReport ? (
                    new Date(member.lastReport.date).toLocaleDateString()
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      No reports
                    </span>
                  )}
                </span>
              </div>
            </div>

            {!member.lastReport && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-800">
                  Upload a health report to start tracking {member.name}'s health metrics.
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Family Health Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Family Health Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(familyData.members
                .filter(m => m.lastReport?.healthScore)
                .reduce((sum, m) => sum + (m.lastReport?.healthScore || 0), 0) / 
                familyData.members.filter(m => m.lastReport?.healthScore).length || 0
              )}
            </div>
            <div className="text-sm text-gray-600">Average Health Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {familyData.members.filter(m => 
                m.lastReport?.healthScore && m.lastReport.healthScore >= 80
              ).length}
            </div>
            <div className="text-sm text-gray-600">Members with Good Health</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {familyData.members.filter(m => 
                !m.lastReport || 
                (m.lastReport.date && 
                  new Date(m.lastReport.date) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                )
              ).length}
            </div>
            <div className="text-sm text-gray-600">Need Checkup</div>
          </div>
        </div>
      </Card>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Family Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter member name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowAddMember(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1">
                  Add Member
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}