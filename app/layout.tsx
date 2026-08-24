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
    <head>
      <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://connect.facebook.net" />
      <link rel="preload" as="image" href="/images/especialista-conservas.webp" type="image/webp" fetchPriority="high" />
    </head>
    <body className={`${dmSans.variable} ${fraunces.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var loaded = false;
          function initThirdParty() {
            if (loaded) return;
            loaded = true;
            
            // Facebook Pixel
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','1832021307783603');
            fbq('track','PageView');
            fbq('track','ViewContent', {
              content_name: 'Colección de Conservas Caseras',
              content_category: 'Producto digital',
              content_ids: ['conservas-caseras'],
              content_type: 'product'
            });

            // UTMify
            var u = document.createElement('script');
            u.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js';
            u.async = true;
            u.setAttribute('data-utmify-prevent-subids', '');
            document.head.appendChild(u);
          }

          var events = ['mousemove', 'touchstart', 'scroll', 'keydown', 'click'];
          function trigger() {
            initThirdParty();
            events.forEach(function(e) { window.removeEventListener(e, trigger, { passive: true }); });
          }
          events.forEach(function(e) { window.addEventListener(e, trigger, { passive: true, once: true }); });
          setTimeout(initThirdParty, 3500);
        })();
      ` }} />
      <noscript><img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=1832021307783603&ev=PageView&noscript=1" alt="" /></noscript>
      <UtmPersistence />
      {children}
    </body>
  </html>;
}
