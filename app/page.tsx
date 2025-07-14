"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Button from "./components/ui/button"
import Input from "./components/ui/input"
import {Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Badge from "./components/ui/badge"
import { Loader2, Send, Database, Palette, TrendingUp } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function ColorAgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! 👋 Soy tu asistente de análisis de colores. Tengo acceso a datos de 6 colores con información sobre ventas. ¿Qué te gustaría saber?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error en la respuesta del servidor")
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: `❌ Error: ${error instanceof Error ? error.message : "Error desconocido"}. Por favor, verifica tu configuración de API key.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const exampleQuestions = [
    {
      question: "¿Cuál es el color con más ventas?",
      icon: <TrendingUp className="w-4 h-4" />,
      category: "Análisis",
    },
    {
      question: "Dime el name de los colores con más sales",
      icon: <Palette className="w-4 h-4" />,
      category: "Consulta",
    },
    {
      question: "¿Cuántas ventas tiene el color negro?",
      icon: <Database className="w-4 h-4" />,
      category: "Específico",
    },
    {
      question: "Ordena todos los colores por ventas de mayor a menor",
      icon: <TrendingUp className="w-4 h-4" />,
      category: "Ordenamiento",
    },
    {
      question: "¿Qué colores tienen más de 10 ventas?",
      icon: <Database className="w-4 h-4" />,
      category: "Filtro",
    },
    {
      question: "Dame estadísticas generales de ventas",
      icon: <TrendingUp className="w-4 h-4" />,
      category: "Estadísticas",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Agente de Análisis de Colores
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Haz preguntas inteligentes sobre datos de colores y sus ventas usando IA
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="secondary">6 Colores</Badge>
            <Badge variant="secondary">Análisis en Tiempo Real</Badge>
            <Badge variant="secondary">Powered by GPT-4</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Panel de ejemplos */}
          <Card className="xl:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-purple-500" />
                Preguntas de Ejemplo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exampleQuestions.map((item, index) => (
                <div key={index} className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-left justify-start h-auto p-3 whitespace-normal hover:bg-purple-50 border border-gray-200"
                    onClick={() => setInput(item.question)}
                    disabled={isLoading}
                  >
                    <div className="flex items-start gap-2">
                      {item.icon}
                      <span className="text-sm">{item.question}</span>
                    </div>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chat principal */}
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-500" />
                Chat con el Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Área de mensajes */}
              <div className="h-[500px] overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg border">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-lg shadow-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      <p className={`text-xs mt-2 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-900 border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      <span className="text-sm">Analizando datos de colores...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulario de entrada */}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: ¿Cuál es el color con más ventas?"
                  disabled={isLoading}
                  className="flex-1 h-12"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="h-12 px-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
