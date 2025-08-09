"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Image, AlertCircle, CheckCircle2, Loader2, Heart, Lock, CheckCircle, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { reportStorage, parseAnalysisToReport } from "@/lib/reportStorage"
import { useAuth } from "@/contexts/AuthContext"

interface AnalysisResult {
  success: boolean
  extractedText: string
  analysis?: string | {
    healthScore?: number
    overallAssessment?: string
    concernsCount?: number
    processingTime?: number
    [key: string]: any
  }
  error?: string
}

export default function TryAppPage() {
  const router = useRouter()
  const { user, loading, token } = useAuth()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map())

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/try-app')
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we check your authentication.</p>
        </Card>
      </div>
    )
  }

  // Show login required message if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="bg-blue-100 p-4 rounded-full mx-auto mb-6 w-fit">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to try HealthScan AI. Please sign in to access this feature.
          </p>
          <Button 
            onClick={() => router.push('/login?redirect=/try-app')}
            size="lg"
            className="w-full"
          >
            Sign In to Continue
          </Button>
        </Card>
      </div>
    )
  }

  const handleDrag = useCallback((e: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: any) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFiles = Array.from(e.dataTransfer.files)
      setFiles(selectedFiles)
      selectedFiles.forEach(file => createFilePreview(file))
    }
  }, [])

  const createFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreviews(prev => new Map(prev).set(file.name, e.target?.result as string))
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'application/pdf') {
      // For PDFs, we'll show a placeholder since we can't easily preview them
      setFilePreviews(prev => new Map(prev).set(file.name, 'pdf'))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(selectedFiles)
      selectedFiles.forEach(file => createFilePreview(file))
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setAnalyzing(false)
    setResult(null)

    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append('files', file)
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if authentication failed
          router.push('/login?redirect=/try-app&error=session-expired')
          return
        }
        throw new Error(`Upload failed: ${response.status}`)
      }

      const data = await response.json()
      setUploading(false)

      if (data.success) {
        setAnalyzing(true)
        setTimeout(() => {
          setAnalyzing(false)
          setResult(data)
          
          // Save successful analysis to dashboard
          if (data.success && files.length > 0) {
            try {
              const reportData = parseAnalysisToReport(
                files.map(f => f.name).join(', '),
                data.extractedText || '',
                data.analysis
              )
              reportStorage.saveReport(reportData)
              console.log('Reports saved to dashboard successfully')
            } catch (error) {
              console.error('Failed to save reports:', error)
            }
          }
        }, 3000)
      } else {
        setResult(data)
      }
    } catch (error) {
      setUploading(false)
      setResult({
        success: false,
        extractedText: '',
        error: error instanceof Error ? error.message : 'Failed to upload files. Please try again or check your connection.'
      })
    }
  }

  const resetUpload = () => {
    setFiles([])
    setResult(null)
    setUploading(false)
    setAnalyzing(false)
    setFilePreviews(new Map())
  }

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName))
    setFilePreviews(prev => {
      const newPreviews = new Map(prev)
      newPreviews.delete(fileName)
      return newPreviews
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-20 h-20 bg-sacred-200 rounded-full opacity-20 animate-bounce" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-primary-200 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-healing-200 rounded-full opacity-25 animate-bounce" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 left-1/2 w-12 h-12 bg-info-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-40 right-1/3 w-16 h-16 bg-sacred-200 rounded-full opacity-15 animate-bounce" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Header */}
      <section className="relative bg-gradient-to-r from-primary-500 via-primary-600 to-healing-500 py-20 overflow-hidden z-10">
        {/* Animated Header Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white/20 rounded-full animate-ping"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 border-2 border-white/30 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-white/10 rounded-full animate-bounce"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl mr-6 shadow-lg transform hover:scale-110 transition-all duration-300 border border-white/30">
                <Heart className="h-10 w-10 text-white animate-pulse" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-sacred-300 rounded-full animate-ping"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-healing-300 rounded-full animate-bounce"></div>
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 animate-fade-in">
                Try ArogyaSuman AI
              </h1>
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-sacred-300 rounded-full animate-pulse mr-2"></div>
                <span className="text-primary-100 text-sm font-medium">Powered by Advanced AI</span>
                <div className="w-2 h-2 bg-sacred-300 rounded-full animate-pulse ml-2"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <p className="text-xl md:text-2xl text-white font-semibold mb-2">
              Welcome back, <span className="text-sacred-200">{user.displayName || user.email?.split('@')[0]}</span>! 👋
            </p>
            <p className="text-primary-100 max-w-3xl mx-auto leading-relaxed">
              Upload your blood report and get instant AI-powered health analysis with 
              <br className="hidden md:block" />
              <span className="text-white font-semibold">personalized Indian recommendations</span> ✨
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-primary-100">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-healing-300" />
                <span className="text-sm">Results in 10 seconds</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-healing-300" />
                <span className="text-sm">100% Privacy Protected</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-healing-300" />
                <span className="text-sm">Indian Health Insights</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {!result && (
            <Card className="p-8 mb-8 bg-gradient-to-br from-white to-primary-50 shadow-xl border-0 relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-200 to-healing-200 rounded-full opacity-20 -translate-y-10 translate-x-10"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-healing-200 to-sacred-200 rounded-full opacity-20 translate-y-8 -translate-x-8"></div>
              
              <div className="text-center mb-8 relative">
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-gradient-to-r from-primary-500 to-healing-500 p-3 rounded-2xl shadow-lg">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-healing-600 bg-clip-text text-transparent mb-4">
                  Upload Your Blood Report 📋
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Supported formats: <span className="text-primary-600 font-semibold">PDF, JPG, PNG</span>, and other image formats.
                  <br />
                  <span className="text-healing-600 font-medium">Maximum file size: 10MB</span> ✨
                </p>
              </div>

              {/* File Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 transform ${
                  dragActive 
                    ? 'border-primary-400 bg-gradient-to-br from-primary-50 to-primary-100 scale-105 shadow-lg' 
                    : files.length > 0 
                    ? 'border-healing-400 bg-gradient-to-br from-healing-50 to-healing-100 shadow-md' 
                    : 'border-gray-300 hover:border-primary-300 hover:bg-primary-25 hover:shadow-md hover:scale-102'
                } ${dragActive ? 'animate-pulse' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {/* Upload Animation Rings */}
                {dragActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 border-4 border-primary-400 rounded-full animate-ping opacity-30"></div>
                    <div className="absolute w-24 h-24 border-4 border-healing-400 rounded-full animate-pulse"></div>
                  </div>
                )}
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                  multiple
                />
                
                <div className="space-y-4">
                  {files.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                          <div className="flex items-center">
                            <div className="bg-healing-100 p-2 rounded-lg mr-3">
                              {file.type.startsWith('image/') ? (
                                <Image className="h-6 w-6 text-healing-600" />
                              ) : (
                                <FileText className="h-6 w-6 text-healing-600" />
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(file.name)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <Upload className="h-12 w-12 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          Drag and drop your files here
                        </p>
                        <p className="text-gray-500">or click to browse</p>
                        <p className="text-sm text-gray-400 mt-2">You can select multiple files</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <div className="mt-6 flex justify-center space-x-4">
                {files.length > 0 && (
                  <Button
                    onClick={resetUpload}
                    variant="outline"
                    disabled={uploading}
                  >
                    Clear All Files
                  </Button>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || uploading}
                  size="lg"
                  className="px-8"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Analyze {files.length > 1 ? `${files.length} Reports` : 'Report'}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Processing State */}
          {(uploading || analyzing) && (
            <Card className="p-12 text-center bg-gradient-to-br from-white to-primary-50 border-0 shadow-2xl relative overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-100/50 via-healing-100/50 to-sacred-100/50 animate-pulse"></div>
              
              <div className="space-y-6 relative">
                {/* Multi-layered Loading Animation */}
                <div className="flex justify-center relative">
                  <div className="relative">
                    {/* Outer Ring */}
                    <div className="w-24 h-24 border-4 border-primary-200 rounded-full animate-spin"></div>
                    {/* Inner Ring */}
                    <div className="absolute inset-2 w-16 h-16 border-4 border-healing-400 rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                    {/* Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-gradient-to-r from-primary-500 to-healing-500 p-3 rounded-full shadow-lg">
                        {uploading ? (
                          <Upload className="h-6 w-6 text-white animate-pulse" />
                        ) : (
                          <Heart className="h-6 w-6 text-white animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating Particles */}
                  <div className="absolute -top-4 -left-4 w-3 h-3 bg-primary-400 rounded-full animate-bounce opacity-60"></div>
                  <div className="absolute -top-2 -right-6 w-2 h-2 bg-healing-400 rounded-full animate-bounce opacity-60" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute -bottom-4 -left-6 w-4 h-4 bg-sacred-400 rounded-full animate-bounce opacity-40" style={{animationDelay: '1s'}}></div>
                  <div className="absolute -bottom-2 -right-4 w-3 h-3 bg-primary-400 rounded-full animate-bounce opacity-50" style={{animationDelay: '1.5s'}}></div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-healing-600 bg-clip-text text-transparent mb-4">
                    {uploading ? '📤 Uploading your report...' : '🧠 AI is analyzing your report...'}
                  </h3>
                  
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                    <p className="text-gray-700 text-lg leading-relaxed mb-4">
                      {uploading 
                        ? 'Securely processing your file with advanced encryption...' 
                        : 'Our AI is extracting insights and generating personalized Indian health recommendations...'}
                    </p>
                    
                    {/* Progress Indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
                      <div className={`flex items-center ${uploading ? 'text-primary-600' : 'text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${uploading ? 'bg-primary-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <span>Processing File</span>
                      </div>
                      <div className={`flex items-center ${analyzing ? 'text-healing-600' : 'text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${analyzing ? 'bg-healing-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <span>AI Analysis</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                        <span>Generating Report</span>
                      </div>
                    </div>
                  </div>

                  {/* Fun Loading Messages */}
                  <div className="mt-4 text-primary-600 font-medium">
                    {uploading ? (
                      <div className="flex items-center justify-center">
                        <Zap className="h-5 w-5 mr-2 animate-pulse" />
                        <span>Processing at lightning speed ⚡</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                        <span>AI is working its magic ✨</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {result.success ? (
                <>
                  <Card className="p-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle2 className="h-6 w-6 text-healing-600 mr-2" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        Analysis Complete
                      </h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Your blood report has been successfully analyzed. Here are your personalized health insights:
                    </p>
                  </Card>

                  {/* Scanned Reports Preview */}
                  {filePreviews.size > 0 && (
                    <Card className="p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Image className="h-5 w-5 text-healing-600 mr-2" />
                        Scanned Reports ({files.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((file, index) => {
                          const preview = filePreviews.get(file.name)
                          return (
                            <div key={index} className="bg-gray-50 rounded-lg p-4">
                              {preview === 'pdf' ? (
                                <div className="text-center py-8">
                                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-600 font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">PDF</p>
                                </div>
                              ) : preview ? (
                                <div>
                                  <img 
                                    src={preview} 
                                    alt={`Preview of ${file.name}`}
                                    className="w-full h-40 object-cover rounded-lg border shadow-sm mb-2"
                                  />
                                  <p className="text-xs text-gray-500 truncate">{file.name}</p>
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-600 font-medium truncate">{file.name}</p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Extracted Text */}
                  <Card className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Extracted Report Data
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {result.extractedText || 'No text extracted from the report.'}
                      </pre>
                    </div>
                  </Card>

                  {/* AI Analysis */}
                  {result.analysis && (
                    <Card className="p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Heart className="h-5 w-5 text-red-500 mr-2" />
                        AI Health Analysis
                      </h4>
                      <div className="prose max-w-none">
                        <div className="bg-blue-50 rounded-lg p-4">
                          {typeof result.analysis === 'string' ? (
                            <pre className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {result.analysis}
                            </pre>
                          ) : (
                            <div className="space-y-4">
                              {typeof result.analysis === 'object' && result.analysis.healthScore && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <h5 className="font-semibold text-gray-900 mb-2">Health Score</h5>
                                  <div className="flex items-center">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                      <div 
                                        className="bg-blue-600 h-2.5 rounded-full" 
                                        style={{ width: `${result.analysis.healthScore}%` }}
                                      ></div>
                                    </div>
                                    <span className="ml-2 text-sm font-medium text-gray-900">
                                      {result.analysis.healthScore}%
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {typeof result.analysis === 'object' && result.analysis.overallAssessment && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <h5 className="font-semibold text-gray-900 mb-2">Overall Assessment</h5>
                                  <p className="text-gray-700">{result.analysis.overallAssessment}</p>
                                </div>
                              )}
                              
                              {typeof result.analysis === 'object' && result.analysis.concernsCount !== undefined && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <h5 className="font-semibold text-gray-900 mb-2">Health Concerns</h5>
                                  <p className="text-gray-700">
                                    {result.analysis.concernsCount === 0 
                                      ? "No major concerns identified" 
                                      : `${result.analysis.concernsCount} area(s) need attention`
                                    }
                                  </p>
                                </div>
                              )}
                              
                              {typeof result.analysis === 'object' && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <h5 className="font-semibold text-gray-900 mb-2">Full Analysis</h5>
                                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {JSON.stringify(result.analysis, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-4">
                    <Button onClick={resetUpload} variant="outline" size="lg">
                      Analyze Another Report
                    </Button>
                    <Button asChild size="lg">
                      <a href="/dashboard">View Dashboard</a>
                    </Button>
                  </div>
                </>
              ) : (
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Analysis Failed
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {result.error || 'Something went wrong while analyzing your report.'}
                  </p>
                  <Button onClick={resetUpload} variant="outline">
                    Try Again
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}