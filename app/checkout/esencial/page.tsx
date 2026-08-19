import CheckoutClient from "../checkout-client";

export default function CheckoutEsencial() {
  return (
    <CheckoutClient
      edition="esencial"
      title="Guía Esencial de Conservas"
      price="$20.000"
      features={[
        "100+ recetas para preparar y vender",
        "30 recetas fáciles para empezar",
        "Conservas especiales",
        "Almacenamiento y conservación",
        "Acceso de por vida",
      ]}
    />
  );
}
