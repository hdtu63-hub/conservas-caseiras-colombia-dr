"use client";
import { useState, useEffect } from "react";

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

  // Backredirect & Exit Intent Setup (Impede voltar no celular e abre o modal de urgência)
  useEffect(() => {
    if (typeof window === "undefined" || disabled) return;

    // Inserir múltiplos estados no histórico para criar uma barreira intransponível
    const pushBackState = () => {
      try {
        window.history.pushState({ isBackBlocked: true, t: Date.now() }, "", window.location.href);
      } catch {}
    };

    // Push inicial duplo
    pushBackState();
    setTimeout(pushBackState, 150);

    // No iPhone (iOS Safari) e Android, reforça a barreira ao primeiro toque/scroll/clique
    const armTrigger = () => {
      pushBackState();
    };

    window.addEventListener("touchstart", armTrigger, { passive: true });
    window.addEventListener("scroll", armTrigger, { passive: true });
    window.addEventListener("click", armTrigger, { passive: true });

    // Interceptar o botão voltar do celular (Android e iOS Safari)
    const handlePopState = (e: PopStateEvent) => {
      e?.preventDefault?.();
      setIsOpen(true);
      pushBackState();
    };
    window.addEventListener("popstate", handlePopState);

    // BFCache do Safari no iOS (gesto de swipe para voltar)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        pushBackState();
        setIsOpen(true);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    // Exit Intent no Desktop (mouse saindo pelo topo)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        setIsOpen(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("touchstart", armTrigger);
      window.removeEventListener("scroll", armTrigger);
      window.removeEventListener("click", armTrigger);
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
      const paymentSection =
        document.querySelector(".payment-instructions-box") ||
        document.querySelector(".upload-section-wrapper") ||
        document.querySelector(".checkout-payment-wrapper");
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

        {/* CTA Principal - NÃO há botão para sair ou recusar */}
        <button
          type="button"
          onClick={handleAction}
          className="urgency-cta-btn button"
        >
          <span>👉 ¡FINALIZAR MI PAGO AHORA POR $8.000 COP!</span>
          <b aria-hidden="true">→</b>
        </button>

        <p className="urgency-footer-note">
          🔒 Tu cupón se mantiene reservado mientras completas tu transferencia en Nequi / Bre-B.
        </p>
      </div>
    </div>
  );
}
