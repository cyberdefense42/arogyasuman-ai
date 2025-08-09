'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'

interface MetricCardProps {
  title: string
  value: number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
  icon?: React.ReactNode
  color?: 'primary' | 'healing' | 'sacred' | 'alert' | 'info'
  delay?: number
}

export default function MetricCard({
  title,
  value,
  unit = '',
  trend,
  trendValue,
  icon,
  color = 'primary',
  delay = 0
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  
  // Animated counter effect
  useEffect(() => {
    const duration = 1000 // 1 second
    const steps = 60
    const increment = value / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [value])
  
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600 text-primary-600',
    healing: 'from-healing-500 to-healing-600 text-healing-600',
    sacred: 'from-sacred-500 to-sacred-600 text-sacred-600',
    alert: 'from-alert-500 to-alert-600 text-alert-600',
    info: 'from-info-500 to-info-600 text-info-600'
  }
  
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-healing-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-alert-600" />
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className="relative overflow-hidden"
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
        {/* Background gradient decoration */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full -translate-y-16 translate-x-16`} />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {icon && (
                <motion.div
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: delay + 0.2 }}
                  className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[color]} bg-opacity-10`}
                >
                  <div className={colorClasses[color]}>{icon}</div>
                </motion.div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {title}
                </p>
              </div>
            </div>
            
            {trend && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.4 }}
                className="flex items-center space-x-1"
              >
                {getTrendIcon()}
                {trendValue && (
                  <span className={`text-xs font-medium ${
                    trend === 'up' ? 'text-healing-600' : 
                    trend === 'down' ? 'text-alert-600' : 
                    'text-gray-600'
                  }`}>
                    {trendValue}%
                  </span>
                )}
              </motion.div>
            )}
          </div>
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.3 }}
            className="flex items-baseline"
          >
            <span className={`text-3xl font-bold ${colorClasses[color]}`}>
              {displayValue}
            </span>
            {unit && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {unit}
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}