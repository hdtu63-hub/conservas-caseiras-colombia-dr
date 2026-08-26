"use client";

import { useEffect } from "react";

const STORAGE_KEY = "conservas_utm_params";
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

export function readStoredParameters(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function collectTrackingParameters(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const stored = readStoredParameters();
  const current = new URLSearchParams(window.location.search);

  for (const key of TRACKING_PARAMETERS) {
    const value = current.get(key);
    if (value) stored[key] = value;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {}

  return stored;
}

function decorateCheckoutLink(anchor: HTMLAnchorElement, parameters: Record<string, string>) {
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin && !url.hostname.includes("hotmart.com")) return;

    if (url.pathname.startsWith("/checkout") || url.hostname.includes("hotmart.com")) {
      for (const [key, value] of Object.entries(parameters)) {
        if (value && !url.searchParams.has(key)) {
          url.searchParams.set(key, value);
        }
      }
      const decoratedUrl = url.toString();
      if (anchor.href !== decoratedUrl) anchor.href = decoratedUrl;
    }
  } catch {}
}

export default function UtmPersistence() {
  useEffect(() => {
    const parameters = collectTrackingParameters();
    const decorateAllLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/checkout"], a[href*="hotmart.com"]').forEach((anchor) => {
        decorateCheckoutLink(anchor, parameters);
      });
    };

    decorateAllLinks();
    const observer = new MutationObserver(decorateAllLinks);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
