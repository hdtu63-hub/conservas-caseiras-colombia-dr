"use client";
import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Notiflix?: {
      Notify: {
        Init: (options: Record<string, unknown>) => void;
        Success: (message: string, options?: Record<string, unknown>) => void;
        Info: (message: string, options?: Record<string, unknown>) => void;
        Failure: (message: string, options?: Record<string, unknown>) => void;
        Warning: (message: string, options?: Record<string, unknown>) => void;
      };
    };
  }
}

const names_fem = [
  "María Camila",
  "Valentina",
  "Carolina",
  "Paula",
  "Mariana",
  "Daniela",
  "Sofía",
  "Laura",
  "Natalia",
  "Catalina",
  "Juliana",
  "Andrea",
  "Diana",
  "Marcela",
  "Sandra",
  "Claudia",
  "Gloria",
  "Patricia",
  "Adriana",
  "Esperanza",
  "Beatriz",
  "Luz Marina",
  "Martha",
  "Ana María",
  "Luisa",
  "Gabriela",
  "Paola",
  "Yolanda",
  "Stella",
  "Carmen",
  "Clara",
  "Mónica",
  "Rosa",
  "Liliana",
  "Lucía",
  "Lorena",
  "Angie",
  "Tatiana",
  "Maritza",
  "Ximena",
  "Dayana",
  "Estefanía",
  "Lina",
  "Leidy",
];

const names_masc = [
  "Juan Carlos",
  "Andrés",
  "Santiago",
  "Mateo",
  "Alejandro",
  "Felipe",
  "Sebastián",
  "Daniel",
  "Diego",
  "David",
  "Carlos Mario",
  "José Luis",
  "Nicolás",
  "Esteban",
  "Javier",
  "Gabriel",
  "Camilo",
  "Mauricio",
  "Fernando",
  "Julián",
  "Jorge",
  "Ricardo",
  "Héctor",
  "Guillermo",
  "Fabio",
  "Álvaro",
  "Óscar",
  "Hernán",
  "Wilson",
  "Rodrigo",
];

const cities = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Bucaramanga",
  "Pereira",
  "Manizales",
  "Cartagena",
  "Cúcuta",
  "Ibagué",
  "Villavicencio",
  "Santa Marta",
  "Pasto",
  "Armenia",
  "Montería",
  "Tunja",
];

const phrases = [
  "acaba de adquirir la Colección de Conservas Caseras",
  "adquirió la Colección Completa con los 4 Bonos",
  "acaba de unirse a las +100 Recetas de Conservas",
  "adquirió la Guía de Conservas Caseras",
];

export default function SocialProof() {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    function startNotifications() {
      if (!window.Notiflix?.Notify) {
        timeoutId = setTimeout(startNotifications, 500);
        return;
      }

      window.Notiflix.Notify.Init({
        position: "left-bottom",
        cssAnimationStyle: "from-left",
        plainText: false,
        timeout: 4000,
        success: {
          background: "#145d3d",
          textColor: "#ffffff",
          childClassName: "notiflix-notify-success",
          notiflixIconColor: "#ffffff",
        },
      });

      function showNotification() {
        if (!window.Notiflix?.Notify) return;

        // 75% female, 25% male
        const isFem = Math.random() < 0.75;
        const name = isFem
          ? names_fem[Math.floor(Math.random() * names_fem.length)]
          : names_masc[Math.floor(Math.random() * names_masc.length)];

        const city = cities[Math.floor(Math.random() * cities.length)];
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];

        const message = `<strong>${name}</strong> (${city}) ${phrase}`;

        window.Notiflix.Notify.Success(message, {
          position: "left-bottom",
          cssAnimationStyle: "from-left",
          plainText: false,
          timeout: 4000,
        });

        // Random interval between 5 and 18 seconds
        const rand = Math.floor(Math.random() * (18 - 5 + 1) + 5);
        timeoutId = setTimeout(showNotification, rand * 1000);
      }

      // First notification after 4 seconds
      timeoutId = setTimeout(showNotification, 4000);
    }

    startNotifications();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/notiflix@2.6.0/dist/notiflix-aio-2.6.0.min.js"
      strategy="lazyOnload"
    />
  );
}
