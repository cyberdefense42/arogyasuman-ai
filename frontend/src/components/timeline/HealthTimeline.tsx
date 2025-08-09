"use client"

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface TimelineData {
  period: string
  reportCount: number
  metrics: Array<{
    metric: string
    average: string
    min: number
    max: number
    unit: string
  }>
  averageHealthScore: number
}

interface MetricTrend {
  metric: string
  dataPoints: Array<{
    date: string
    value: number
    unit: string
    flag: string
  }>
  statistics: {
    current: number
    previous: number
    change: string
    average: string
    trend: string
  }
  interpretation: string
}

export default function HealthTimeline() {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [metricTrend, setMetricTrend] = useState<MetricTrend | null>(null)
  const [timeRange, setTimeRange] = useState('6months')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTimelineData()
  }, [timeRange])

  const fetchTimelineData = async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const response = await fetch(
        `http://localhost:8080/api/v1/timeline?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=month`
      )

      if (response.ok) {
        const data = await response.json()
        setTimelineData(data.timeline || [])
      }
    } catch (error) {
      console.error('Failed to fetch timeline data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetricTrend = async (metric: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/timeline/metric/${metric}`)
      if (response.ok) {
        const data = await response.json()
        setMetricTrend(data)
      }
    } catch (error) {
      console.error('Failed to fetch metric trend:', error)
    }
  }

  const handleMetricClick = (metric: string) => {
    setSelectedMetric(metric)
    fetchMetricTrend(metric)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'increasing_fast':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'decreasing':
      case 'decreasing_fast':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (change: number) => {
    if (Math.abs(change) < 5) return 'text-gray-600'
    return change > 0 ? 'text-red-600' : 'text-green-600'
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Health Timeline</h2>
          </div>
          <div className="flex space-x-2">
            {['3months', '6months', '1year'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === '3months' ? '3M' : range === '6months' ? '6M' : '1Y'}
              </Button>
            ))}
          </div>
        </div>

        {timelineData.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No health data available for the selected time range.</p>
            <p className="text-sm text-gray-500 mt-2">Upload some reports to see your health timeline!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timelineData.map((period, index) => (
              <div key={period.period} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {new Date(period.period).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {period.reportCount} report{period.reportCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">
                      {period.averageHealthScore.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">Health Score</div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {period.metrics.slice(0, 6).map((metric) => (
                    <button
                      key={metric.metric}
                      onClick={() => handleMetricClick(metric.metric)}
                      className="text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-900">
                        {metric.metric}
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {metric.average} {metric.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Range: {metric.min} - {metric.max}
                      </div>
                    </button>
                  ))}
                </div>

                {period.metrics.length > 6 && (
                  <div className="mt-3 text-center">
                    <Button variant="outline" size="sm">
                      View All {period.metrics.length} Metrics
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Metric Trend Detail */}
      {selectedMetric && metricTrend && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{selectedMetric} Trend</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedMetric(null)
                setMetricTrend(null)
              }}
            >
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Current Value</div>
              <div className="text-2xl font-bold text-blue-600">
                {metricTrend.statistics.current}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Change from Previous</div>
              <div className={`text-2xl font-bold ${getTrendColor(parseFloat(metricTrend.statistics.change))}`}>
                {parseFloat(metricTrend.statistics.change) > 0 ? '+' : ''}
                {metricTrend.statistics.change}%
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Average</div>
              <div className="text-2xl font-bold text-green-600">
                {metricTrend.statistics.average}
              </div>
            </div>
          </div>

          {/* Data Points */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center">
              {getTrendIcon(metricTrend.statistics.trend)}
              <span className="ml-2">Recent Values</span>
            </h4>
            <div className="space-y-2">
              {metricTrend.dataPoints.slice(-5).reverse().map((point, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">
                    {new Date(point.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">
                      {point.value} {point.unit}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      point.flag === 'normal' ? 'bg-green-100 text-green-800' :
                      point.flag === 'high' || point.flag === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {point.flag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Interpretation */}
          {metricTrend.interpretation && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">AI Interpretation</h4>
              <p className="text-blue-800 text-sm leading-relaxed">
                {metricTrend.interpretation}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}