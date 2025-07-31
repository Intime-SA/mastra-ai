import { type NextRequest, NextResponse } from "next/server";
import { analizarComprobante } from "../../lib/analize-recipt";
import { downloadImage, procesarImagen } from "@/lib/utils";



export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json(
      { error: "Phone is required" },
      { status: 400 }
    );
  }

  const body = await request.json();
  let requestId = ''

  //crear registro en collection requests
  try {
    const postResponse = await fetch(`${process.env.NEXT_PUBLIC_API_WHATSAPP_ADMIN}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone,
        body: body,
      }),
    });

    const postData = await postResponse.json();
    console.log('postData', postData);
    if (!postData.success || !postData?.requestId) {
      console.error('Failed 1', postResponse.status, postResponse.statusText);
     }
    requestId = postData?.data?.requestId;
  } catch (error) {
    console.error('Error sending data to NEXT_PUBLIC_API_WHATSAPP_ADMIN:', error);
    return NextResponse.json(
      {
        error: 'Failed to send data to NEXT_PUBLIC_API_WHATSAPP_ADMIN',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }

  // Continuar con el procesamiento usando la variable body
  try {
    if (!body.image) {
      return NextResponse.json(
        { error: 'Image path is required' },
        { status: 400 }
      );
    }

    // Descargar la imagen
    const imageBuffer = await downloadImage(body.image);
    console.log('Downloaded image buffer size:', imageBuffer.length);

    // Subir la imagen a Cloudflare
    const { urls } = await procesarImagen(imageBuffer);
    console.log('Imagen subida a Cloudflare con éxito');

    // Analizar el comprobante
    const resultado = await analizarComprobante(imageBuffer);
    console.log('Análisis completado:', resultado);

    if (!resultado.success) {
      return NextResponse.json(
        {
          error: 'Failed to analyze receipt',
          details: resultado.error,
        },
        { status: 500 }
      );
    }

    // Preparar el payload para el PATCH
    const updatePayload = {
      status: resultado.success ? "validated" : "rejected",
      amount: Number(resultado?.data?.amount),
      expectedAmount: resultado?.data?.amount,
      operationNumber: resultado?.data?.operationNumber,
      coelsaId: resultado?.data?.coelsaId,
      bank: resultado?.data?.platform,
      paymentDate: null,
      receipt: {
        url: urls?.original,
        name: "receipt.pdf"
      },
      gptAnalysis: {
        status: resultado.success ? "processed" : "error",
        data: resultado.data,
      },
      notes: "Actualización de la solicitud con nuevos detalles.",
      history: [
        {
          date: new Date().toISOString(),
          action: "updated",
          sender: resultado?.data?.sender?.name,
          details: "Processed receipt"
        }
      ],
      updatedAt: new Date().toISOString()
    };

    console.log("updatePayload1", updatePayload);

    // Realizar la solicitud PATCH
    const patchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_WHATSAPP_ADMIN}/api/requests?id=${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    console.log('patchResponse', patchResponse);

    if (!patchResponse.ok) {
      console.error('Error al actualizar la solicitud:', patchResponse.status, patchResponse.statusText);
      throw new Error('Error al actualizar la solicitud');
    }

    console.log('Solicitud actualizada con éxito');

    // Retornar el resultado exitoso
    return NextResponse.json({
      message: 'Receipt analyzed and request updated successfully',
      data: resultado.data,
      extractedAt: resultado.extractedAt,
      amount: Number(resultado?.data?.amount),
      date: resultado?.data?.date,
      sender: resultado?.data?.sender?.name || "",
      sender_cuit: resultado?.data?.sender?.cuit || "",
      sender_cvu: resultado?.data?.sender?.cvu || "",
      operationNumber: resultado?.data?.coelsaId || resultado?.data?.operationNumber,
      requestId: requestId,
    });
  } catch (error) {
    console.error('Error processing request:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
