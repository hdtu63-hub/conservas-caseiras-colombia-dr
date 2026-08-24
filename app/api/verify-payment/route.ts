import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/app/lib/analytics";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;
    const edition = (formData.get("edition") as string) || "desconocida";

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    await trackEvent("upload_receipt", { edition });

    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();

    // Edge-compatible base64 encoding (no Buffer)
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      trackEvent("payment_rejected", { edition, reason: "No API key configured" });
      return NextResponse.json({
        approved: false,
        message: "Aguarde, estamos verificando tu pago. Te contactaremos pronto.",
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              'Eres un verificador de comprobantes de pago. Analiza la imagen o texto y determina si es un comprobante de pago, transferencia bancaria o recibo de transacción real. Un comprobante válido debe contener elementos como: fecha/hora, monto, número de transacción, referencia bancaria, nombre de destinatario o remitente, logotipo de banco o app de pagos, o cualquier otro elemento que indique una transacción financiera completada. Extrae el monto pagado como un número entero sin símbolos. Responde ÚNICAMENTE con un JSON válido: {"es_comprobante": true, "razon": "explicación breve", "monto": 28000} o {"es_comprobante": false, "razon": "explicación breve"}',
          },
          {
            role: "user",
            content: mimeType === "application/pdf" ? [
              {
                type: "text",
                text: `El usuario subió un PDF. No podemos verificar PDFs automáticamente. Por favor responde que NO es un comprobante válido para forzar revisión manual. Responde: {"es_comprobante": false, "razon": "PDF requiere revisión manual"}`,
              }
            ] : [
              {
                type: "text",
                text: "Analiza esta imagen. ¿Es un comprobante de pago real de una transferencia o transacción financiera?",
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, await response.text());
      trackEvent("payment_rejected", { edition, reason: `API error: ${response.status}` });
      return NextResponse.json({
        approved: false,
        message: "Aguarde, estamos verificando tu pago. Te contactaremos pronto.",
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);

        if (result.es_comprobante === true) {
          const montoStr = result.monto ? String(result.monto) : (edition === "esencial" ? "20000" : "28000");
          await trackEvent("payment_approved", { edition, monto: montoStr });
          
          return NextResponse.json({
            approved: true,
            message: "¡Pago verificado correctamente!",
          });
        } else {
          await trackEvent("payment_rejected", { edition, reason: result.razon || "No es comprobante" });
          return NextResponse.json({
            approved: false,
            message: "Aguarde, estamos verificando tu pago. Te contactaremos pronto.",
          });
        }
      } catch {
        /* JSON parse failed, fall through */
      }
    }

    await trackEvent("payment_rejected", { edition, reason: "Could not parse AI response" });
    return NextResponse.json({
      approved: false,
      message: "Aguarde, estamos verificando tu pago. Te contactaremos pronto.",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({
      approved: false,
      message: "Aguarde, estamos verificando tu pago. Te contactaremos pronto.",
    });
  }
}
