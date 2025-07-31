import { Mastra } from "@mastra/core"
import { openai } from "@ai-sdk/openai"

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY no está configurada en las variables de entorno")
}

export const mastra = new Mastra({
  name: "payment-analyst",
  llm: openai("gpt-4o"), // Usando el modelo más económico
})
