'use client'

import { Toaster, toast } from 'sonner'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

// Toast provider component
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      expand={false}
      closeButton
      toastOptions={{
        duration: 4000,
        className: 'backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50',
        style: {
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(229, 231, 235, 0.5)',
        },
      }}
    />
  )
}

// Custom toast functions with Indian color scheme
export const showToast = {
  success: (message: string, description?: string) => {
    toast.custom((t) => (
      <div className="flex items-start space-x-3 p-4">
        <div className="p-2 bg-healing-100 rounded-lg">
          <CheckCircle className="h-5 w-5 text-healing-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{message}</p>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))
  },
  
  error: (message: string, description?: string) => {
    toast.custom((t) => (
      <div className="flex items-start space-x-3 p-4">
        <div className="p-2 bg-alert-100 rounded-lg">
          <AlertCircle className="h-5 w-5 text-alert-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{message}</p>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))
  },
  
  info: (message: string, description?: string) => {
    toast.custom((t) => (
      <div className="flex items-start space-x-3 p-4">
        <div className="p-2 bg-info-100 rounded-lg">
          <Info className="h-5 w-5 text-info-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{message}</p>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      className: 'backdrop-blur-md',
    })
  }
}