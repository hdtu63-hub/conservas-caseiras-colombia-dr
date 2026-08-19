import CheckoutClient from "../checkout-client";

export default function CheckoutCompleta() {
  return (
    <CheckoutClient
      edition="completa"
      title="Colección Completa de Conservas"
      price="$28.000"
      features={[
        "Todo lo incluido en la Edición Esencial",
        "Videoclases paso a paso",
        "Recetas de pimentones y ajíes artesanales",
        "Tabla práctica de costos y precios",
        "Guías para vender tus conservas",
        "Materiales sobre precios y ganancias",
        "4 bonos incluidos",
        "Actualizaciones futuras gratis",
        "Acceso de por vida",
      ]}
    />
  );
}
