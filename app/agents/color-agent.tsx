import { Agent } from "@mastra/core"
import { openai } from "@ai-sdk/openai"
import colorsData from "../data/kaury.colors.json"

export const colorAgent = new Agent({
  name: "color-analyst",
  instructions: `
    Eres un analista experto de datos de colores. Tienes acceso a una base de datos con información sobre colores y sus ventas.
    
    Estructura de datos disponible:
    - _id: identificador único del color
    - spanish: nombre del color en español
    - name: nombre del color en inglés  
    - hex: código hexadecimal del color
    - sales: número de ventas del color
    
    DATOS ACTUALES: ${JSON.stringify(colorsData, null, 2)}
    
    INSTRUCCIONES:
    - Responde SOLO basándote en los datos proporcionados
    - Sé preciso y claro en tus respuestas
    - Si te preguntan por "name" refiere al campo "name" (inglés)
    - Si te preguntan por "sales" refiere al campo "sales"
    - Puedes hacer análisis, comparaciones y ordenamientos
    - Siempre proporciona ejemplos específicos con los datos reales
  `,
  model: openai("gpt-4o-mini"),
  tools: {
    getAllColors: {
      description: "Obtiene todos los datos de colores disponibles",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        return {
          colors: colorsData,
          total: colorsData.length,
        }
      },
    },
    findColorsByName: {
      description: "Busca colores por nombre en español o inglés",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nombre del color a buscar (en español o inglés)",
          },
        },
        required: ["name"],
      },
      execute: async ({ name }: { name: string }) => {
        const results = colorsData.filter(
          (color) =>
            color.name.toLowerCase().includes(name.toLowerCase()) ||
            color.spanish.toLowerCase().includes(name.toLowerCase()),
        )
        return {
          results,
          found: results.length,
        }
      },
    },
    getColorsBySalesRange: {
      description: "Obtiene colores filtrados por rango de ventas",
      parameters: {
        type: "object",
        properties: {
          minSales: {
            type: "number",
            description: "Ventas mínimas",
          },
          maxSales: {
            type: "number",
            description: "Ventas máximas (opcional)",
          },
        },
        required: ["minSales"],
      },
      execute: async ({ minSales, maxSales }: { minSales: number; maxSales?: number }) => {
        let results = colorsData.filter((color) => color.sales >= minSales)
        if (maxSales) {
          results = results.filter((color) => color.sales <= maxSales)
        }
        return {
          results: results.sort((a, b) => b.sales - a.sales),
          count: results.length,
        }
      },
    },
    getTopColorsBySales: {
      description: "Obtiene los colores con más ventas, ordenados de mayor a menor",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Número máximo de colores a retornar",
            default: 5,
          },
        },
      },
      execute: async ({ limit = 5 }: { limit?: number }) => {
        const sorted = [...colorsData].sort((a, b) => b.sales - a.sales)
        return {
          topColors: sorted.slice(0, limit),
          totalColors: colorsData.length,
        }
      },
    },
    getSalesStatistics: {
      description: "Obtiene estadísticas generales de ventas",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const sales = colorsData.map((c) => c.sales)
        const total = sales.reduce((sum, s) => sum + s, 0)
        const average = total / sales.length
        const max = Math.max(...sales)
        const min = Math.min(...sales)

        return {
          totalSales: total,
          averageSales: Math.round(average * 100) / 100,
          maxSales: max,
          minSales: min,
          totalColors: colorsData.length,
        }
      },
    },
  },
})
