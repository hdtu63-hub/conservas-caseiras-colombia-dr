"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CheckoutProps {
  edition: "esencial" | "completa";
  title: string;
  price: string;
  features: string[];
}

export default function CheckoutClient({ edition, title, price, features }: CheckoutProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "verifying" | "approved" | "rejected" | "email_input" | "sending_email" | "email_input_rejected" | "sending_email_rejected">("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (status === "email_input") {
      timeoutId = setTimeout(() => {
        router.push("/checkout/confirmado");
      }, 60000);
    }
    return () => clearTimeout(timeoutId);
  }, [status, router]);

  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: `checkout_view_${edition}` }),
    }).catch(() => {});
  }, [edition]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      /* clipboard API not available */
    }
  }, []);

  function selectFile(f: File) {
    setFile(f);
    setStatus("idle");
    setMessage("");
    if (f.type === "application/pdf") {
      setPreview("pdf");
    } else {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith("image/") || f.type === "application/pdf")) selectFile(f);
  }

  async function handleSubmit() {
    if (!file) return;

    setStatus("uploading");

    const formData = new FormData();
    formData.append("receipt", file);
    formData.append("edition", edition);

    await new Promise((r) => setTimeout(r, 600));
    setStatus("verifying");

    try {
      const res = await fetch("/api/verify-payment", { method: "POST", body: formData });
      const data = await res.json();

      if (data.approved) {
        setStatus("approved");
        setMessage(data.message);

        // Dispara evento de Purchase para o Meta Pixel
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("track", "Purchase", {
            content_name: title,
            currency: "COP",
            value: edition === "esencial" ? 20000 : 28000,
          });
        }

        setStatus("email_input");
      } else {
        setReceiptUrl(data.receiptUrl);
        setStatus("email_input_rejected");
        setMessage(data.message);
      }
    } catch {
      setStatus("rejected");
      setMessage("Aguarde, estamos verificando tu pago. Te contactaremos pronto.");
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    
    setStatus("sending_email");
    try {
      await fetch("/api/send-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, edition }),
      });
    } catch {
      // Ignora erro e continua
    }
    router.push("/checkout/confirmado");
  }

  async function handleRejectedEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !file) return;
    
    setStatus("sending_email_rejected");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("edition", edition);
    formData.append("receipt", file);

    try {
      // Envia email pro admin com o comprovante em anexo
      await fetch("/api/send-review-email", {
        method: "POST",
        body: formData,
      });

      // Registra evento no analytics (sem link da imagem)
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "payment_manual_review", 
          metadata: { email, edition } 
        }),
      });
    } catch {
      // Ignora erro
    }
    setStatus("rejected");
    setMessage("Gracias. Revisaremos tu comprobante y te contactaremos al correo ingresado.");
  }

  return (
    <main className="checkout-page paper">
      <div className="checkout-container">
        <a href="/" className="checkout-back">← Volver al inicio</a>

        <div className="checkout-header">
          <span className="eyebrow">Finalizar compra</span>
          <h1>{title}</h1>
          <div className="checkout-price-display">
            <strong>{price}</strong>
            <small>COP · pago único</small>
          </div>
        </div>

        <div className="checkout-grid">
          <div className="checkout-left">
            <div className="checkout-card">
              <h2>📌 Datos para pagar</h2>
              <p className="checkout-titular"><span>👤 Titular:</span> <strong>Juan Arroyave</strong></p>

              <div className="payment-method">
                <div className="payment-label">Nequi</div>
                <div className="payment-value">
                  <code>3022913251</code>
                  <button onClick={() => copyToClipboard("3022913251", "nequi")} className={`copy-btn ${copied === "nequi" ? "copied" : ""}`}>
                    {copied === "nequi" ? "✓ Copiado" : "📋 Copiar"}
                  </button>
                </div>
              </div>

              <div className="payment-method">
                <div className="payment-label">Llave Bre-B</div>
                <div className="payment-value">
                  <code>@NEQUIJUA555917</code>
                  <button onClick={() => copyToClipboard("@NEQUIJUA555917", "breb")} className={`copy-btn ${copied === "breb" ? "copied" : ""}`}>
                    {copied === "breb" ? "✓ Copiado" : "📋 Copiar"}
                  </button>
                </div>
              </div>

              <div className="payment-steps">
                <p><strong>Pasos:</strong></p>
                <ol>
                  <li>Abre tu app de <strong>Nequi</strong> o tu banco</li>
                  <li>Transfiere <strong>{price} COP</strong> al número o llave indicada</li>
                  <li>Toma un pantallazo del comprobante (o guarda en PDF)</li>
                  <li>Súbelo aquí abajo para verificar tu pago</li>
                </ol>
              </div>

              <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--line)" }}>
                <h3>Envía tu comprobante de pago</h3>

                <div
                  className={`upload-zone ${file ? "has-file" : ""} ${dragActive ? "dragover" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  {preview ? (
                    <div className="upload-preview-wrap">
                      {preview === "pdf" ? (
                        <div style={{ padding: "40px", background: "rgba(20,93,61,.05)", borderRadius: "8px", border: "1px solid var(--forest)", color: "var(--forest)", fontWeight: "bold" }}>
                          📄 Archivo PDF seleccionado
                        </div>
                      ) : (
                        <img src={preview} alt="Vista previa del comprobante" className="upload-preview" />
                      )}
                      <button className="change-file" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setStatus("idle"); setMessage(""); }}>
                        Cambiar archivo
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">📎</span>
                      <p>Arrastra tu comprobante aquí<br/>o <strong>haz clic para seleccionar</strong></p>
                      <small>Formatos: JPG, PNG, WEBP, PDF</small>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
                    hidden
                  />
                </div>

                {file && status === "idle" && (
                  <button onClick={handleSubmit} className="verify-btn button">
                    Verificar pago <b aria-hidden="true">→</b>
                  </button>
                )}

                {(status === "uploading" || status === "verifying") && (
                  <div className="checkout-status verifying">
                    <div className="spinner" />
                    <p>{status === "uploading" ? "Subiendo comprobante..." : "Verificando tu pago..."}</p>
                  </div>
                )}

                {(status === "email_input" || status === "sending_email") && (
                  <div className="checkout-status approved" style={{ padding: "24px 20px" }}>
                    <span className="status-check" style={{ marginBottom: "12px", display: "inline-block" }}>✓</span>
                    <p style={{ margin: "0 0 8px", fontSize: "18px" }}>¡Pago Aprobado!</p>
                    <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6f655e", lineHeight: "1.4" }}>
                      Por favor, ingresa tu correo electrónico para enviarte el acceso al material.
                    </p>
                    <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                      <input
                        type="email"
                        required
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: "12px", border: "1px solid var(--line)", background: "var(--paper)", width: "100%", fontSize: "14px" }}
                        disabled={status === "sending_email"}
                      />
                      <button 
                        type="submit" 
                        className="button" 
                        style={{ padding: "12px", fontSize: "14px" }}
                        disabled={status === "sending_email"}
                      >
                        {status === "sending_email" ? "Enviando..." : "Confirmar y Acceder →"}
                      </button>
                    </form>
                  </div>
                )}

                {(status === "email_input_rejected" || status === "sending_email_rejected") && (
                  <div className="checkout-status rejected" style={{ padding: "24px 20px" }}>
                    <span className="status-clock" style={{ marginBottom: "12px", display: "inline-block" }}>⏳</span>
                    <p style={{ margin: "0 0 8px", fontSize: "16px" }}>Verificación manual requerida</p>
                    <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6f655e", lineHeight: "1.4" }}>
                      No pudimos confirmar tu comprobante automáticamente. Por favor, ingresa tu correo para revisarlo y enviarte el acceso.
                    </p>
                    <form onSubmit={handleRejectedEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                      <input
                        type="email"
                        required
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: "12px", border: "1px solid var(--line)", background: "var(--paper)", width: "100%", fontSize: "14px" }}
                        disabled={status === "sending_email_rejected"}
                      />
                      <button 
                        type="submit" 
                        className="button" 
                        style={{ padding: "12px", fontSize: "14px" }}
                        disabled={status === "sending_email_rejected"}
                      >
                        {status === "sending_email_rejected" ? "Enviando..." : "Enviar para revisión →"}
                      </button>
                    </form>
                  </div>
                )}

                {status === "rejected" && (
                  <div className="checkout-status rejected">
                    <span className="status-clock">⏳</span>
                    <p>{message}</p>
                    <button onClick={() => { setFile(null); setPreview(null); setStatus("idle"); setMessage(""); }} className="retry-btn">
                      Intentar con otro archivo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="checkout-right">
            <div className="checkout-includes" style={{ marginTop: 0 }}>
              <h3>Tu compra incluye:</h3>
              <ul>
                {features.map((f) => <li key={f}>✦ {f}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div className="checkout-trust">
          <span>♢ Pago seguro</span>
          <span>↻ Garantía de 30 días</span>
          <span>∞ Acceso de por vida</span>
        </div>
      </div>
    </main>
  );
}
