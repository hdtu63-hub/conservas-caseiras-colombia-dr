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

// Fatias do 1º Giro (Prêmio máximo 75% no Slice 7)
const SLICES_SPIN_1: Slice[] = [
  { text: "BONO EXTRA", subtext: "1 Guía Gratis", bgColor: "#e5ae52", textColor: "#211914" },
  { text: "10% OFF", bgColor: "#211914", textColor: "#f4f0e7" },
  { text: "30% OFF", bgColor: "#145d3d", textColor: "#ffffff" },
  { text: "50% OFF", bgColor: "#9a4b2f", textColor: "#ffffff" },
  { text: "20% OFF", bgColor: "#211914", textColor: "#f4f0e7" },
  { text: "CASI GANAS", subtext: "¡Intenta!", bgColor: "#145d3d", textColor: "#ffffff" },
  { text: "5% DESCUENTO", subtext: "Por poco...", bgColor: "#38291f", textColor: "#ffe082" },
  { text: "75% DESCUENTO", subtext: "¡PREMIO MAYOR!", bgColor: "#c15542", textColor: "#ffffff", isWinner: true },
];

// Fatias do 2º Giro (Prêmio VIP $8.000 no Slice 7)
const SLICES_SPIN_2: Slice[] = [
  { text: "BONO EXTRA", subtext: "1 Guía Gratis", bgColor: "#e5ae52", textColor: "#211914" },
  { text: "10% OFF", bgColor: "#211914", textColor: "#f4f0e7" },
  { text: "30% OFF", bgColor: "#145d3d", textColor: "#ffffff" },
  { text: "50% OFF", bgColor: "#9a4b2f", textColor: "#ffffff" },
  { text: "20% OFF", bgColor: "#211914", textColor: "#f4f0e7" },
  { text: "CASI GANAS", subtext: "¡Intenta!", bgColor: "#145d3d", textColor: "#ffffff" },
  { text: "5% DESCUENTO", subtext: "Por poco...", bgColor: "#38291f", textColor: "#ffe082" },
  { text: "TODO X $8.000", subtext: "¡7 BONOS VIP!", bgColor: "#c15542", textColor: "#ffffff", isWinner: true },
];

interface RuletaModalProps {
  disabled?: boolean;
}

