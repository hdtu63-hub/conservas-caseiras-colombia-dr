"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CheckoutProps {
  edition: "esencial" | "completa";
  title: string;
  price: string;
  originalPrice?: string;
  savings?: string;
  image?: string;
  features: string[];
  bonuses?: string[];
}

export default function CheckoutClient({
  edition,
  title,
  price,
  originalPrice = edition === "esencial" ? "$89.000" : "$149.000",
  savings = edition === "esencial" ? "$69.000" : "$121.000",
  image = edition === "esencial" ? "/images/materials/03-recetas-seleccionadas.jpg" : "/images/materials/01-guia-completa.jpg",
  features,
  bonuses = [],
}: CheckoutProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"nequi" | "breb">("nequi");
  const [copied, setCopied] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<
    | "idle"
    | "uploading"
    | "verifying"
    | "approved"
    | "rejected"
    | "email_input"
    | "sending_email"
    | "email_input_rejected"
    | "sending_email_rejected"
  >("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [orderCode, setOrderCode] = useState("COL-2849");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate an order reference number based on day/session
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setOrderCode(`CC-COL-${randomSuffix}`);
  }, []);

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
      setTimeout(() => setCopied(null), 3000);
    } catch {
      /* fallback if clipboard API not available */
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

    await new Promise((r) => setTimeout(r, 700));
    setStatus("verifying");

    try {
      const res = await fetch("/api/verify-payment", { method: "POST", body: formData });
      const data = await res.json();

      if (data.approved) {
        setStatus("approved");
        setMessage(data.message);

        // Dispara evento de Purchase para o Meta Pixel
        if (typeof window !== "undefined" && (window as any).fbq) {
          let utms = {};
          try {
            utms = JSON.parse(window.localStorage.getItem("conservas_utm_params") || "{}");
          } catch (e) {}

          (window as any).fbq("track", "Purchase", {
            content_name: title,
            currency: "COP",
            value: edition === "esencial" ? 20000 : 28000,
            ...utms,
          });
        }

        setStatus("email_input");
      } else {
        // Mostra formulário de email para revisão manual imediata
        setReceiptUrl(data.receiptUrl || null);
        setStatus("email_input_rejected");
        setMessage(data.message || "Aguarde, estamos verificando tu pago. Te contactaremos pronto.");
      }
    } catch {
      // Mesmo com erro de rede, mostra formulário de envio para revisão
      setReceiptUrl(null);
      setStatus("email_input_rejected");
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
      // Continua normalmente para a confirmação
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

      // Registra evento no analytics
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment_manual_review",
          metadata: { email, edition },
        }),
      });
    } catch {
      // Ignora erro
    }
    setStatus("rejected");
    setMessage("¡Comprobante recibido con éxito! Nuestro equipo lo revisará en minutos y te enviaremos el acceso a tu correo.");
  }

  return (
    <main className="checkout-page paper">
      {/* Top Security Banner */}
      <div className="checkout-top-security-bar">
        <div className="checkout-security-content">
          <span className="security-badge-item">
            <svg className="lock-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            Checkout Seguro SSL 256-Bit
          </span>
          <span className="security-divider">|</span>
          <span className="security-badge-item">🔒 Transacción Encriptada</span>
          <span className="security-divider">|</span>
          <span className="security-badge-item">↻ Garantía de 30 Días</span>
          <span className="security-divider">|</span>
          <span className="security-badge-item">⚡ Entrega Inmediata</span>
        </div>
      </div>

      <div className="checkout-container">
        {/* Navigation & Breadcrumb */}
        <div className="checkout-nav-row">
          <a href="/" className="checkout-back">
            <span aria-hidden="true">←</span> Volver a la página principal
          </a>
          <div className="checkout-order-tag">
            <span>Referencia:</span> <strong>{orderCode}</strong>
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="checkout-steps-bar" role="navigation" aria-label="Progreso del pedido">
          <div className={`step-item ${status === "idle" || status === "uploading" ? "active" : "completed"}`}>
            <div className="step-number">{file ? "✓" : "1"}</div>
            <div className="step-info">
              <span className="step-title">Paso 1</span>
              <span className="step-desc">Transfiere a Nequi / Bre-B</span>
            </div>
          </div>
          <div className="step-connector" />
          <div className={`step-item ${file && (status === "idle" || status === "uploading" || status === "verifying") ? "active" : status === "approved" || status === "email_input" || status === "email_input_rejected" ? "completed" : ""}`}>
            <div className="step-number">{(status === "approved" || status === "email_input") ? "✓" : "2"}</div>
            <div className="step-info">
              <span className="step-title">Paso 2</span>
              <span className="step-desc">Sube tu comprobante</span>
            </div>
          </div>
          <div className="step-connector" />
          <div className={`step-item ${status === "approved" || status === "email_input" ? "active" : ""}`}>
            <div className="step-number">3</div>
            <div className="step-info">
              <span className="step-title">Paso 3</span>
              <span className="step-desc">Recibe acceso inmediato</span>
            </div>
          </div>
        </div>

        <div className="checkout-grid">
          {/* LEFT COLUMN: Payment details and Upload */}
          <div className="checkout-left">
            <div className="checkout-card main-payment-card">
              {/* Account Holder Verified Box */}
              <div className="account-verified-box">
                <div className="account-verified-header">
                  <div className="verified-shield-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="verified-pill">
                      <span>✓ Cuenta Oficial Verificada</span>
                    </div>
                    <p className="account-holder-name">
                      Titular Autorizado: <strong>Juan Arroyave (mi esposo)</strong>
                    </p>
                    <p className="account-holder-role">
                      La cuenta bancaria está a nombre de Juan Arroyave, mi esposo y administrador del proyecto.
                    </p>
                  </div>
                </div>
                <div className="account-verified-note">
                  🛡️ Puedes transferir con total tranquilidad y confianza únicamente a los datos oficiales presentados a continuación.
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="payment-tabs-header">
                <button
                  type="button"
                  className={`payment-tab-btn ${activeTab === "nequi" ? "active nequi-tab" : ""}`}
                  onClick={() => setActiveTab("nequi")}
                >
                  <span className="tab-icon">🟣</span>
                  <span className="tab-text">
                    <strong>Pagar con Nequi</strong>
                    <small>Transferencia directa</small>
                  </span>
                  {activeTab === "nequi" && <span className="tab-active-dot" />}
                </button>
                <button
                  type="button"
                  className={`payment-tab-btn ${activeTab === "breb" ? "active breb-tab" : ""}`}
                  onClick={() => setActiveTab("breb")}
                >
                  <span className="tab-icon">🟢</span>
                  <span className="tab-text">
                    <strong>Llave Bre-B</strong>
                    <small>Cualquier banco / Transfiya</small>
                  </span>
                  {activeTab === "breb" && <span className="tab-active-dot" />}
                </button>
              </div>

              {/* Tab 1: Nequi */}
              {activeTab === "nequi" && (
                <div className="payment-tab-content active-fade">
                  <div className="payment-method-box">
                    <div className="payment-box-head">
                      <span className="method-badge nequi-badge">Número Nequi</span>
                      <span className="method-hint">Toca el botón para copiar</span>
                    </div>

                    <div className="payment-value-container">
                      <code className="payment-code">3022913251</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("3022913251", "nequi")}
                        className={`copy-btn-large ${copied === "nequi" ? "copied" : ""}`}
                        aria-label="Copiar número de Nequi"
                      >
                        {copied === "nequi" ? (
                          <>
                            <span className="copy-check">✓</span> ¡Número Copiado!
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                            Copiar Número Nequi
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="payment-instructions-box">
                    <p className="instructions-title">📋 Pasos rápidos para pagar por Nequi:</p>
                    <ol className="instructions-list">
                      <li>
                        Abre tu aplicación de <strong>Nequi</strong> en el celular.
                      </li>
                      <li>
                        Entra en <strong>Envía</strong> y selecciona <strong>A Nequi</strong>.
                      </li>
                      <li>
                        Pega el número <strong>3022913251</strong> e ingresa el monto exacto: <strong>{price} COP</strong>.
                      </li>
                      <li>
                        Toma una captura de pantalla (o guarda en PDF) de tu comprobante exitoso.
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab 2: Bre-B */}
              {activeTab === "breb" && (
                <div className="payment-tab-content active-fade">
                  <div className="payment-method-box">
                    <div className="payment-box-head">
                      <span className="method-badge breb-badge">Llave Bre-B</span>
                      <span className="method-hint">Compatible con Bancolombia, Daviplata, BBVA, etc.</span>
                    </div>

                    <div className="payment-value-container">
                      <code className="payment-code">@NEQUIJUA555917</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("@NEQUIJUA555917", "breb")}
                        className={`copy-btn-large ${copied === "breb" ? "copied" : ""}`}
                        aria-label="Copiar Llave Bre-B"
                      >
                        {copied === "breb" ? (
                          <>
                            <span className="copy-check">✓</span> ¡Llave Copiada!
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                            Copiar Llave Bre-B
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="payment-instructions-box">
                    <p className="instructions-title">📋 Pasos rápidos para pagar con Llave Bre-B:</p>
                    <ol className="instructions-list">
                      <li>
                        Abre la app de tu banco (<strong>Bancolombia, Daviplata, BBVA, Nu, etc.</strong>).
                      </li>
                      <li>
                        Selecciona transferir a <strong>Llave Bre-B</strong> o <strong>Transfiya</strong>.
                      </li>
                      <li>
                        Pega la llave <strong>@NEQUIJUA555917</strong> e ingresa el monto: <strong>{price} COP</strong>.
                      </li>
                      <li>
                        Guarda tu captura o comprobante de la transferencia realizada.
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Receipt Visual Guidance Box */}
              <div className="receipt-tip-card">
                <div className="receipt-tip-icon">💡</div>
                <div className="receipt-tip-text">
                  <strong>Recomendación para validación inmediata:</strong>
                  <p>
                    Asegúrate de que en la foto de tu comprobante se vea claramente el <strong>monto ({price} COP)</strong>, la <strong>fecha</strong> y el <strong>número de comprobante / referencia</strong>.
                  </p>
                </div>
              </div>

              {/* Upload Section */}
              <div className="upload-section-wrapper">
                <div className="upload-section-header">
                  <h3>Sube tu comprobante de pago</h3>
                  <span className="upload-required-badge">Obligatorio para liberar acceso</span>
                </div>

                <div
                  className={`upload-zone-modern ${file ? "has-file" : ""} ${dragActive ? "dragover" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  {preview ? (
                    <div className="upload-preview-wrap-modern">
                      {preview === "pdf" ? (
                        <div className="pdf-preview-box">
                          <span className="pdf-icon">📄</span>
                          <div className="pdf-info">
                            <strong>{file?.name}</strong>
                            <small>{file ? `${(file.size / 1024).toFixed(1)} KB` : "Documento PDF"}</small>
                          </div>
                        </div>
                      ) : (
                        <div className="image-preview-box">
                          <img src={preview} alt="Vista previa del comprobante" className="upload-preview-img" />
                          <div className="image-preview-overlay">
                            <span className="preview-file-name">{file?.name}</span>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className="change-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPreview(null);
                          setStatus("idle");
                          setMessage("");
                        }}
                      >
                        Cambiar archivo
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder-modern">
                      <div className="upload-icon-circle">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                        </svg>
                      </div>
                      <p className="upload-main-text">
                        <strong>Haz clic para seleccionar</strong> o arrastra tu comprobante aquí
                      </p>
                      <span className="upload-sub-text">Formatos aceptados: JPG, PNG, WEBP o PDF</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) selectFile(f);
                    }}
                    hidden
                  />
                </div>

                {file && status === "idle" && (
                  <button onClick={handleSubmit} className="verify-btn-cta button">
                    <span>Verificar pago y obtener acceso</span>
                    <b aria-hidden="true">→</b>
                  </button>
                )}

                {/* Uploading & Verifying States */}
                {(status === "uploading" || status === "verifying") && (
                  <div className="checkout-status-modern verifying">
                    <div className="spinner-modern" />
                    <div className="status-text-wrap">
                      <p className="status-title">
                        {status === "uploading" ? "Subiendo tu comprobante de forma segura..." : "Analizando y verificando tu pago..."}
                      </p>
                      <small className="status-sub">Esto toma solo unos segundos gracias a nuestro sistema automatizado.</small>
                    </div>
                  </div>
                )}

                {/* Approved State: Email Input */}
                {(status === "email_input" || status === "sending_email") && (
                  <div className="checkout-status-modern approved">
                    <div className="status-header-approved">
                      <div className="status-icon-approved">✓</div>
                      <div>
                        <p className="status-title-approved">¡Pago Verificado con Éxito!</p>
                        <small className="status-sub-approved">Tu transacción ha sido validada correctamente.</small>
                      </div>
                    </div>

                    <div className="email-capture-box">
                      <p className="email-capture-label">
                        Ingresa tu correo electrónico para enviarte el enlace de acceso permanente y respaldo del material:
                      </p>
                      <form onSubmit={handleEmailSubmit} className="email-form-modern">
                        <div className="input-icon-wrap">
                          <input
                            type="email"
                            required
                            placeholder="ejemplo@tucorreo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="email-input-field"
                            disabled={status === "sending_email"}
                            autoFocus
                          />
                        </div>
                        <button
                          type="submit"
                          className="button email-submit-btn"
                          disabled={status === "sending_email"}
                        >
                          {status === "sending_email" ? "Enviando acceso..." : "Acceder a mi material ahora →"}
                        </button>
                      </form>
                      <span className="email-privacy-notice">🔒 Tu correo está 100% protegido contra spam.</span>
                    </div>
                  </div>
                )}

                {/* Manual Review State: Email Input */}
                {(status === "email_input_rejected" || status === "sending_email_rejected") && (
                  <div className="checkout-status-modern review-needed">
                    <div className="status-header-review">
                      <div className="status-icon-review">⏳</div>
                      <div>
                        <p className="status-title-review">Comprobante recibido para verificación</p>
                        <small className="status-sub-review">
                          No te preocupes: nuestro equipo revisará tu comprobante en pocos minutos para liberarte el acceso.
                        </small>
                      </div>
                    </div>

                    <div className="email-capture-box">
                      <p className="email-capture-label">
                        Ingresa tu correo electrónico para que nuestro equipo te envíe el acceso directo apenas sea confirmado:
                      </p>
                      <form onSubmit={handleRejectedEmailSubmit} className="email-form-modern">
                        <input
                          type="email"
                          required
                          placeholder="ejemplo@tucorreo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="email-input-field"
                          disabled={status === "sending_email_rejected"}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="button email-submit-btn"
                          disabled={status === "sending_email_rejected"}
                        >
                          {status === "sending_email_rejected" ? "Enviando..." : "Confirmar y Enviar para Revisión →"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {status === "rejected" && (
                  <div className="checkout-status-modern review-submitted">
                    <div className="status-icon-review">📬</div>
                    <p className="status-title-review">{message}</p>
                    <p className="status-sub">Te notificaremos por correo electrónico en cuanto tu comprobante sea validado.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setStatus("idle");
                        setMessage("");
                      }}
                      className="retry-btn-modern"
                    >
                      Subir otro comprobante si lo deseas
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Trust Drivers */}
          <div className="checkout-right">
            {/* Order Summary Card */}
            <div className="order-summary-card">
              <div className="summary-header">
                <h3>Resumen de tu Pedido</h3>
                <span className="lifetime-badge">Acceso de por Vida</span>
              </div>

              <div className="summary-product-item">
                <div className="product-thumb">
                  <Image
                    src={image}
                    alt={title}
                    width={76}
                    height={95}
                    className="product-thumb-img"
                  />
                </div>
                <div className="product-info-summary">
                  <span className="summary-eyebrow">
                    {edition === "completa" ? "Colección Completa + 4 Bonos" : "Guía Esencial de Conservas"}
                  </span>
                  <h4 className="summary-product-title">{title}</h4>
                  <div className="summary-rating">
                    <span className="stars-gold">★★★★★</span>
                    <small>4.9/5 (+2.450 alumnas)</small>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="price-breakdown-box">
                <div className="breakdown-row">
                  <span>Precio habitual:</span>
                  <del className="old-price-line">{originalPrice} COP</del>
                </div>
                <div className="breakdown-row discount-row">
                  <span>Descuento aplicado hoy:</span>
                  <span className="discount-badge">- {savings}</span>
                </div>
                <div className="breakdown-row total-row">
                  <div>
                    <strong>Total a pagar:</strong>
                    <small className="single-pay-note">Pago único · Sin cobros mensuales</small>
                  </div>
                  <div className="total-amount-display">
                    <strong>{price}</strong>
                    <small>COP</small>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="summary-features-list">
                <p className="features-headline">Tu pedido incluye hoy:</p>
                <ul>
                  {features.map((f) => (
                    <li key={f}>
                      <span className="feature-check">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bonuses List if any */}
              {bonuses.length > 0 && (
                <div className="summary-bonuses-box">
                  <div className="bonuses-box-title">
                    <span>🎁 4 Bonos Extras Incluidos Gratis:</span>
                  </div>
                  <ul className="bonuses-list">
                    {bonuses.map((b) => (
                      <li key={b}>
                        <span className="bonus-star">✦</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 30-Day Guarantee Card */}
            <div className="guarantee-card-checkout">
              <div className="guarantee-badge-circle">
                <span className="guarantee-icon">🛡️</span>
              </div>
              <div className="guarantee-content">
                <h4>Garantía Incondicional de 30 Días</h4>
                <p>
                  Prueba todo el material, las recetas y herramientas a tu propio ritmo. Si por cualquier motivo no estás 100% satisfecha con lo aprendido, te devolvemos el total de tu dinero sin preguntas.
                </p>
              </div>
            </div>

            {/* Real Student Testimonial Snippet */}
            <div className="checkout-testimonial-card">
              <div className="testimonial-header-row">
                <div className="testimonial-avatar-wrap">
                  <Image
                    src="/images/testimonials/02-paula.jpg"
                    alt="Paula Santos"
                    width={44}
                    height={44}
                    className="testimonial-avatar"
                  />
                  <div>
                    <strong>Paula Santos</strong>
                    <span>Medellín, Colombia · Alumna Verificada</span>
                  </div>
                </div>
                <div className="testimonial-stars">★★★★★</div>
              </div>
              <blockquote className="testimonial-quote">
                “Hice el pago por Nequi, subí el comprobante y en menos de 2 minutos ya tenía el material en mi correo. La explicación de la esterilización y las recetas me dieron la seguridad que necesitaba para empezar.”
              </blockquote>
            </div>
          </div>
        </div>

        {/* Global Trust Footer */}
        <div className="checkout-bottom-trust">
          <div className="trust-pill-item">
            <span className="pill-icon">🔒</span>
            <span>Pago 100% Protegido</span>
          </div>
          <div className="trust-pill-item">
            <span className="pill-icon">⚡</span>
            <span>Entrega Digital Inmediata</span>
          </div>
          <div className="trust-pill-item">
            <span className="pill-icon">↻</span>
            <span>Garantía de Devolución 30 Días</span>
          </div>
          <div className="trust-pill-item">
            <span className="pill-icon">∞</span>
            <span>Acceso Ilimitado y de por Vida</span>
          </div>
        </div>
      </div>
    </main>
  );
}


