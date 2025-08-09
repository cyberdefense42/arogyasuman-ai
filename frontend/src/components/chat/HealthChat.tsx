"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, Loader2, Bot, User, Heart, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface HealthChatProps {
  reportId?: string
  className?: string
}

export default function HealthChat({ reportId, className = '' }: HealthChatProps) {
  const { user, getAuthToken } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize messages based on auth state
  useEffect(() => {
    if (user) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hi ${user.displayName || 'there'}! I'm your AI health assistant. I can help you understand your blood test results, answer health questions, and provide personalized recommendations. How can I help you today?`,
        timestamp: new Date().toISOString()
      }])
    }
  }, [user])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
          sessionId,
          context: reportId ? { reportId } : undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Card className={`flex flex-col h-96 ${className}`}>
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4 inline-block">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Login Required</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please log in to access the AI Health Chat feature
            </p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`flex flex-col h-96 ${className}`}>
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <Heart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Health Assistant</h3>
            <p className="text-sm text-gray-600">Ask me about your health reports</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-xs lg:max-w-md ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500 ml-2'
                    : 'bg-green-500 mr-2'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div
                className={`px-4 py-2 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex flex-row">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500 mr-2 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your health report..."
            className="flex-1 min-h-[44px] max-h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="px-3 py-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  )
}