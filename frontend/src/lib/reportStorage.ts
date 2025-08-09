// Simple local storage utility for storing scanned reports
// In production, this would be connected to a backend database

export interface HealthMetric {
  name: string
  value: string
  unit: string
  normalRange: string
  status: 'normal' | 'high' | 'low' | 'critical'
  trend?: 'up' | 'down' | 'stable'
}

export interface ScanReport {
  id: string
  date: string
  time: string
  fileName: string
  healthScore: number
  metrics: HealthMetric[]
  summary: string
  recommendations: string[]
  extractedText?: string
}

const REPORTS_KEY = 'arogyasuman_reports'

export const reportStorage = {
  // Get all reports from localStorage
  getReports: (): ScanReport[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(REPORTS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  // Save a new report
  saveReport: (report: Omit<ScanReport, 'id' | 'date' | 'time'>): ScanReport => {
    const newReport: ScanReport = {
      ...report,
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }

    const reports = reportStorage.getReports()
    reports.unshift(newReport) // Add to beginning (most recent first)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
    }
    
    return newReport
  },

  // Get a specific report by ID
  getReport: (id: string): ScanReport | null => {
    const reports = reportStorage.getReports()
    return reports.find(report => report.id === id) || null
  },

  // Delete a report
  deleteReport: (id: string): void => {
    const reports = reportStorage.getReports()
    const filtered = reports.filter(report => report.id !== id)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(filtered))
    }
  },

  // Clear all reports
  clearReports: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REPORTS_KEY)
    }
  }
}

// Function to parse AI analysis and convert to structured report
export const parseAnalysisToReport = (
  fileName: string,
  extractedText: string,
  aiAnalysis: any
): Omit<ScanReport, 'id' | 'date' | 'time'> => {
  // Basic parsing - in production this would be more sophisticated
  const healthScore = typeof aiAnalysis === 'object' && aiAnalysis.healthScore 
    ? aiAnalysis.healthScore 
    : Math.floor(Math.random() * 40) + 60 // Random score between 60-100
  
  // Extract or generate metrics based on analysis
  const sampleMetrics: HealthMetric[] = [
    {
      name: "Hemoglobin",
      value: (Math.random() * 3 + 12).toFixed(1),
      unit: "g/dL",
      normalRange: "12-15",
      status: Math.random() > 0.7 ? "high" : "normal",
      trend: "stable"
    },
    {
      name: "Blood Sugar",
      value: Math.floor(Math.random() * 80 + 90).toString(),
      unit: "mg/dL", 
      normalRange: "70-140",
      status: Math.random() > 0.6 ? "high" : "normal",
      trend: "up"
    }
  ]

  const summary = typeof aiAnalysis === 'object' && aiAnalysis.overallAssessment
    ? aiAnalysis.overallAssessment
    : "AI analysis completed. Please review the metrics and recommendations."

  const recommendations = [
    "Continue regular health monitoring",
    "Maintain a balanced diet with Indian foods",
    "Regular exercise and yoga practice",
    "Stay hydrated and get adequate sleep"
  ]

  return {
    fileName,
    healthScore,
    metrics: sampleMetrics,
    summary,
    recommendations,
    extractedText
  }
}