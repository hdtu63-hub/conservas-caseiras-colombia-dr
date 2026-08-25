"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

export interface CardItem {
  imgUrl: string;
  alt?: string;
  linkUrl?: string;
}

interface SocialCardsProps {
  cards: CardItem[];
}

// 5 cards visíveis — com 8 imagens totais, pagina ciclicamente
const MAX_VISIBLE = 5;
const HALF = 2;

// Fan de 5 cards: bem espalhado e proporcional em todas as telas
const FAN_POSITIONS = [
  { rot: -26, scale: 0.76, x: -34, y: 7.0, zIndex: 1 },
  { rot: -13, scale: 0.88, x: -17, y: 2.2, zIndex: 3 },
  { rot: 0,   scale: 1.0,  x: 0,   y: 0.0, zIndex: 10 },
  { rot: 13,  scale: 0.88, x: 17,  y: 2.2, zIndex: 3 },
  { rot: 26,  scale: 0.76, x: 34,  y: 7.0, zIndex: 1 },
];

function getResponsiveMultiplier(width: number) {
  if (width < 380) return 0.40;
  if (width < 480) return 0.48;
  if (width < 640) return 0.60;
  if (width < 768) return 0.82;
  return 1.0;
}

export default function CardFanCarousel({ cards }: SocialCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const hasEntered = useRef(false);
  const directionRef = useRef<"left" | "right" | null>(null);
  const prevVisible = useRef<Set<number>>(new Set());

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const totalCards = cards.length;
  const [centerIndex, setCenterIndex] = useState(HALF);

  const getVisibleMap = useCallback((center: number) => {
    const map = new Map<number, number>();
    for (let slot = 0; slot < MAX_VISIBLE; slot++) {
      map.set(((center + slot - HALF) % totalCards + totalCards) % totalCards, slot);
    }
    return map;
  }, [totalCards]);

  const cycle = useCallback((direction: "left" | "right") => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    directionRef.current = direction;
    setCenterIndex(prev =>
      direction === "right" ? (prev + 1) % totalCards : (prev - 1 + totalCards) % totalCards
    );
  }, [totalCards]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      cycle(dx < 0 ? "right" : "left");
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [cycle]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !totalCards) return;

    const cardElements = Array.from(container.querySelectorAll<HTMLElement>(".fan-card"));
    if (!cardElements.length) return;

    const visibleMap = getVisibleMap(centerIndex);
    const previouslyVisible = prevVisible.current;
    const direction = directionRef.current;
    const isFirstMount = !hasEntered.current;
    const multiplier = getResponsiveMultiplier(window.innerWidth);

    if (isFirstMount) isAnimating.current = true;

    let completedCount = 0;
    const visibleCount = visibleMap.size;
    const onCardDone = () => {
      if (++completedCount >= visibleCount) {
        isAnimating.current = false;
        if (isFirstMount) hasEntered.current = true;
      }
    };

    cardElements.forEach((card, cardIndex) => {
      const slot = visibleMap.get(cardIndex);
      const wasVisible = previouslyVisible.has(cardIndex);

      if (slot !== undefined) {
        const { x, y, rot, scale, zIndex } = FAN_POSITIONS[slot];
        const target = {
          x: `${x * multiplier}rem`,
          y: `${y}rem`,
          rotation: rot,
          scale,
          opacity: 1,
          zIndex,
        };

        if (isFirstMount) {
          gsap.set(card, { x: 0, y: "10rem", rotation: 0, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 1.15, ease: "elastic.out(1.05,.78)", delay: 0.10 + slot * 0.07, onComplete: onCardDone });
        } else if (!wasVisible) {
          const enterX = direction === "right" ? 42 : -42;
          gsap.set(card, { x: `${enterX}rem`, y: `${y}rem`, rotation: direction === "right" ? 32 : -32, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 0.55, ease: "power2.out", onComplete: onCardDone });
        } else {
          gsap.to(card, { ...target, duration: 0.45, ease: "power2.out", onComplete: onCardDone });
        }
      } else if (wasVisible) {
        const exitX = direction === "right" ? -42 : 42;
        gsap.to(card, { x: `${exitX}rem`, opacity: 0, scale: 0.5, rotation: direction === "right" ? -32 : 32, duration: 0.35, ease: "power2.in", zIndex: 0 });
      } else if (isFirstMount) {
        gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
      }
    });

    prevVisible.current = new Set(visibleMap.keys());

    // Hover interactions (desktop)
    const visibleEntries: { el: HTMLElement; slot: number }[] = [];
    cardElements.forEach((el, i) => {
      const slot = visibleMap.get(i);
      if (slot !== undefined) visibleEntries.push({ el, slot });
    });
    visibleEntries.sort((a, b) => a.slot - b.slot);

    let activeSlot: number | null = null;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;

    const updateHoverLayout = (hoveredSlot: number | null) => {
      const mult = getResponsiveMultiplier(window.innerWidth);
      visibleEntries.forEach(({ el, slot }) => {
        const base = FAN_POSITIONS[slot];
        let targetX = base.x * mult;
        let targetY = base.y;
        let targetRot = base.rot;
        let targetScale = base.scale;
        let delay = 0;

        if (hoveredSlot !== null) {
          const distance = Math.abs(slot - hoveredSlot);
          delay = distance * 0.025;
          if (slot === hoveredSlot) {
            targetY -= 2.5;
            targetScale *= 1.08;
          } else {
            const pushStrength = 8 / (distance + 0.6);
            if (slot < hoveredSlot) { targetX -= pushStrength * mult; targetRot -= 4 / (distance + 1); }
            else { targetX += pushStrength * mult; targetRot += 4 / (distance + 1); }
          }
        } else {
          delay = Math.abs(slot - HALF) * 0.025;
        }

        gsap.to(el, {
          x: `${targetX}rem`, y: `${targetY}rem`, rotation: targetRot, scale: targetScale,
          duration: 0.5, delay, ease: "elastic.out(1,.75)", overwrite: "auto",
        });
        gsap.set(el, { zIndex: base.zIndex });
      });
    };

    const enterHandlers = visibleEntries.map(({ el, slot }) => {
      const handler = () => {
        if (isAnimating.current) return;
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        if (activeSlot !== slot) { activeSlot = slot; updateHoverLayout(slot); }
      };
      el.addEventListener("mouseenter", handler);
      return { el, handler };
    });

    const onMouseLeave = () => {
      if (isAnimating.current) return;
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { activeSlot = null; updateHoverLayout(null); }, 50);
    };
    container.addEventListener("mouseleave", onMouseLeave);

    const onResize = () => { if (!isAnimating.current) updateHoverLayout(activeSlot); };
    window.addEventListener("resize", onResize);

    return () => {
      enterHandlers.forEach(({ el, handler }) => el.removeEventListener("mouseenter", handler));
      container.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [centerIndex, totalCards, getVisibleMap]);

  if (!totalCards) return null;

  return (
    <div className="fan-carousel-section">
      <div
        className="fan-carousel-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={containerRef} className="fan-carousel-container">
          {cards.map((card, index) => {
            const image = (
              <div className="fan-card-inner">
                <img
                  src={card.imgUrl}
                  loading="lazy"
                  alt={card.alt || `Testimonio ${index + 1}`}
                  className="fan-card-img"
                />
              </div>
            );
            return card.linkUrl ? (
              <a key={index} href={card.linkUrl} className="fan-card fan-card-link">{image}</a>
            ) : (
              <div key={index} className="fan-card">{image}</div>
            );
          })}
        </div>
      </div>

      <div className="fan-carousel-controls">
        <button className="fan-arrow-btn" onClick={() => cycle("left")} aria-label="Anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="fan-dots">
          {cards.map((_, i) => (
            <span key={i} className={`fan-dot ${i === centerIndex ? "fan-dot-active" : ""}`} />
          ))}
        </div>
        <button className="fan-arrow-btn" onClick={() => cycle("right")} aria-label="Siguiente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
