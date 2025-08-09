"use client"

import { useState, useEffect } from "react"
import { Calendar, TrendingUp, TrendingDown, Activity, Heart, FileText, AlertTriangle, CheckCircle, Table, BarChart3, Users } from "lucide-react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import MetricCard from "@/components/ui/MetricCard"
import TrendChart from "@/components/charts/TrendChart"
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton"
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/ui/PageTransition"
import { showToast } from "@/components/ui/Toast"
import { useLanguage } from "@/contexts/LanguageContext"
import { reportStorage, type ScanReport, type HealthMetric } from "@/lib/reportStorage"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { ParametersTable } from "@/components/health/ParametersTable"

export default function DashboardPage() {
  const [selectedReport, setSelectedReport] = useState<ScanReport | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'parameters'>('overview')
  const [reports, setReports] = useState<ScanReport[]>([])
  const { t } = useLanguage()
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  
  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    // Load reports from localStorage only
    const storedReports = reportStorage.getReports()
    setReports(storedReports)
    
    // Show welcome toast for first-time users
    if (storedReports.length === 0) {
      showToast.info(
        "Welcome to ArogyaSuman!",
        "Upload your first blood report to get started with AI-powered health insights."
      )
    }
  }, [user, loading, router])
  
  // Generate trend data from reports
  const getTrendData = (metricName: string) => {
    return reports
      .slice(0, 6) // Last 6 reports
      .reverse()
      .map((report, index) => {
        const metric = report.metrics.find(m => m.name.includes(metricName))
        return {
          date: new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: metric ? parseFloat(metric.value.toString()) : 0,
          label: report.fileName
        }
      })
      .filter(item => item.value > 0)
  }
  
  // Calculate metric trends
  const getMetricTrend = (metricName: string) => {
    const data = getTrendData(metricName)
    if (data.length < 2) return { trend: 'stable', value: 0 }
    
    const latest = data[data.length - 1].value
    const previous = data[data.length - 2].value
    const change = ((latest - previous) / previous) * 100
    
    return {
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      value: Math.abs(Math.round(change))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-25 via-white to-healing-25 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="bg-gradient-to-r from-primary-600 to-healing-600 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Skeleton width="300px" height="48px" className="bg-white/20" />
            <Skeleton width="200px" height="24px" className="bg-white/10 mt-4" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard className="h-96" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-healing-600 bg-healing-50'
      case 'high': return 'text-sacred-600 bg-sacred-50'
      case 'low': return 'text-primary-600 bg-primary-50'
      case 'critical': return 'text-alert-600 bg-alert-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-healing-600'
    if (score >= 60) return 'text-sacred-600'
    return 'text-alert-600'
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-healing-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-alert-600" />
      case 'stable': return <Activity className="h-4 w-4 text-gray-600" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-healing-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white/20 p-3 rounded-lg mr-4">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Health Dashboard
                </h1>
                <p className="text-primary-100 mt-2">
                  Welcome, {user?.displayName || user?.email}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant={viewMode === 'overview' ? 'secondary' : 'outline'}
                onClick={() => setViewMode('overview')}
                className={viewMode === 'overview' ? 
                  "bg-white text-primary-600 border-white font-semibold hover:bg-gray-100" : 
                  "text-white border-white bg-white/10 hover:bg-white/20 font-semibold backdrop-blur-sm"
                }
              >
                Overview
              </Button>
              <Button 
                variant={viewMode === 'detailed' ? 'secondary' : 'outline'}
                onClick={() => setViewMode('detailed')}
                className={viewMode === 'detailed' ? 
                  "bg-white text-primary-600 border-white font-semibold hover:bg-gray-100" : 
                  "text-white border-white bg-white/10 hover:bg-white/20 font-semibold backdrop-blur-sm"
                }
              >
                Detailed View
              </Button>
              <Button 
                variant={viewMode === 'parameters' ? 'secondary' : 'outline'}
                onClick={() => setViewMode('parameters')}
                className={viewMode === 'parameters' ? 
                  "bg-white text-primary-600 border-white font-semibold hover:bg-gray-100" : 
                  "text-white border-white bg-white/10 hover:bg-white/20 font-semibold backdrop-blur-sm"
                }
              >
                <Table className="h-4 w-4 mr-2" />
                Parameters
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="text-white border-white bg-alert-500/20 hover:bg-alert-500/30 font-semibold backdrop-blur-sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'overview' ? (
          <>
            {reports.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">No Health Reports Yet</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Upload your first blood report to start tracking your health journey with personalized AI insights.
                </p>
                <Button asChild size="lg">
                  <a href="/try-app">Scan Your First Report</a>
                </Button>
              </div>
            ) : (
              <>
                {/* Latest Report Summary */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Latest Health Summary</h2>
                  {reports[0] && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <FileText className="h-6 w-6 text-primary-600 mr-3" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{reports[0].fileName}</h3>
                        <p className="text-sm text-gray-600">{reports[0].date} at {reports[0].time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getHealthScoreColor(reports[0].healthScore)}`}>
                        {reports[0].healthScore}/100
                      </div>
                      <p className="text-sm text-gray-600">Health Score</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {reports[0].metrics.map((metric, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">{metric.name}</p>
                          {getTrendIcon(metric.trend)}
                        </div>
                        <p className="text-xl font-bold text-gray-900">{metric.value} {metric.unit}</p>
                        <p className={`text-xs px-2 py-1 rounded-full inline-block ${getStatusColor(metric.status)}`}>
                          {metric.status.toUpperCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-gray-700 mb-4">{reports[0].summary}</p>
                  
                  <div className="flex justify-between items-center">
                    <Button 
                      onClick={() => setSelectedReport(reports[0])}
                      variant="outline"
                    >
                      View Full Report
                    </Button>
                    <Button asChild>
                      <a href="/try-app">Scan New Report</a>
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Report History */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Report History</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                  <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedReport(report)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="font-medium text-gray-900">{report.date}</p>
                          <p className="text-sm text-gray-600">{report.time}</p>
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${getHealthScoreColor(report.healthScore)}`}>
                        {report.healthScore}
                      </div>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-2 truncate">{report.fileName}</h3>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      {report.metrics.map((metric, index) => (
                        <span key={index} className={`text-xs px-2 py-1 rounded-full ${getStatusColor(metric.status)}`}>
                          {metric.name}
                        </span>
                      ))}
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">{report.summary}</p>
                  </Card>
                ))}
              </div>
            </div>
              </>
            )}
          </>
        ) : viewMode === 'parameters' ? (
          /* Parameters Table View */
          <div>
            <ParametersTable showHistory={true} />
          </div>
        ) : (
          /* Detailed View */
          <div>
            {reports.length === 0 ? (
              /* Empty State for Detailed View */
              <div className="text-center py-16">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">No Reports for Detailed Analysis</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Upload multiple reports to see detailed trends and comparisons of your health metrics over time.
                </p>
                <Button asChild size="lg">
                  <a href="/try-app">Upload Your First Report</a>
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Health Metrics</h2>
                
                {/* Metrics Comparison Table */}
                <Card className="p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Metrics Trends</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Metric</th>
                          {reports.map((report) => (
                            <th key={report.id} className="text-center py-3 px-4">
                              {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </th>
                          ))}
                          <th className="text-left py-3 px-4">Normal Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports[0]?.metrics.map((metric, metricIndex) => (
                          <tr key={metricIndex} className="border-b">
                            <td className="py-3 px-4 font-medium">{metric.name}</td>
                            {reports.map((report) => {
                              const reportMetric = report.metrics[metricIndex]
                              return (
                                <td key={report.id} className="text-center py-3 px-4">
                                  <div className={`inline-block px-2 py-1 rounded ${getStatusColor(reportMetric?.status || 'normal')}`}>
                                    {reportMetric?.value || 'N/A'} {reportMetric?.unit || ''}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="py-3 px-4 text-sm text-gray-600">{metric.normalRange} {metric.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Recommendations Timeline */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations Timeline</h3>
                  <div className="space-y-6">
                    {reports.map((report, index) => (
                      <div key={report.id} className="flex">
                        <div className="flex-shrink-0 w-24 text-sm text-gray-600">
                          {report.date}
                        </div>
                        <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2 mr-4"></div>
                        <div className="flex-grow">
                          <h4 className="font-medium text-gray-900 mb-2">{report.fileName}</h4>
                          <ul className="space-y-1">
                            {report.recommendations.map((rec, recIndex) => (
                              <li key={recIndex} className="text-sm text-gray-600 flex items-start">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* Report Detail Modal/Panel */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedReport.fileName}</h2>
                  <p className="text-gray-600">{selectedReport.date} at {selectedReport.time}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {selectedReport.metrics.map((metric, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">{metric.name}</p>
                      {getTrendIcon(metric.trend)}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{metric.value} {metric.unit}</p>
                    <p className="text-sm text-gray-600 mb-2">Normal: {metric.normalRange} {metric.unit}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(metric.status)}`}>
                      {metric.status.toUpperCase()}
                    </span>
                  </Card>
                ))}
              </div>

              <Card className="p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Health Score</h3>
                <div className={`text-4xl font-bold ${getHealthScoreColor(selectedReport.healthScore)} mb-2`}>
                  {selectedReport.healthScore}/100
                </div>
                <p className="text-gray-700">{selectedReport.summary}</p>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {selectedReport.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}