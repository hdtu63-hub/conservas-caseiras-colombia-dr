import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/app/lib/analytics";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { email, edition, discount, receiptUrl, moveReceipt } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const is8k = edition?.includes("8k") || discount === "8k" || discount === "8000";
    const is75 = !is8k && (edition?.includes("75off") || discount === "75");
    const monto = is8k ? "8000" : (is75 ? "14000" : (edition === "esencial" ? "20000" : "28000"));
    const roleta = is8k ? "Giro 2 (8 mil pesos)" : (is75 ? "Giro 1 (75% OFF)" : "Não girou");

    // Rastrear envio com e-mail confirmado
    await trackEvent("payment_approved_email", {
      email,
      edition: edition || "completa",
      discount: is8k ? "8k" : (is75 ? "75" : "none"),
      monto,
      roleta,
      emailStatus: "digitou_e_enviado",
    });

    // ==== ENVIO DE E-MAIL (Brevo) PARA O CLIENTE ====
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || "contato@conservas.com";
    if (brevoApiKey) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "Conservas Caseras", email: senderEmail },
          to: [{ email: email }],
          subject: "Tu acceso al material: Conservas Caseras",
          htmlContent: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #145d3d;">¡Hola! Gracias por tu compra. 🎉</h2>
              <p>Tu pago por la <strong>${edition}</strong> ha sido verificado exitosamente.</p>
              <p>Puedes acceder a todo tu material de por vida haciendo clic en el botón de abajo:</p>
              <br/>
              <a href="https://conservas-caseras.lovable.app/" style="display: inline-block; padding: 14px 28px; background-color: #145d3d; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">Acceder a mi producto</a>
              <br/><br/>
              <p style="color: #d32f2f; font-weight: bold; margin-top: 16px; padding: 12px; border: 1px solid #d32f2f; border-radius: 8px; background-color: #fff5f5; font-size: 14px;">
                ⚠️ GUARDA ESTA PÁGINA EN TUS FAVORITOS PARA NO PERDER TU ACCESO AL MATERIAL
              </p>
              <p>Atentamente,<br/>Equipo Conservas Caseras</p>
            </div>
          `
        })
      });
      if (!res.ok) {
        console.error("Brevo API Error (Send Access):", res.status, await res.text());
      } else {
        console.log("E-mail de acesso enviado ao cliente com sucesso!");
      }
    }
    // ================================================

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending access email:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

