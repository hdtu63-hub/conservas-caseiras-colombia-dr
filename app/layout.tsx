import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import UtmPersistence from "./utm-persistence";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Conservas Caseras · 100+ Recetas Rentables",
  description: "Aprende a preparar conservas caseras con más de 100 recetas rentables, guías de almacenamiento, costos, precios y ventas.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Conservas Caseras · 100+ Recetas Rentables",
    description: "Prepara, conserva y vende productos artesanales desde casa.",
    images: [{ url: "/og-conservas.png", width: 1536, height: 911, alt: "Conservas Caseras · 100+ Recetas Rentables" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-conservas.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-419">
    <body className={`${dmSans.variable} ${fraunces.variable}`}>
      {/* Synchronous Pixel Queue Stub + Non-blocking Script Download */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          // 1. Initialize Meta Pixel Queue synchronously so fbq() is always available immediately
          if (!window.fbq) {
            var n = window.fbq = function() {
              n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!window._fbq) window._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
          }

          // 2. Queue standard events immediately
          fbq('init', '1832021307783603');
          fbq('track', 'PageView');
          fbq('track', 'ViewContent', {
            content_name: 'Colección de Conservas Caseras',
            content_category: 'Producto digital',
            content_ids: ['conservas-caseras'],
            content_type: 'product'
          });

          // 3. Defer the heavy script download (fbevents.js & utmify) to idle time or first user interaction
          var loaded = false;
          function loadScripts() {
            if (loaded) return;
            loaded = true;

            // Load Meta fbevents.js
            var fbScript = document.createElement('script');
            fbScript.async = true;
            fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
            document.head.appendChild(fbScript);

            // Load UTMify
            var utmScript = document.createElement('script');
            utmScript.async = true;
            utmScript.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js';
            utmScript.setAttribute('data-utmify-prevent-subids', '');
            document.head.appendChild(utmScript);
          }

          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadScripts, { timeout: 2000 });
          } else {
            setTimeout(loadScripts, 1500);
          }

          var events = ['mousemove', 'touchstart', 'scroll', 'keydown', 'click'];
          function onInteract() {
            loadScripts();
            events.forEach(function(e) { window.removeEventListener(e, onInteract, { passive: true }); });
          }
          events.forEach(function(e) { window.addEventListener(e, onInteract, { passive: true, once: true }); });
        })();
      ` }} />

      <noscript><img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=1832021307783603&ev=PageView&noscript=1" alt="" /></noscript>
      <UtmPersistence />
      {children}
    </body>
  </html>;
}
