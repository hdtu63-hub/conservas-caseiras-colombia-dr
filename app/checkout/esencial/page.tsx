import CheckoutClient from "../checkout-client";

export default function CheckoutEsencial() {
  return (
    <CheckoutClient
      edition="esencial"
      title="Guía Esencial de Conservas"
      price="$20.000"
      originalPrice="$89.000"
      savings="$69.000"
      image="/images/materials/03-recetas-seleccionadas.jpg"
      features={[
        "100+ recetas probadas para preparar y vender",
        "30 recetas fáciles y rápidas para empezar",
        "Técnicas de esterilización segura de frascos",
        "Guía de almacenamiento y conservación duradera",
        "Acceso digital ilimitado e inmediato",
      ]}
    />
  );
}

