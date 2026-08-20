import type { Metadata } from "next";
import "./globals.css";
import UtmPersistence from "./utm-persistence";

export const metadata: Metadata = {
  title: "Conservas Caseras · 100+ Recetas Rentables",
  description: "Aprende a preparar conservas caseras con más de 100 recetas rentables, guías de almacenamiento, costos, precios y ventas.",
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
      <script dangerouslySetInnerHTML={{ __html: `
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
      ` }} />
      <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" async defer data-utmify-prevent-subids="" />
    </head>
    <body>
      <noscript><img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=1832021307783603&ev=PageView&noscript=1" alt="" /></noscript>
      <UtmPersistence />
      {children}
    </body>
  </html>;
}
