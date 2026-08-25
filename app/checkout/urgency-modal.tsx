"use client";
import { useState, useEffect, useRef } from "react";

interface UrgencyModalProps {
  disabled?: boolean;
  onFinalize?: () => void;
}

export default function UrgencyModal({ disabled, onFinalize }: UrgencyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(180); // 3 minutos de urgência

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Backredirect & Exit Intent Setup (Impede voltar e abre o modal de tempo esgotando)
  useEffect(() => {
    if (typeof window === "undefined" || disabled) return;

    let isInternalNav = false;

    // Detectar cliques em links internos para não disparar
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a, button");
      if (target) {
        isInternalNav = true;
        setTimeout(() => { isInternalNav = false; }, 1000);
      }
    };
    document.addEventListener("click", handleLinkClick, true);

    // Inserir estado no histórico e reforçar
    const pushBackState = () => {
      try {
        window.history.pushState({ isBackBlocked: true, time: Date.now() }, "", window.location.href);
      } catch {}
    };

    pushBackState();

    const armOnTouch = () => { pushBackState(); };
    window.addEventListener("touchstart", armOnTouch, { passive: true, once: true });
    window.addEventListener("scroll", armOnTouch, { passive: true, once: true });

    // Interceptar o botão voltar do navegador / celular
    const handlePopState = (e: PopStateEvent) => {
      e?.preventDefault?.();
      if (isInternalNav) {
        isInternalNav = false;
        pushBackState();
        return;
      }
      setIsOpen(true);
      pushBackState();
    };
    window.addEventListener("popstate", handlePopState);

    // BFCache do Safari no iOS
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        pushBackState();
        setIsOpen(true);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    // Exit Intent no Desktop
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        setIsOpen(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("touchstart", armOnTouch);
      window.removeEventListener("scroll", armOnTouch);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [disabled]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleAction = () => {
    setIsOpen(false);
    if (onFinalize) {
      onFinalize();
    } else {
      // Rolar suavemente até as instruções de pagamento
      const paymentSection = document.querySelector(".payment-instructions-box") || document.querySelector(".upload-section-wrapper");
      if (paymentSection) {
        paymentSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="urgency-overlay" role="dialog" aria-modal="true">
      <div className="urgency-modal-card">
        
        {/* Header de Alerta */}
        <div className="urgency-alert-badge">
          <span className="urgency-icon-pulse">🚨</span>
          <span>¡ALERTA DE DESCUENTO POR EXPIRAR!</span>
        </div>

        <h2 className="urgency-headline">
          ¡Tu tiempo de descuento de <em>$8.000 COP</em> se está acabando!
        </h2>

        {/* Timer de Urgência */}
        <div className="urgency-timer-wrap">
          <span className="urgency-timer-label">Tu cupón subsidiado expira en:</span>
          <div className="urgency-timer-digits">
            <span>{formatTime(secondsLeft)}</span>
          </div>
        </div>

        <p className="urgency-desc">
          Si sales de esta página ahora, <strong>este precio subsidiado de $8.000 COP se cancelará definitivamente</strong> y el valor volverá al precio regular de <strong>$208.000 COP</strong>.
        </p>

        {/* Resumo do que está incluído */}
        <div className="urgency-recap-box">
          <p className="urgency-recap-title">🎁 Finaliza ahora y recibe todo el material completo:</p>
          <ul className="urgency-recap-list">
            <li>✓ <strong>Colección Completa de Conservas</strong> (100+ recetas rentables)</li>
            <li>✓ <strong>Videoclases prácticas</strong> paso a paso</li>
            <li>✓ <strong>7 Bonos VIP Exclusivos</strong> incluidos gratis</li>
            <li>✓ <strong>Acceso vitalicio e ilimitado</strong> con garantía de 30 días</li>
          </ul>
          <div className="urgency-price-tag">
            <span>Total a transferir:</span>
            <strong>$8.000 COP</strong>
            <del>$208.000</del>
          </div>
        </div>

        {/* CTA Principal */}
        <button
          type="button"
          onClick={handleAction}
          className="urgency-cta-btn button"
        >
          <span>¡Finalizar mi pago ahora por $8.000 COP!</span>
          <b aria-hidden="true">→</b>
        </button>

        <p className="urgency-footer-note">
          🔒 Tu cupón se mantiene reservado mientras completas tu transferencia en Nequi / Bre-B.
        </p>
      </div>
    </div>
  );
}
