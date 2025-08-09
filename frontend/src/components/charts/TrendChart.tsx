'use client'

import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

interface TrendChartProps {
  data: Array<{
    date: string
    value: number
    label?: string
  }>
  title: string
  color?: string
  showArea?: boolean
  height?: number
  unit?: string
}

export default function TrendChart({
  data,
  title,
  color = '#FF7A00', // Primary saffron color
  showArea = false,
  height = 300,
  unit = ''
}: TrendChartProps) {
  const ChartComponent = showArea ? AreaChart : LineChart
  const DataComponent = showArea ? Area : Line

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {label}
          </p>
          <p className="text-sm" style={{ color }}>
            {payload[0].value} {unit}
          </p>
        </motion.div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
            className="dark:opacity-20"
          />
          
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          
          <YAxis 
            stroke="#6b7280"
            className="text-xs"
            tick={{ fontSize: 12 }}
            label={{ 
              value: unit, 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <DataComponent
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={showArea ? `url(#gradient-${color})` : undefined}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </motion.div>
  )
}