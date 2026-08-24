"use client";
import { useEffect } from "react";

export default function Tracker() {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page_view" }),
    }).catch(() => {});

    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (href === "/checkout/esencial" || href === "/checkout/completa") {
        const edition = href === "/checkout/esencial" ? "esencial" : "completa";
        const title = edition === "esencial" ? "Guía Esencial de Conservas" : "Colección Completa de Conservas";
        const value = edition === "esencial" ? 20000 : 28000;

        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: `click_${edition}` }),
        }).catch(() => {});

        if (typeof window !== "undefined" && (window as any).fbq) {
          let utms = {};
          try { utms = JSON.parse(window.localStorage.getItem("conservas_utm_params") || "{}"); } catch(e){}
          (window as any).fbq("track", "InitiateCheckout", {
            content_name: title,
            currency: "COP",
            value: value,
            ...utms
          });
        }
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
