import { type NextRequest, NextResponse } from "next/server"
import { colorAgent } from "../../agents/color-agent"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje requerido y debe ser texto" }, { status: 400 })
    }

    console.log("Procesando mensaje:", message)

    const response = await colorAgent.generate(message)

    console.log("Respuesta del agente:", response.text)

    return NextResponse.json({
      response: response.text,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error en el agente:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
