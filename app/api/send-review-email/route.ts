import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = formData.get("email") as string;
    const edition = formData.get("edition") as string;
    const file = formData.get("receipt") as File | null;

    if (!email || !file) {
      return NextResponse.json({ success: false, error: "Email and receipt are required" }, { status: 400 });
    }

    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const filename = `comprovante_${email.replace(/[^a-z0-9]/gi, '_')}.${mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`;

    // ==== ENVIO DE E-MAIL COM ANEXO (Brevo) ====
    const brevoApiKey = process.env.BREVO_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const senderEmail = process.env.SENDER_EMAIL || "admin@seusite.com"; // Configure no .env.local

    if (brevoApiKey && adminEmail) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "Sistema de Vendas", email: senderEmail },
          to: [{ email: adminEmail }],
          subject: "🚨 Comprovante para Revisão Manual",
          htmlContent: `
            <h3>Revisão Manual Necessária</h3>
            <p>A IA não reconheceu o comprovante automaticamente ou houve uma falha.</p>
            <p><strong>E-mail do Cliente:</strong> ${email}</p>
            <p><strong>Edição Comprada:</strong> ${edition}</p>
            <p>O comprovante enviado pelo cliente está em anexo neste e-mail.</p>
            <p>Se o pagamento for válido, basta responder o cliente enviando o link do produto.</p>
          `,
          attachment: [
            {
              content: base64,
              name: filename
            }
          ]
        })
      });

      if (!res.ok) {
        console.error("Brevo API Error:", res.status, await res.text());
      } else {
        console.log("E-mail enviado via Brevo com sucesso!");
      }
    } else {
      console.log("Chaves do Brevo não configuradas no .env.local");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending review email:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
