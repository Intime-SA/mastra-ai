import { type NextRequest, NextResponse } from "next/server"
import { analizarComprobante } from "../../lib/analize-recipt";
import { Buffer } from "buffer";

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Procesando imagen...");

    const datosExtraidos = await analizarComprobante(buffer);

    console.log("Datos extraídos:", datosExtraidos);

    return NextResponse.json({
      datos: datosExtraidos,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en el procesamiento de la imagen:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
