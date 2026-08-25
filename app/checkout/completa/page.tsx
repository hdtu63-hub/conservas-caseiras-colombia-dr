import CheckoutClient from "../checkout-client";

export default function CheckoutCompleta() {
  return (
    <CheckoutClient
      edition="completa"
      title="Colección Completa de Conservas"
      price="$28.000"
      originalPrice="$149.000"
      savings="$121.000"
      bannerImage="/images/banners/banner-checkout-28k.webp"
      image="/images/materials/01-guia-completa.jpg"
      features={[
        "Todo lo incluido en la Edición Esencial",
        "Videoclases prácticas paso a paso",
        "Recetas de pimentones y ajíes artesanales",
        "Tabla práctica de costos y cálculo de precios",
        "Guías completas para vender tus conservas",
        "Materiales sobre márgenes y ganancias",
        "4 bonos exclusivos incluidos gratis hoy",
        "Actualizaciones futuras de por vida gratis",
        "Acceso digital ilimitado e inmediato",
      ]}
      bonuses={[
        "Manual de etiquetas listas para conservas",
        "Guía Ganancias en un Frasco",
        "Mermeladas Artesanales y Sabores Especiales",
        "Guía práctica de conservación y cuidados",
      ]}
    />
  );
}


