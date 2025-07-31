import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Schema para validar los datos extraídos
const PaymentReceiptSchema = z.object({
  amount: z.number().optional().describe("Monto de la transacción. SOLO NUMEROS"),
  currency: z.string().optional().describe("Moneda (ej: ARS, USD)"),
  date: z.string().optional().describe("Fecha y hora de la transacción"),
  sender: z.object({
    name: z.string().optional().nullable().describe("Nombre del remitente"),
    cuit: z.string().nullable().describe("CUIT/CUIL del remitente"),
    cvu: z.string().nullable().describe("CVU/CBU del remitente")
  }).optional().nullable(),
  receiver: z.object({
    name: z.string().optional().nullable().describe("Nombre del destinatario"),
    cuit: z.string().nullable().describe("CUIT/CUIL del destinatario"),
    cvu: z.string().nullable().describe("CVU/CBU del destinatario")
  }).optional(),
  operationNumber: z.string().optional().nullable().describe("Número de operación. combinacion numerica. ejemplo: 120013543417"),
  coelsaId: z.string().length(22).optional().nullable().describe("ID de la transacción en Coelsa. 22 caracteres. EJEMPLO: WGRXJE27GO0PJ05EN7MYQL"),
  transactionType: z.string().default("Transferencia").describe("Tipo de transacción"),
  platform: z.string().optional().nullable().describe("Plataforma utilizada"),
  status: z.string().default("completed").describe("Estado de la transacción")
})

export async function analizarComprobante(imageBuffer: Buffer) {
  try {
    // Convertir el buffer a base64
    const base64Image = imageBuffer.toString('base64')
    
    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: PaymentReceiptSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza este comprobante de pago y extrae toda la información relevante. 
              Presta especial atención a:
              - El monto exacto de la transacción
              - La fecha y hora tal cual aparece de la transacción
              - Los datos del remitente (quien envía el dinero)
              - Los datos del destinatario (quien recibe el dinero)
              - El número de operación
              - COELSA ID puede aparecer con otros nombres, alfanumerico de 22 caracteres Buscar matchear con el numero de 22 caracteres que no sea el cbu.
              - La plataforma utilizada (Mercado Pago, banco, etc.)
              
              Si algún dato no está visible o no existe, usa null para ese campo.`
            },
            {
              type: 'image',
              image: `data:image/png;base64,${base64Image}`
            }
          ]
        }
      ]
    })

    return {
      success: true,
      data: result.object,
      extractedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error al analizar comprobante:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      extractedAt: new Date().toISOString()
    }
  }
}
