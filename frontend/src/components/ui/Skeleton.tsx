'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  count?: number
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  count = 1
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700 animate-pulse'
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl'
  }
  
  const getHeight = () => {
    if (height) return height
    switch (variant) {
      case 'text': return '1rem'
      case 'circular': return width || '40px'
      case 'rectangular': return '100px'
      case 'card': return '200px'
      default: return '1rem'
    }
  }
  
  const getWidth = () => {
    if (width) return width
    switch (variant) {
      case 'text': return '100%'
      case 'circular': return '40px'
      case 'rectangular': return '100%'
      case 'card': return '100%'
      default: return '100%'
    }
  }
  
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={cn(
            baseClasses,
            variantClasses[variant],
            className,
            count > 1 && index < count - 1 && 'mb-2'
          )}
          style={{
            width: getWidth(),
            height: getHeight()
          }}
        />
      ))}
    </>
  )
}

// Specialized skeleton components
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50',
        className
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1">
            <Skeleton width="60%" className="mb-2" />
            <Skeleton width="40%" />
          </div>
        </div>
        <Skeleton count={3} />
        <div className="flex space-x-2">
          <Skeleton width="80px" height="32px" variant="rectangular" />
          <Skeleton width="80px" height="32px" variant="rectangular" />
        </div>
      </div>
    </motion.div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Skeleton width="200px" height="24px" />
      </div>
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr>
              {Array.from({ length: 4 }).map((_, i) => (
                <th key={i} className="text-left pb-4">
                  <Skeleton width="80%" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t border-gray-100 dark:border-gray-700">
                {Array.from({ length: 4 }).map((_, colIndex) => (
                  <td key={colIndex} className="py-3">
                    <Skeleton width="90%" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}