export default function RuletaModal({ disabled = false }: RuletaModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [step, setStep] = useState<"spin_1" | "win_75" | "spin_2_prompt" | "win_8k">("spin_1");
  const [needleAngle, setNeedleAngle] = useState(0); // Começa em BONO EXTRA (0° às 12h)
  const [activeSliceIndex, setActiveSliceIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
  const [timeLeft8k, setTimeLeft8k] = useState(300); // 5 minutos
  const [pointerBounce, setPointerBounce] = useState(false);

  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isNavigatingInternally = useRef(false);
  const hasTriggeredRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastPinRef = useRef<number>(-1);

  // Fatias ativas com base na etapa
  const currentSlices = (step === "spin_2_prompt" || step === "win_8k") ? SLICES_SPIN_2 : SLICES_SPIN_1;

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

  // Sonido de "click / tick" realista
  const playTickSound = useCallback((speedRatio = 1) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";

      const baseFreq = 460 + Math.min(280, speedRatio * 340);
      osc.frequency.setValueAtTime(baseFreq + Math.random() * 30, ctx.currentTime);

      const vol = Math.max(0.04, Math.min(0.12, 0.05 + speedRatio * 0.07));
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }, [getAudioContext]);

  // Sonido de fanfarria triunfal
  const playWinSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
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
    } catch {}
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
    for (let i = 0; i < 95; i++) {
      pieces.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 220,
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
        p.speedY += 0.35;
        p.speedX *= 0.98;
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
    if (step !== "win_8k") return;
    const interval = setInterval(() => {
      setTimeLeft8k((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Backredirect & Exit Intent Setup (Compatível com iPhone iOS Safari e Android)
  useEffect(() => {
    if (typeof window === "undefined" || disabled) return;

    try {
      if (window.location.search.includes("8k") || window.location.search.includes("8000")) return;
    } catch {}

    // Flag para ignorar navigações internas (hash links, checkout, etc.)
    let isInternalNav = false;

    // 1. Detectar cliques em links internos para NÃO abrir a roleta
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.href) {
        try {
          const url = new URL(target.href, window.location.href);
          // Links de hash (rolagem), checkout ou mesma página são navegação interna
          if (
            target.href.includes("#") ||
            url.pathname === window.location.pathname ||
            url.pathname.startsWith("/checkout")
          ) {
            isInternalNav = true;
            setTimeout(() => { isInternalNav = false; }, 1000);
          }
        } catch {}
      }
    };
    document.addEventListener("click", handleLinkClick, true);

    // 2. Inserir estado no histórico e reforçar ao primeiro toque preservando state do Next.js
    const pushBackState = () => {
      try {
        const curState = window.history.state || {};
        window.history.pushState({ ...curState, isBackBlocked: true }, "", window.location.href);
      } catch {}
    };

    pushBackState();

    // No iPhone (iOS Safari), touchstart/scroll armam o histórico
    const armOnTouch = () => { pushBackState(); };
    window.addEventListener("touchstart", armOnTouch, { passive: true, once: true });
    window.addEventListener("scroll", armOnTouch, { passive: true, once: true });

    // 3. Interceptar botão voltar do navegador / celular
    const handlePopState = (e: PopStateEvent) => {
      e?.preventDefault?.();
      // Ignorar se foi uma navegação interna (hash, checkout, etc.)
      if (isInternalNav) {
        isInternalNav = false;
        pushBackState();
        return;
      }
      setIsOpen(true);
      pushBackState();
    };
    window.addEventListener("popstate", handlePopState);

    // 4. Suporte ao BFCache do Safari no iOS (swipe lateral)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        pushBackState();
        setIsOpen(true);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    // 5. Exit Intent no Desktop (mouse saindo pelo topo da janela)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 8 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsOpen(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);

    // 6. Custom Event para abrir programaticamente
    const handleCustomOpen = () => { setIsOpen(true); };
    window.addEventListener("open-ruleta-modal", handleCustomOpen);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("touchstart", armOnTouch);
      window.removeEventListener("scroll", armOnTouch);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("open-ruleta-modal", handleCustomOpen);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [disabled]);

  // 1º GIRO: Suspense no 5%, hesitação no pino e parada no cantinho dos 75% (298°)
  const handleSpin1 = () => {
    if (isSpinning || step !== "spin_1") return;
    setIsSpinning(true);
    getAudioContext();

    const totalTurns = 6;
    const finalTargetAngle = totalTurns * 360 + 298; // 2458°
    const pin5To75 = totalTurns * 360 + 292.5; // 2452.5°

    const spinDuration = 6600; // 6.6s
    const startTime = performance.now();
    lastPinRef.current = -1;

    const animateNeedle = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);

      let currentDeg = 0;

      if (progress < 0.70) {
        const pNorm = progress / 0.70;
        const ease = 1 - Math.pow(1 - pNorm, 3.4);
        currentDeg = ease * (pin5To75 - 38);
      } else if (progress < 0.88) {
        const pNorm = (progress - 0.70) / (0.88 - 0.70);
        const ease = Math.sin(pNorm * (Math.PI / 2));
        currentDeg = (pin5To75 - 38) + ease * 36.8;
      } else if (progress < 0.96) {
        const pNorm = (progress - 0.88) / (0.96 - 0.88);
        const creep = (pin5To75 - 1.2) + pNorm * 3.0;
        const wobble = Math.sin(pNorm * Math.PI * 2) * 0.35;
        currentDeg = creep + wobble;
      } else {
        const pNorm = (progress - 0.96) / (1 - 0.96);
        const settle = 1 - Math.pow(1 - pNorm, 2);
        currentDeg = (pin5To75 + 1.8) + settle * (finalTargetAngle - (pin5To75 + 1.8));
      }

      setNeedleAngle(currentDeg);

      const normalizedAngle = (currentDeg % 360 + 360) % 360;
      const currentSlice = Math.floor((normalizedAngle + 22.5) / 45) % SLICES_SPIN_1.length;
      setActiveSliceIndex(currentSlice);

      const pinIndex = Math.floor((currentDeg + 22.5) / 45);
      if (pinIndex !== lastPinRef.current) {
        lastPinRef.current = pinIndex;
        const currentSpeedRatio = Math.max(0.04, 1 - progress);
        playTickSound(currentSpeedRatio);
        setPointerBounce(true);
        setTimeout(() => setPointerBounce(false), 40);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateNeedle);
      } else {
        setNeedleAngle(finalTargetAngle);
        setActiveSliceIndex(7); // 75% DESCUENTO
        setIsSpinning(false);
        setStep("win_75");
        playWinSound();
        fireConfetti();
      }
    };

    animFrameRef.current = requestAnimationFrame(animateNeedle);
  };

  // 2º GIRO (SEGUNDA CHANCE): Movimento 100% natural e contínuo parando em TODO X $8.000
  const handleSpin2 = () => {
    if (isSpinning || step !== "spin_2_prompt") return;
    setIsSpinning(true);
    getAudioContext();

    const startAngle = needleAngle; // Começa onde a agulha parou no 1º giro (298°)
    const turns = 5;
    // Pousa no centro da fatia 7 ("TODO X $8.000" a 315°)
    const finalTargetAngle = startAngle + turns * 360 + ((315 - (startAngle % 360) + 360) % 360);
    const spinDuration = 5800; // 5.8s natural e fluido
    const startTime = performance.now();
    lastPinRef.current = -1;

    const animateNeedle2 = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);

      // Desaceleração física suave e natural sem saltos
      const ease = 1 - Math.pow(1 - progress, 3.8);
      let currentDeg = startAngle + ease * (finalTargetAngle - startAngle);

      // Micro-acomodação amortecida no final
      if (progress > 0.96) {
        const settleP = (progress - 0.96) / 0.04;
        const damp = Math.exp(-settleP * 5) * Math.sin(settleP * Math.PI * 3);
        currentDeg += damp * 1.2;
      }

      setNeedleAngle(currentDeg);

      const normalizedAngle = (currentDeg % 360 + 360) % 360;
      const currentSlice = Math.floor((normalizedAngle + 22.5) / 45) % SLICES_SPIN_2.length;
      setActiveSliceIndex(currentSlice);

      const pinIndex = Math.floor((currentDeg + 22.5) / 45);
      if (pinIndex !== lastPinRef.current) {
        lastPinRef.current = pinIndex;
        const currentSpeedRatio = Math.max(0.04, 1 - progress);
        playTickSound(currentSpeedRatio);
        setPointerBounce(true);
        setTimeout(() => setPointerBounce(false), 40);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateNeedle2);
      } else {
        setNeedleAngle(finalTargetAngle);
        setActiveSliceIndex(7); // TODO X $8.000
        setIsSpinning(false);
        setStep("win_8k");
        playWinSound();
        fireConfetti();
      }
    };

    animFrameRef.current = requestAnimationFrame(animateNeedle2);
  };

  // Quando o usuário tenta fechar ou recusa o desconto de 75%:
  const handleReject75OrClose = () => {
    if (step === "spin_1" || step === "win_75") {
      // Abre a tela para rodar novamente pela 2ª vez
      setStep("spin_2_prompt");
    } else {
      // Se já está na 2ª chance ou no $8.000, fecha definitivamente
      setIsOpen(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen || disabled) return null;

  // Renderizar a Ruleta SVG com a agulha
  const renderSvgWheel = () => {
    const center = 160;
    const radius = 145;
    const numSlices = currentSlices.length;
    const sliceAngleDeg = 360 / numSlices;

    return (
      <svg viewBox="0 0 320 320" className="ruleta-svg-wheel">
        <defs>
          <radialGradient id="ruletaGoldHub" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff8db" />
            <stop offset="50%" stopColor="#e5ae52" />
            <stop offset="100%" stopColor="#a87114" />
          </radialGradient>
          <linearGradient id="ruletaNeedleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#fff2a8" />
            <stop offset="100%" stopColor="#aa820a" />
          </linearGradient>
          <filter id="ruletaNeedleShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Borde exterior oscuro e aro dourado */}
        <circle cx={center} cy={center} r={radius + 10} fill="#211914" />
        <circle cx={center} cy={center} r={radius + 6} fill="none" stroke="#e5ae52" strokeWidth="5" />

        {/* Fatias da Ruleta */}
        {currentSlices.map((slice, i) => {
          const thetaDeg = i * sliceAngleDeg;
          const a1Rad = ((thetaDeg - 22.5 - 90) * Math.PI) / 180;
          const a2Rad = ((thetaDeg + 22.5 - 90) * Math.PI) / 180;
          const x1 = center + radius * Math.cos(a1Rad);
          const y1 = center + radius * Math.sin(a1Rad);
          const x2 = center + radius * Math.cos(a2Rad);
          const y2 = center + radius * Math.sin(a2Rad);

          const pathData = `M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
          const isCurrentActive = activeSliceIndex === i;

          return (
            <g key={`${slice.text}-${i}`}>
              <path
                d={pathData}
                fill={slice.bgColor}
                stroke={isCurrentActive ? "#ffd54f" : "rgba(244, 240, 231, 0.35)"}
                strokeWidth={isCurrentActive ? "3.5" : "1.5"}
                style={{
                  filter: isCurrentActive ? "brightness(1.18)" : "none",
                  transition: "filter 0.12s ease, stroke 0.12s ease",
                }}
              />
              {/* Texto da fatia alinhado radialmente */}
              <g transform={`rotate(${thetaDeg - 90}, ${center}, ${center})`}>
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

        {/* Clavijas / Pinos divisores */}
        {currentSlices.map((_, i) => {
          const pinAngleDeg = i * sliceAngleDeg + 22.5 - 90;
          const pinRad = (pinAngleDeg * Math.PI) / 180;
          const px = center + (radius - 2) * Math.cos(pinRad);
          const py = center + (radius - 2) * Math.sin(pinRad);
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r="3.5"
              fill="#ffe082"
              stroke="#211914"
              strokeWidth="1.2"
            />
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

        {/* SETA / AGULHA GIRATÓRIA CENTRAL */}
        <g
          transform={`rotate(${needleAngle}, ${center}, ${center})`}
          filter="url(#ruletaNeedleShadow)"
        >
          <path
            d={`M ${center - 9} ${center} L ${center} 38 L ${center + 9} ${center} L ${center} ${center + 18} Z`}
            fill="url(#ruletaNeedleGrad)"
            stroke="#211914"
            strokeWidth="2"
          />
          <path
            d={`M ${center - 4} ${center} L ${center} 44 L ${center + 4} ${center} Z`}
            fill="#ffffff"
            opacity="0.65"
          />
          <circle cx={center} cy="46" r="5" fill="#ff1744" stroke="#fff" strokeWidth="1.2" />
        </g>

        {/* Centro da Ruleta (Buje dourado central) */}
        <circle cx={center} cy={center} r={26} fill="url(#ruletaGoldHub)" stroke="#211914" strokeWidth="2.5" />
        <circle cx={center} cy={center} r={12} fill="#c15542" />
      </svg>
    );
  };

  return (
    <div className="ruleta-overlay" role="dialog" aria-modal="true" aria-labelledby="ruleta-title">
      <canvas ref={confettiCanvasRef} className="ruleta-confetti-canvas" />

      <div className="ruleta-modal-card paper">
        {/* Botão de fechar (escondido na etapa de 2º giro e no prêmio de $8.000) */}
        {step !== "spin_2_prompt" && step !== "win_8k" && (
          <button
            type="button"
            onClick={handleReject75OrClose}
            className="ruleta-close-btn"
            aria-label="Cerrar ventana"
          >
            ✕
          </button>
        )}

        {step === "spin_1" && (
          /* ESTADO 1: PRIMER GIRO DE LA RULETA */
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
              <div className="ruleta-canvas-container">
                {renderSvgWheel()}
              </div>

              {/* Botón Central */}
              <button
                type="button"
                onClick={handleSpin1}
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
              onClick={handleSpin1}
              disabled={isSpinning}
              className={`button ruleta-cta-spin-btn ${isSpinning ? "spinning" : "pulse-glow"}`}
            >
              <span>{isSpinning ? "¡La aguja está girando..." : "👉 TOCAR AQUÍ PARA GIRAR LA RULETA"}</span>
              {!isSpinning && <b aria-hidden="true">🎰</b>}
            </button>

            <p className="ruleta-guarantee-note">
              🔒 Oferta 100% garantizada y válida solo para esta visita
            </p>
          </div>
        )}

        {step === "win_75" && (
          /* ESTADO 2: PREMIO DE 75% DESCUENTO GANADO */
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

            {/* Temporizador */}
            <div className="ruleta-timer-box">
              <span className="ruleta-timer-icon">⏳</span>
              <p>
                Tu descuento del 75% está reservado por:{" "}
                <strong className="ruleta-countdown">{formatTimer(timeLeft)}</strong>
              </p>
            </div>

            {/* Botón de Checkout */}
            <a
              href="/checkout/completa?descuento=75"
              onClick={() => setIsOpen(false)}
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
              onClick={handleReject75OrClose}
              className="ruleta-dismiss-link"
            >
              No gracias, prefiero perder mi descuento del 75%
            </button>
          </div>
        )}

        {step === "spin_2_prompt" && (
          /* ESTADO 3: SEGUNDA OPORTUNIDAD - OFRECER GIRAR NUEVAMENTE */
          <div className="ruleta-step-spin">
            <div className="ruleta-header-badge badge-second-chance">
              <span className="ruleta-alarm-icon">🔥</span>
              <span>¡ESPERA! TE DAMOS 1 ÚLTIMO GIRO EXTRA VIP</span>
            </div>

            <h2 id="ruleta-title" className="ruleta-headline">
              ¿Seguro que te vas? <em>¡Te regalamos un 2º Giro!</em>
            </h2>

            <p className="ruleta-subheadline">
              Desbloqueamos una <strong>oportunidad secreta de subsidio máximo</strong>. ¡Gira la ruleta una última vez y descubre tu precio final extremo!
            </p>

            {/* Contenedor de la Ruleta SVG para el 2º Giro */}
            <div className="ruleta-wheel-wrapper">
              <div className="ruleta-canvas-container">
                {renderSvgWheel()}
              </div>

              {/* Botón Central */}
              <button
                type="button"
                onClick={handleSpin2}
                disabled={isSpinning}
                className="ruleta-center-spin-btn btn-2nd-spin"
                aria-label="Girar ruleta por segunda vez"
              >
                {isSpinning ? "..." : "GIRAR 2"}
              </button>
            </div>

            {/* Botón Principal de Acción del 2º Giro */}
            <button
              type="button"
              onClick={handleSpin2}
              disabled={isSpinning}
              className={`button ruleta-cta-spin-btn btn-8k ${isSpinning ? "spinning" : "pulse-glow"}`}
            >
              <span>{isSpinning ? "¡Girando tu tiro extra VIP..." : "👉 ¡GIRAR RULETA POR SEGUNDA VEZ! (ÚLTIMO TIRO)"}</span>
              {!isSpinning && <b aria-hidden="true">🎰</b>}
            </button>
          </div>
        )}

        {step === "win_8k" && (
          /* ESTADO 4: PREMIO OBTENIDO EN EL 2º GIRO - $8.000 COP CON 7 BONOS */
          <div className="ruleta-step-downsell">
            <div className="ruleta-downsell-badge">
              <span>🎉 ¡PREMIO MÁXIMO EXTRA DESBLOQUEADO: $8.000 COP!</span>
            </div>

            <h2 className="ruleta-win-title">
              ¡FELICITACIONES! Te lo llevas todo por solo <em>$8.000 COP</em>
            </h2>

            <p className="ruleta-win-subtitle">
              ¡La ruleta se detuvo en el premio histórico! Te entregamos la <strong>Colección Completa + los 4 Bonos Oficiales + 3 BONOS EXTRA EXCLUSIVOS (7 bonos en total)</strong> por solo $8.000 pesos:
            </p>

            {/* Tarjeta de $8.000 con 7 Bonos */}
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
                  <span>Precio de oferta ruleta anterior:</span>
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

            {/* Botão ao Checkout de $8.000 com window.location.replace para não permitir voltar a esta tela */}
            <button
              type="button"
              onClick={() => {
                try { sessionStorage.setItem("conservas_promo_8k", "true"); } catch {}
                setIsOpen(false);
                window.location.replace("/checkout/completa?descuento=8k");
              }}
              className="button ruleta-checkout-cta-btn btn-8k"
            >
              <span>¡QUIERO TODO POR SOLO $8.000 COP!</span>
              <b aria-hidden="true">→</b>
            </button>

            <div className="ruleta-trust-row" style={{ marginTop: "14px", marginBottom: "4px" }}>
              <span>♢ Pago Seguro</span>
              <span>⚡ Acceso Inmediato</span>
              <span>↻ Garantía 30 Días</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
