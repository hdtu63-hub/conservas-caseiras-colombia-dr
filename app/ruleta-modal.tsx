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
  const [hasWon, setHasWon] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
  const [pointerBounce, setPointerBounce] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Dibujar la Ruleta en el Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 360;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);

    const center = size / 2;
    const radius = center - 12;
    const numSlices = SLICES.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, size, size);

    // Borde exterior dorado y fondo
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#211914";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#e5ae52";
    ctx.stroke();

    // Dibujar cada rebanada
    SLICES.forEach((slice, i) => {
      // El segmento 0 (75% DESCUENTO) se centra exactamente arriba (270 grados en canvas)
      // Ajustamos el ángulo inicial para que el centro del slice 0 esté a -90° (top)
      const startAngle = i * sliceAngle - Math.PI / 2 - sliceAngle / 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = slice.bgColor;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(244, 240, 231, 0.35)";
      ctx.stroke();

      // Dibujar texto de la rebanada
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = slice.textColor;

      if (slice.isWinner) {
        ctx.font = "bold 13px 'DM Sans', sans-serif";
        ctx.fillText(slice.text, radius - 16, 2);
        if (slice.subtext) {
          ctx.font = "bold 9px 'DM Sans', sans-serif";
          ctx.fillStyle = "#ffe082";
          ctx.fillText(slice.subtext, radius - 16, 14);
        }
      } else {
        ctx.font = "600 12px 'DM Sans', sans-serif";
        ctx.fillText(slice.text, radius - 18, 2);
        if (slice.subtext) {
          ctx.font = "bold 8.5px 'DM Sans', sans-serif";
          ctx.fillStyle = slice.textColor === "#ffffff" ? "rgba(255,255,255,0.75)" : "rgba(33,25,20,0.75)";
          ctx.fillText(slice.subtext, radius - 18, 13);
        }
      }
      ctx.restore();
    });

    // Pequeñas luces decorativas en el borde
    const numBulbs = 24;
    for (let b = 0; b < numBulbs; b++) {
      const bulbAngle = (b * (2 * Math.PI)) / numBulbs;
      const bx = center + (radius + 4) * Math.cos(bulbAngle);
      const by = center + (radius + 4) * Math.sin(bulbAngle);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, 2 * Math.PI);
      ctx.fillStyle = b % 2 === 0 ? "#fff3b0" : "#e5ae52";
      ctx.fill();
    }

    // Centro de la ruleta (buje central dorado)
    ctx.beginPath();
    ctx.arc(center, center, 28, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(center - 5, center - 5, 2, center, center, 28);
    grad.addColorStop(0, "#fff5cc");
    grad.addColorStop(0.6, "#e5ae52");
    grad.addColorStop(1, "#b37d22");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#211914";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, 14, 0, 2 * Math.PI);
    ctx.fillStyle = "#c15542";
    ctx.fill();
  }, []);

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

  // Temporizador de 10 minutos
  useEffect(() => {
    if (!hasWon) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [hasWon]);

  // Backredirect & Exit Intent Setup
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Marcar cuando el usuario hace clic en enlaces internos para no disparar el popup
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
    if (isSpinning || hasWon) return;
    setIsSpinning(true);
    getAudioContext();

    // 7 vueltas completas (2520 deg) = la aguja pasa por todos los descuentos,
    // se desacelera fuertemente en 5% DESCUENTO (Slice 7) y al final se desliza y frena en 75% DESCUENTO (Slice 0)
    const targetDegrees = 360 * 7;
    setRotation(targetDegrees);

    const spinDuration = 5500; // 5.5 segundos de pura emoción
    const startTime = performance.now();
    let lastPinIndex = -1;

    // Seguimiento en tiempo real de los "ticks" y rebote de la aguja sincronizado con la rotación
    const trackTicks = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);

      // Aproximación del cubic-bezier(0.1, 0.9, 0.15, 1) para calcular el ángulo instantáneo
      const easeProgress = 1 - Math.pow(1 - progress, 4.4);
      const currentDegrees = easeProgress * targetDegrees;

      // Cada 45 grados pasa un pin/división
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

    // Al finalizar el giro completo
    setTimeout(() => {
      setIsSpinning(false);
      setHasWon(true);
      playWinSound();
      fireConfetti();
    }, spinDuration + 100);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="ruleta-overlay" role="dialog" aria-modal="true" aria-labelledby="ruleta-title">
      <canvas ref={confettiCanvasRef} className="ruleta-confetti-canvas" />

      <div className="ruleta-modal-card paper">
        {/* Botón de cerrar discreto */}
        <button
          type="button"
          onClick={handleClose}
          className="ruleta-close-btn"
          aria-label="Cerrar ventana"
        >
          ✕
        </button>

        {!hasWon ? (
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

            {/* Contenedor de la Ruleta */}
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

              {/* Canvas de la Ruleta con rotación CSS y curva de suspenso */}
              <div
                className="ruleta-canvas-container"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 5.5s cubic-bezier(0.1, 0.9, 0.15, 1)" : "none",
                }}
              >
                <canvas ref={canvasRef} className="ruleta-canvas" />
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
        ) : (
          /* ESTADO 2: PREMIO OBTENIDO (75% DESCUENTO EN PAQUETE COMPLETO) */
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
              onClick={handleClose}
              className="ruleta-dismiss-link"
            >
              No gracias, prefiero perder mi descuento del 75%
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
