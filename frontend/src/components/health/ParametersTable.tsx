"use client"

import { useState, useEffect } from "react"
import { Calendar, Download, Search, Filter, Eye, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface HealthParameter {
  id: string
  category: string
  parameter: string
  value: string
  unit: string
  status: string
  statusIcon: string
  statusColor: string
  normalRange: string
  createdAt?: string
}

interface ReportData {
  id: string
  fileName: string
  uploadDate: string
  fileType: string
  status: string
  ocrConfidence: string
  healthScore: number | null
  totalParameters: number
  parameters: HealthParameter[]
  summary: {
    overallAssessment: string
    healthScore: number
    urgencyLevel: string
  } | null
}

interface ParametersTableProps {
  reportId?: string
  showHistory?: boolean
}

export function ParametersTable({ reportId, showHistory = false }: ParametersTableProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [allReports, setAllReports] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedReport, setSelectedReport] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

  useEffect(() => {
    if (showHistory) {
      fetchAllReports()
    } else if (reportId) {
      fetchReportParameters(reportId)
    }
  }, [reportId, showHistory])

  const fetchReportParameters = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/upload/parameters/${id}`)
      const data = await response.json()
      
      if (data.success) {
        setReportData(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch report parameters:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllReports = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/upload/history`)
      const data = await response.json()
      
      if (data.success) {
        setAllReports(data.data.reports)
        if (data.data.reports.length > 0) {
          setSelectedReport(data.data.reports[0].id)
          setReportData(data.data.reports[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch reports history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'NORMAL': 'bg-green-100 text-green-800 border-green-200',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
      'LOW': 'bg-blue-100 text-blue-800 border-blue-200',
      'CRITICAL': 'bg-red-100 text-red-800 border-red-200'
    }
    
    return `px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.NORMAL}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CRITICAL': return '🔴'
      case 'HIGH': return '🟡'
      case 'LOW': return '🟡'
      default: return '🟢'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUniqueCategories = (parameters: HealthParameter[]) => {
    return [...new Set(parameters.map(p => p.category))]
  }

  const filteredParameters = reportData?.parameters.filter(param => {
    const matchesSearch = param.parameter.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         param.value.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || param.category === selectedCategory
    
    return matchesSearch && matchesCategory
  }) || []

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading parameters...</span>
        </div>
      </Card>
    )
  }

  if (!reportData) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">No report data available</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Report Selector for History View */}
      {showHistory && allReports.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Report History</h3>
              <p className="text-sm text-gray-600">View parameters from all your health reports</p>
            </div>
            <div className="flex items-center space-x-3">
              <label htmlFor="report-select" className="text-sm font-medium text-gray-700">
                Select Report:
              </label>
              <select 
                id="report-select"
                value={selectedReport || ''}
                onChange={(e) => {
                  const selected = allReports.find(r => r.id === e.target.value)
                  if (selected) {
                    setSelectedReport(e.target.value)
                    setReportData(selected)
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allReports.map(report => (
                  <option key={report.id} value={report.id}>
                    {report.fileName} - {formatDate(report.uploadDate)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Report Information Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">📊 Health Parameters</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(reportData.uploadDate)}
              </span>
              <span>📁 {reportData.fileName}</span>
              <span>🔍 {reportData.ocrConfidence} confidence</span>
              <span>📋 {reportData.totalParameters} parameters</span>
            </div>
          </div>
          {reportData.healthScore && (
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{reportData.healthScore}/100</div>
              <p className="text-sm text-gray-600">Health Score</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search parameters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {getUniqueCategories(reportData.parameters).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </Card>

      {/* Parameters Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Parameter</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Value</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Unit</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Normal Range</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredParameters.map((param, index) => (
                <tr key={param.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">{param.parameter}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{getStatusIcon(param.status)}</span>
                      <span className="font-semibold text-gray-900">{param.value}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{param.unit}</td>
                  <td className="py-4 px-4">
                    <span className={getStatusBadge(param.status)}>
                      {param.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-600 text-sm">{param.normalRange}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                      {param.category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredParameters.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No parameters found matching your search criteria.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Summary Card */}
      {reportData.summary && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Report Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{reportData.summary.healthScore}/100</div>
              <div className="text-sm text-blue-800">Overall Health Score</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-green-600 capitalize">{reportData.summary.urgencyLevel}</div>
              <div className="text-sm text-green-800">Urgency Level</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-gray-600">{reportData.totalParameters}</div>
              <div className="text-sm text-gray-800">Total Parameters</div>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">{reportData.summary.overallAssessment}</p>
        </Card>
      )}
    </div>
  )
}