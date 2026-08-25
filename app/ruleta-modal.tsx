"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

interface Slice {
  text: string;
  subtext?: string;
  bgColor: string;
  textColor: string;
  isWinner?: boolean;
}

const SLICES: Slice[] = [
  { text: "75% DESCUENTO", subtext: "¡PREMIO MAYOR!", bgColor: "#c15542", textColor: "#ffffff", isWinner: true },
  { text: "10% OFF", bgColor: "#211914", textColor: "#f4f0e7" },
  { text: "30% OFF", bgColor: "#145d3d", textColor: "#ffffff" },
  { text: "BONO EXTRA", subtext: "1 Guía Gratis", bgColor: "#e5ae52", textColor: "#211914" },
  { text: "50% OFF", bgColor: "#9a4b2f", textColor: "#ffffff" },
  { text: "20% OFF", bgColor: "#211914", textColor: "#f4f0e7" },
  { text: "CASI GANAS", subtext: "¡Intenta!", bgColor: "#145d3d", textColor: "#ffffff" },
  { text: "5% DESCUENTO", subtext: "Por poco...", bgColor: "#38291f", textColor: "#ffe082" },
];

export default function RuletaModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [step, setStep] = useState<"spin" | "win_75" | "downsell_8k">("spin");
  const [rotation, setRotation] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
  const [timeLeft8k, setTimeLeft8k] = useState(300); // 5 minutos
  const [pointerBounce, setPointerBounce] = useState(false);

  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isNavigatingInternally = useRef(false);
  const hasTriggeredRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  // Inicializar Web Audio API bajo demanda
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Sonido de "click / tick" al pasar cada división
  const playTickSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(620 + Math.random() * 80, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {
      // Ignorar errores de audio
    }
  }, [getAudioContext]);

  // Sonido de fanfarria triunfal al ganar
  const playWinSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.6);
      });
    } catch {
      // Ignorar errores de audio
    }
  }, [getAudioContext]);

  // Animación de Confeti
  const fireConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    const colors = ["#c15542", "#e5ae52", "#145d3d", "#f4f0e7", "#ffffff", "#ffd700"];
    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35 + (Math.random() - 0.5) * 100,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 12,
        speedY: Math.random() * -10 - 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
      });
    }

    let animationFrame: number;
    let startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = Date.now() - startTime;

      pieces.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.35; // Gravedad
        p.speedX *= 0.98; // Resistencia al aire
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < 4500) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
  }, []);

  // Temporizadores
  useEffect(() => {
    if (step !== "win_75") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== "downsell_8k") return;
    const interval = setInterval(() => {
      setTimeLeft8k((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Backredirect & Exit Intent Setup
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Marcar cuando el usuario hace clic en enlaces internos
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.href) {
        const url = new URL(target.href, window.location.href);
        if (url.pathname.startsWith("/checkout") || target.href.includes("#")) {
          isNavigatingInternally.current = true;
        }
      }
    };
    document.addEventListener("click", handleLinkClick, true);

    // 2. BACKREDIRECT: Insertar estado en el historial
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({ page: "conservas_home_active" }, "", window.location.href);
      }
    } catch {}

    const handlePopState = () => {
      if (isNavigatingInternally.current) return;
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsOpen(true);
        try {
          window.history.pushState({ page: "conservas_home_active" }, "", window.location.href);
        } catch {}
      }
    };

    window.addEventListener("popstate", handlePopState);

    // 3. EXIT INTENT (Desktop): Detectar salida del cursor por la parte superior
    const handleMouseLeave = (e: MouseEvent) => {
      if (isNavigatingInternally.current) return;
      if (e.clientY <= 8 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsOpen(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Función para girar la ruleta con física y suspenso
  const handleSpin = () => {
    if (isSpinning || step !== "spin") return;
    setIsSpinning(true);
    getAudioContext();

    // 7 vueltas completas (2520 deg) = la aguja pasa por todos los descuentos,
    // desacelera en 5% DESCUENTO (Slice 7) y al final frena en 75% DESCUENTO (Slice 0)
    const targetDegrees = 360 * 7;
    setRotation(targetDegrees);

    const spinDuration = 5500; // 5.5 segundos
    const startTime = performance.now();
    let lastPinIndex = -1;

    const trackTicks = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);

      const easeProgress = 1 - Math.pow(1 - progress, 4.4);
      const currentDegrees = easeProgress * targetDegrees;
      const currentPin = Math.floor((currentDegrees + 22.5) / 45);

      if (currentPin !== lastPinIndex) {
        lastPinIndex = currentPin;
        playTickSound();
        setPointerBounce(true);
        setTimeout(() => setPointerBounce(false), 50);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(trackTicks);
      }
    };

    animFrameRef.current = requestAnimationFrame(trackTicks);

    setTimeout(() => {
      setIsSpinning(false);
      setStep("win_75");
      playWinSound();
      fireConfetti();
    }, spinDuration + 100);
  };

  // Interceptar cierre para ofrecer la oferta de 8k
  const handleCloseAttempt = () => {
    if (step === "spin" || step === "win_75") {
      // Abre la oferta ultra downsell de $8.000 COP
      setStep("downsell_8k");
      fireConfetti();
    } else {
      // Si ya está en la oferta de 8k, cierra definitivamente
      setIsOpen(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  // Renderizar la Ruleta en formato SVG vectorial 100% confiable
  const renderSvgWheel = () => {
    const center = 160;
    const radius = 145;
    const numSlices = SLICES.length;
    const sliceAngleDeg = 360 / numSlices; // 45 deg

    return (
      <svg
        viewBox="0 0 320 320"
        className="ruleta-svg-wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? "transform 5.5s cubic-bezier(0.1, 0.9, 0.15, 1)" : "none",
        }}
      >
        <defs>
          <radialGradient id="ruletaGoldHub" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff8db" />
            <stop offset="50%" stopColor="#e5ae52" />
            <stop offset="100%" stopColor="#a87114" />
          </radialGradient>
        </defs>

        {/* Borde exterior oscuro */}
        <circle cx={center} cy={center} r={radius + 10} fill="#211914" />
        <circle cx={center} cy={center} r={radius + 6} fill="none" stroke="#e5ae52" strokeWidth="5" />

        {/* Fatias da Ruleta */}
        {SLICES.map((slice, i) => {
          const thetaDeg = -90 + i * sliceAngleDeg;
          const a1Rad = ((thetaDeg - 22.5) * Math.PI) / 180;
          const a2Rad = ((thetaDeg + 22.5) * Math.PI) / 180;
          const x1 = center + radius * Math.cos(a1Rad);
          const y1 = center + radius * Math.sin(a1Rad);
          const x2 = center + radius * Math.cos(a2Rad);
          const y2 = center + radius * Math.sin(a2Rad);

          const pathData = `M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

          return (
            <g key={slice.text}>
              <path
                d={pathData}
                fill={slice.bgColor}
                stroke="rgba(244, 240, 231, 0.35)"
                strokeWidth="1.5"
              />
              {/* Texto da fatia alinhado radialmente */}
              <g transform={`rotate(${thetaDeg}, ${center}, ${center})`}>
                <text
                  x={center + radius - 14}
                  y={center + (slice.subtext ? 1 : 4)}
                  fill={slice.textColor}
                  fontSize={slice.isWinner ? "12" : "11"}
                  fontWeight={slice.isWinner ? "800" : "700"}
                  fontFamily="'DM Sans', sans-serif"
                  textAnchor="end"
                >
                  {slice.text}
                </text>
                {slice.subtext && (
                  <text
                    x={center + radius - 14}
                    y={center + 12}
                    fill={slice.textColor === "#ffffff" ? "#ffe082" : "rgba(33,25,20,0.8)"}
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="'DM Sans', sans-serif"
                    textAnchor="end"
                  >
                    {slice.subtext}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* Luzes decorativas */}
        {Array.from({ length: 24 }).map((_, b) => {
          const bulbAngle = (b * (2 * Math.PI)) / 24;
          const bx = center + (radius + 6) * Math.cos(bulbAngle);
          const by = center + (radius + 6) * Math.sin(bulbAngle);
          return (
            <circle
              key={b}
              cx={bx}
              cy={by}
              r="2.8"
              fill={b % 2 === 0 ? "#fff3b0" : "#e5ae52"}
            />
          );
        })}

        {/* Centro da Ruleta (Buje dourado) */}
        <circle cx={center} cy={center} r="26" fill="url(#ruletaGoldHub)" stroke="#211914" strokeWidth="2.5" />
        <circle cx={center} cy={center} r="12" fill="#c15542" />
      </svg>
    );
  };

  return (
    <div className="ruleta-overlay" role="dialog" aria-modal="true" aria-labelledby="ruleta-title">
      <canvas ref={confettiCanvasRef} className="ruleta-confetti-canvas" />

      <div className="ruleta-modal-card paper">
        {/* Botão de fechar */}
        <button
          type="button"
          onClick={handleCloseAttempt}
          className="ruleta-close-btn"
          aria-label="Cerrar ventana"
        >
          ✕
        </button>

        {step === "spin" && (
          /* ESTADO 1: INVITACIÓN A GIRAR LA RULETA */
          <div className="ruleta-step-spin">
            <div className="ruleta-header-badge">
              <span className="ruleta-alarm-icon">🚨</span>
              <span>¡ESPERE! ANTES DE IRTE...</span>
            </div>

            <h2 id="ruleta-title" className="ruleta-headline">
              Gira la ruleta y descubre <em>tu regalo especial</em>
            </h2>

            <p className="ruleta-subheadline">
              Tienes <strong>1 oportunidad exclusiva</strong> para desbloquear un beneficio único en la Colección Completa de Conservas Caseras.
            </p>

            {/* Contenedor de la Ruleta SVG */}
            <div className="ruleta-wheel-wrapper">
              {/* Puntero Indicador */}
              <div className={`ruleta-pointer ${pointerBounce ? "bounce" : ""}`}>
                <svg viewBox="0 0 32 40" width="36" height="44">
                  <path
                    d="M16 40 L0 10 C0 4.5 7.2 0 16 0 C24.8 0 32 4.5 32 10 Z"
                    fill="#e5ae52"
                    stroke="#211914"
                    strokeWidth="3"
                  />
                  <circle cx="16" cy="12" r="5" fill="#c15542" />
                </svg>
              </div>

              {/* Render do SVG da Ruleta com rotação */}
              <div className="ruleta-canvas-container">
                {renderSvgWheel()}
              </div>

              {/* Botón Central de Girar */}
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning}
                className="ruleta-center-spin-btn"
                aria-label="Girar ruleta"
              >
                {isSpinning ? "..." : "GIRAR"}
              </button>
            </div>

            {/* Botón Principal de Acción */}
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning}
              className={`button ruleta-cta-spin-btn ${isSpinning ? "spinning" : "pulse-glow"}`}
            >
              <span>{isSpinning ? "¡Girando la ruleta de la suerte..." : "👉 TOCAR AQUÍ PARA GIRAR LA RULETA"}</span>
              {!isSpinning && <b aria-hidden="true">🎰</b>}
            </button>

            <p className="ruleta-guarantee-note">
              🔒 Oferta 100% garantizada y válida solo para esta visita
            </p>
          </div>
        )}

        {step === "win_75" && (
          /* ESTADO 2: PREMIO OBTENIDO (75% DESCUENTO EN PAQUETE COMPLETO - $14.000 COP) */
          <div className="ruleta-step-win">
            <div className="ruleta-win-badge">
              <span>🎉 ¡PREMIO DESBLOQUEADO CON ÉXITO!</span>
            </div>

            <h2 className="ruleta-win-title">
              ¡FELICITACIONES! Has ganado un <em>75% de Descuento</em>
            </h2>

            <p className="ruleta-win-subtitle">
              Acabas de ganar el beneficio máximo para llevarte la <strong>Colección Completa de Conservas Caseras + 4 Bonos</strong> a precio de liquidación exclusiva.
            </p>

            {/* Tarjeta del Producto Ganado */}
            <div className="ruleta-prize-card">
              <div className="ruleta-prize-top">
                <div className="ruleta-prize-thumb">
                  <Image
                    src="/images/materials/01-guia-completa.jpg"
                    alt="Colección Completa de Conservas"
                    width={80}
                    height={100}
                    className="ruleta-prize-img"
                  />
                </div>
                <div className="ruleta-prize-info">
                  <span className="ruleta-prize-tag">PAQUETE COMPLETO + 4 BONOS</span>
                  <h3 className="ruleta-prize-name">Colección Completa de Conservas</h3>
                  <div className="ruleta-prize-included">
                    <span>✓ 100+ Recetas Rentables</span>
                    <span>✓ Videoclases paso a paso</span>
                    <span>✓ 4 Bonos Gratis ($78.000)</span>
                  </div>
                </div>
              </div>

              {/* Comparación de Precios */}
              <div className="ruleta-price-box">
                <div className="ruleta-price-row">
                  <span>Valor total habitual:</span>
                  <del>$167.000 COP</del>
                </div>
                <div className="ruleta-price-row">
                  <span>Precio de oferta normal:</span>
                  <del>$28.000 COP</del>
                </div>
                <div className="ruleta-price-row ruleta-discount-highlight">
                  <span>Descuento de la Ruleta (75%):</span>
                  <strong className="ruleta-discount-tag">- $153.000 COP</strong>
                </div>
                <div className="ruleta-price-total">
                  <div>
                    <span className="ruleta-total-label">Total a pagar hoy:</span>
                    <small>Pago único · Acceso de por vida</small>
                  </div>
                  <div className="ruleta-final-amount">
                    <span className="ruleta-currency">$</span>
                    <strong>14.000</strong>
                    <span className="ruleta-cop">COP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Temporizador de Urgencia */}
            <div className="ruleta-timer-box">
              <span className="ruleta-timer-icon">⏳</span>
              <p>
                Tu descuento del 75% está reservado por:{" "}
                <strong className="ruleta-countdown">{formatTimer(timeLeft)}</strong>
              </p>
            </div>

            {/* Botón de Redirección al Checkout */}
            <a
              href="/checkout/completa?descuento=75"
              className="button ruleta-checkout-cta-btn"
            >
              <span>¡QUIERO ESTE DESCUENTO AHORA!</span>
              <b aria-hidden="true">→</b>
            </a>

            <div className="ruleta-trust-row">
              <span>♢ Pago Seguro</span>
              <span>⚡ Entrega Inmediata</span>
              <span>↻ Garantía de 30 Días</span>
            </div>

            <button
              type="button"
              onClick={handleCloseAttempt}
              className="ruleta-dismiss-link"
            >
              No gracias, prefiero perder mi descuento del 75%
            </button>
          </div>
        )}

        {step === "downsell_8k" && (
          /* ESTADO 3: OFERTA ULTRA DOWNSELL - $8.000 COP CON 7 BONOS (4 + 3 EXTRAS) */
          <div className="ruleta-step-downsell">
            <div className="ruleta-downsell-badge">
              <span>🔥 SUBSIDIO EXCLUSIVO DE SALIDA ACTIVADO</span>
            </div>

            <h2 className="ruleta-win-title">
              ¡ESPERA! Te lo dejamos por solo <em>$8.000 COP</em>
            </h2>

            <p className="ruleta-win-subtitle">
              No queremos que te quedes sin aprender. Te entregamos la <strong>Colección Completa + los 4 Bonos Oficiales + 3 BONOS EXTRA EXCLUSIVOS (7 bonos en total)</strong> a precio de regalo:
            </p>

            {/* Tarjeta de la Oferta de $8.000 con 7 Bonos */}
            <div className="ruleta-prize-card downsell-card-highlight">
              <div className="ruleta-prize-top">
                <div className="ruleta-prize-thumb">
                  <Image
                    src="/images/materials/01-guia-completa.jpg"
                    alt="Colección Completa de Conservas + 7 Bonos"
                    width={80}
                    height={100}
                    className="ruleta-prize-img"
                  />
                </div>
                <div className="ruleta-prize-info">
                  <span className="ruleta-prize-tag tag-8k">PAQUETE COMPLETO + 7 BONOS VIP</span>
                  <h3 className="ruleta-prize-name">Colección Completa de Conservas</h3>
                  <div className="ruleta-prize-included-8k">
                    <span>✓ 100+ Recetas + Videoclases</span>
                    <span>✓ 4 Bonos Oficiales ($78.000)</span>
                    <strong className="extra-bonuses-label">🎁 + 3 BONOS EXTRAS DESBLOQUEADOS:</strong>
                    <small>✦ Recetario Secreto Encurtidos Express ($15.000)</small>
                    <small>✦ Plantilla Control Vencimientos ($12.000)</small>
                    <small>✦ Guía Empaque y Regalos ($14.000)</small>
                  </div>
                </div>
              </div>

              {/* Comparación de Precios */}
              <div className="ruleta-price-box">
                <div className="ruleta-price-row">
                  <span>Valor total con 7 bonos:</span>
                  <del>$208.000 COP</del>
                </div>
                <div className="ruleta-price-row">
                  <span>Precio de oferta ruleta:</span>
                  <del>$14.000 COP</del>
                </div>
                <div className="ruleta-price-row ruleta-discount-highlight-8k">
                  <span>Subsidio especial aplicado:</span>
                  <strong className="ruleta-discount-tag">- $200.000 COP</strong>
                </div>
                <div className="ruleta-price-total">
                  <div>
                    <span className="ruleta-total-label">Total final hoy:</span>
                    <small>Pago único · Acceso permanente</small>
                  </div>
                  <div className="ruleta-final-amount">
                    <span className="ruleta-currency">$</span>
                    <strong className="amount-8k">8.000</strong>
                    <span className="ruleta-cop">COP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Temporizador de Urgencia 8k */}
            <div className="ruleta-timer-box timer-8k">
              <span className="ruleta-timer-icon">⏳</span>
              <p>
                Esta oferta extrema de $8.000 expira en:{" "}
                <strong className="ruleta-countdown">{formatTimer(timeLeft8k)}</strong>
              </p>
            </div>

            {/* Botón de Redirección al Checkout de $8.000 */}
            <a
              href="/checkout/completa?descuento=8k"
              className="button ruleta-checkout-cta-btn btn-8k"
            >
              <span>¡QUIERO TODO POR SOLO $8.000 COP!</span>
              <b aria-hidden="true">→</b>
            </a>

            <div className="ruleta-trust-row">
              <span>♢ Pago Seguro</span>
              <span>⚡ Acceso Inmediato</span>
              <span>↻ Garantía 30 Días</span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="ruleta-dismiss-link"
            >
              No gracias, renuncio a la colección y a los 7 bonos por $8.000 COP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
