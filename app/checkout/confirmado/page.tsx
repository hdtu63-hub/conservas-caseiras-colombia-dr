"use client";
import { useEffect, useState } from "react";

export default function Confirmado() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <main className={`confirmado-page paper ${show ? "visible" : ""}`}>
      <div className="confirmado-container">
        <div className="confirmado-check">
          <svg viewBox="0 0 52 52" className="checkmark-svg">
            <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="checkmark-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>

        <h1>¡Gracias por tu pago!</h1>
        <p className="confirmado-sub">Tu compra ha sido verificada correctamente.</p>
        <p className="confirmado-detail">Accede a tu producto completo abajo. Tu acceso es de por vida.</p>

        <p style={{ color: "#d32f2f", fontWeight: "bold", marginTop: "16px", padding: "12px", border: "1px solid #d32f2f", borderRadius: "8px", backgroundColor: "#fff5f5", fontSize: "14px" }}>
          ⚠️ GUARDA ESTA PÁGINA EN TUS FAVORITOS PARA NO PERDER TU ACCESO AL MATERIAL
        </p>

        <a
          href="https://conservas-caseras.lovable.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="confirmado-btn button"
        >
          Accede a tu producto aquí <b aria-hidden="true">→</b>
        </a>

        <div className="confirmado-trust">
          <span>✓ Compra verificada</span>
          <span>∞ Acceso de por vida</span>
          <span>♢ Entrega inmediata</span>
        </div>
      </div>
    </main>
  );
}
