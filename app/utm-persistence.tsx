"use client";

import { useEffect } from "react";

const STORAGE_KEY = "conservas_utm_params";
const PIXEL_FLUSH_DELAY_MS = 250;
const TRACKING_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "src",
  "sck",
  "fbclid",
  "gclid",
  "ttclid",
];

function readStoredParameters() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function collectTrackingParameters() {
  const stored = readStoredParameters();
  const current = new URLSearchParams(window.location.search);

  for (const key of TRACKING_PARAMETERS) {
    const value = current.get(key);
    if (value) stored[key] = value;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // The current URL parameters still work when storage is unavailable.
  }

  return stored;
}

function decorateCheckoutLink(anchor: HTMLAnchorElement, parameters: Record<string, string>) {
  const url = new URL(anchor.href, window.location.href);
  if (url.hostname !== "pay.hotmart.com") return;

  for (const [key, value] of Object.entries(parameters)) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }

  const decoratedUrl = url.toString();
  if (anchor.href !== decoratedUrl) anchor.href = decoratedUrl;
}

function trackInitiateCheckout(params: Record<string, string> = {}) {
  type FbqFn = (...args: unknown[]) => void;
  const w = window as Window & { fbq?: FbqFn; _fbq?: FbqFn };
  const fbq = w.fbq ?? w._fbq;

  if (typeof fbq === "function") {
    fbq("track", "InitiateCheckout", params);
    return true;
  }

  return false;
}

export default function UtmPersistence() {
  useEffect(() => {
    const parameters = collectTrackingParameters();
    const decorateAllLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>('a[href*="pay.hotmart.com"]').forEach((anchor) => {
        decorateCheckoutLink(anchor, parameters);
      });
    };

    decorateAllLinks();

    const observer = new MutationObserver(decorateAllLinks);
    observer.observe(document.body, { childList: true, subtree: true });

    const handleCheckoutClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="pay.hotmart.com"]');
      if (anchor) {
        decorateCheckoutLink(anchor, collectTrackingParameters());
        const eventQueued = trackInitiateCheckout(collectTrackingParameters());
        const isSameTabNavigation = event.button === 0
          && !event.metaKey
          && !event.ctrlKey
          && !event.shiftKey
          && !event.altKey
          && anchor.target !== "_blank";

        if (eventQueued && isSameTabNavigation) {
          event.preventDefault();
          const checkoutUrl = anchor.href;
          window.setTimeout(() => window.location.assign(checkoutUrl), PIXEL_FLUSH_DELAY_MS);
        }
      }
    };

    document.addEventListener("click", handleCheckoutClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleCheckoutClick, true);
    };
  }, []);

  return null;
}
