import { type NextRequest, NextResponse } from "next/server";
import { convertirAHorarioArgentino } from "@/lib/utils";

async function validatePayment(id: string | null, channel: 'mercadopago' | 'coelsa'): Promise<any> {
  const now = new Date();
  let beginDate = new Date(now);
  let endDate = new Date(now);
  console.log("channel", channel);

  if (channel === 'mercadopago' && id) {
    const url = `https://api.mercadopago.com/v1/payments/${id}`;
    console.log("url", url);
    const response = await fetch(url, {
      headers: {
        Authorization:
          "Bearer APP_USR-3222083285598035-082821-9610ea1a5df52a46d5b1752e8352e214-797151356",
      },
    });
    return handleResponse(response);
  } else if (channel === 'coelsa' && id) {
    beginDate.setDate(now.getDate() - 1);
    endDate.setDate(now.getDate() + 1);
    const url = `https://api.mercadopago.com/v1/payments/search?range=date_created&begin_date=${beginDate.toISOString()}&end_date=${endDate.toISOString()}`;
    console.log("url", url);
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer APP_USR-3222083285598035-082821-9610ea1a5df52a46d5b1752e8352e214-797151356",
      },
    });
    const data = await handleResponse(response);
    console.log("data", data);
    const match = data.results.find((result: any) => result.transaction_details.transaction_id === id);
    if (!match) {
      throw new Error(`Transaction ID ${id} not found in Coelsa results.`);
    }
    return match;
  }
}

async function handleResponse(response: Response): Promise<any> {
  if (!response.ok) {
    throw new Error(
      `Failed to validate payment: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coelsaId = searchParams.get("coelsaId");
  const requestId = searchParams.get("requestId");
  const channel = searchParams.get("channel");
  let updatePayload = {};

  if (!coelsaId) {
    return NextResponse.json(
      { error: "Coelsa ID is required" },
      { status: 400 }
    );
  }

  try {

    // funcion para convertir la fecha de la transaccion a horario argentino


    // validacion mercado pago
    const paymentData = await validatePayment(coelsaId, channel as 'mercadopago' | 'coelsa');
    console.log("Payment data:", paymentData);
    const { status, payer } = paymentData;

    if (status === "approved") {

  /*     // verificar si el pago ya fue procesado:
      const paymentProcessed = await checkPaymentProcessed(coelsaId);
      if (paymentProcessed) {
        return NextResponse.json(
          { error: "Payment already processed" },
          { status: 400 }
        );
      } */

      // Preparar el payload para el PATCH
      updatePayload = {
        status: paymentData.status,
        requestId: requestId,
        channel: channel,
        coelsaId: coelsaId,
        paymentDate: paymentData.date_approved,
        amount: Number(paymentData.transaction_amount),
        notes: `Actualización de la solicitud con nuevos detalles. ${channel === 'mercadopago' ? 'Mercado Pago' : 'Coelsa'}`,
        mpValidation: {
          status: "validated",
          date: new Date().toISOString(),
          payer: payer?.email || "",
          details: "Payment validated",
        },
        history: [
          {
            date: new Date().toISOString(),
            action: "payment processed",
            email: payer?.email || "",
            paymentData: paymentData,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatePayload = {
        status: paymentData.status,
        channel: channel,
        notes: "Actualización de la solicitud con nuevos detalles.",
        history: [
          {
            date: new Date().toISOString(),
            action: "payment rejected",
            email: payer?.email || "",
            paymentData: paymentData,
          },
        ],

        updatedAt: new Date().toISOString(),
      };
    }

    console.log("updatePayload2", updatePayload);

    // Realizar la solicitud PATCH
    const patchResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_WHATSAPP_ADMIN}/api/requests?id=${requestId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      }
    );
    if (!patchResponse.ok) {
      console.error(
        "Error al actualizar la solicitud:",
        patchResponse.status,
        patchResponse.statusText
      );
      throw new Error("Error al actualizar la solicitud");
    }

    const updatedData = await patchResponse.json();
    console.log("Solicitud actualizada con éxito:", updatedData);

    return NextResponse.json({
      message: "Request updated successfully",
      date_created: convertirAHorarioArgentino(paymentData?.date_approved),
      payer_email: paymentData?.payer?.email,
      status: paymentData?.status === "approved" ? "Aprobado" : "Rechazado",
    });
  } catch (error: any) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: error.error, details: error.message },
      { status: 500 }
    );
  }
}
