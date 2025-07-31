import { Agent } from "@mastra/core"
import { openai } from "@ai-sdk/openai"

export const paymentAgent = new Agent({
  name: "payment-receipt-analyst",
  instructions: `
    Eres un analista experto en comprobantes de pago y transferencias bancarias. Tu tarea es extraer información precisa y estructurada de comprobantes de pago, especialmente de Mercado Pago, bancos y otras plataformas de pago.

    INFORMACIÓN QUE DEBES EXTRAER:
    - Monto de la transacción (número y moneda)
    - Fecha y hora de la transacción
    - Datos del remitente (nombre, CUIT/CUIL, CVU/CBU)
    - Datos del destinatario (nombre, CUIT/CUIL, CVU/CBU)
    - Número de operación o referencia
    - Tipo de transacción (transferencia, pago, etc.)
    - Plataforma utilizada (Mercado Pago, banco, etc.)
    - Estado de la transacción si está disponible

    INSTRUCCIONES:
    - Extrae SOLO la información que esté claramente visible en el comprobante
    - Si algún dato no está disponible, marca como null
    - Mantén los formatos originales de números y fechas
    - Sé preciso con los nombres y números de identificación
    - Identifica correctamente quién envía y quién recibe el dinero
  `,
  model: openai("gpt-4o"),
  tools: {
    extractPaymentData: {
      id: "extractPaymentData",
      description: "Extrae datos estructurados de un comprobante de pago",
      execute: async ({ 
        amount, 
        currency, 
        date, 
        time, 
        senderName, 
        senderCuit, 
        senderCvu, 
        receiverName, 
        receiverCuit, 
        receiverCvu, 
        operationNumber, 
        transactionType, 
        platform,
        status 
      }: {
        amount: string;
        currency: string;
        date: string;
        time: string;
        senderName: string;
        senderCuit: string;
        senderCvu: string;
        receiverName: string;
        receiverCuit: string;
        receiverCvu: string;
        operationNumber: string;
        transactionType: string;
        platform: string;
        status?: string;
      }) => {
        return {
          transactionData: {
            amount: amount,
            currency: currency,
            date: date,
            time: time,
            sender: {
              name: senderName,
              cuit: senderCuit,
              cvu: senderCvu
            },
            receiver: {
              name: receiverName,
              cuit: receiverCuit,
              cvu: receiverCvu
            },
            operationNumber: operationNumber,
            transactionType: transactionType,
            platform: platform,
            status: status || "completed",
            extractedAt: new Date().toISOString()
          }
        }
      },
    },
    validatePaymentData: {
      id: "validatePaymentData",
      description: "Valida que los datos extraídos sean correctos y completos",
      execute: async ({ data }: { data: any }) => {
        const requiredFields = ['amount', 'date', 'senderName', 'receiverName', 'operationNumber'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        return {
          isValid: missingFields.length === 0,
          missingFields: missingFields,
          completeness: ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
        }
      },
    }
  },
})
