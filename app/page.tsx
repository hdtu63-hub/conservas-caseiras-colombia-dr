import Tracker from "./tracker";
import Image from "next/image";
import ReactDOM from "react-dom";
import RuletaModal from "./ruleta-modal";
import CardFanCarousel from "./card-fan-carousel";

const SOCIAL_CARDS = [
  { imgUrl: "/images/social/01-marthalucia.jpg", alt: "Martha Lucía Pérez — conservas en ensaladas, carnes y desayunos" },
  { imgUrl: "/images/social/02-mafe.jpg", alt: "Mafe cocina fácil — ingredientes sencillos que ya compro" },
  { imgUrl: "/images/social/03-yuli.jpg", alt: "Yuli casera — recetas prácticas para el fin de semana" },
  { imgUrl: "/images/social/04-cataideas.jpg", alt: "Cata ideas en casa — videos, guías y bonos" },
  { imgUrl: "/images/social/05-paola.jpg", alt: "Paola Ramírez — preparo y conservo correctamente" },
];

const benefits = [
  ["Empieza desde cero", "Aprende preparación, esterilización, envasado y conservación paso a paso."],
  ["30 recetas fáciles para empezar", "Una selección práctica para dar tus primeros pasos sin sentirte abrumada."],
  ["100+ recetas para preparar y vender", "Descubre una amplia variedad de conservas para disfrutar en casa, regalar o convertir en productos para vender."],
  ["Aprende a conservar correctamente", "Almacenamiento, tiempos, etiquetado y cuidados esenciales para cada preparación."],
  ["Ponle el precio correcto a cada frasco", "Calcula tus costos, define tu margen y descubre cuánto cobrar por cada frasco."],
  ["Convierte frascos en ingresos", "Organiza tu producción, presenta tus conservas y aprende a ofrecerlas para conseguir tus primeros clientes."],
];

const modules = [
  ["I", "Fundamentos", "Empieza correctamente desde cero"],
  ["II", "Esterilización", "Prepara tus frascos correctamente"],
  ["III", "100+ recetas", "Dulces, saladas y combinaciones especiales"],
  ["IV", "Pimentones y ajíes", "Recetas y combinaciones artesanales"],
  ["V", "Costos, precios y venta", "Descubre cuánto cobrar por cada frasco"],
  ["VI", "Almacenamiento", "Almacena y conserva correctamente"],
];

const deliverables = [
  ["Guía Completa de Conservas Caseras", "/images/materials/01-guia-completa.jpg"],
  ["Más de 100 recetas rentables", "/images/materials/02-recetas-rentables.jpg"],
  ["30 recetas seleccionadas para comenzar", "/images/materials/03-recetas-seleccionadas.jpg"],
  ["Conservas Caseras Especiales", "/images/materials/04-conservas-especiales.jpg"],
  ["Recetas de pimentones y ajíes artesanales", "/images/materials/05-pimentones-ajies.jpg"],
  ["Recetas variadas para preparar en casa o vender", "/images/materials/06-recetas-variadas.jpg"],
  ["Guía de Almacenamiento y Conservación", "/images/materials/07-almacenamiento.jpg"],
  ["Manual de etiquetas listas para conservas", "/images/materials/08-etiquetas.jpg"],
  ["Guía de esterilización de frascos", "/images/materials/09-esterilizacion.jpg"],
  ["Cómo calcular el precio de cada conserva", "/images/materials/10-calcular-precio.jpg"],
  ["Cómo vender mermeladas y conservas", "/images/materials/11-vender-mermeladas.jpg"],
  ["Guía de ventas para conservas artesanales", "/images/materials/12-guia-ventas.jpg"],
  ["Guía de precios y ganancias", "/images/materials/13-precios-ganancias.jpg"],
];

const bonuses = [
  { title: "Mermeladas Artesanales", label: "BONO 01", value: "$28.000", image: "/images/bonuses/04-produciendo-mermeladas.jpg", description: "Amplía tu repertorio aprendiendo a preparar mermeladas artesanales con diferentes sabores, texturas y presentaciones." },
  { title: "Tabla práctica de Costos y Precios", label: "BONO 02", value: "$23.000", image: "/images/bonuses/02-costos-precios.jpg", description: "Organiza tus costos, calcula tu margen y llega al precio de venta de cada producto con mayor facilidad." },
  { title: "Ganancias en un Frasco", label: "BONO 03", value: "$19.000", image: "/images/bonuses/03-ganancias-frasco.jpg", description: "Una guía para dar el siguiente paso: pasar de preparar conservas para casa a organizarlas como productos para vender." },
  { title: "Guía práctica para conservar mejor tus productos", label: "BONO 04", value: "$19.000", image: "/images/bonuses/01-conservar-mejor.jpg", description: "Una referencia rápida con cuidados para preservar mejor el sabor, la textura y la calidad de tus preparaciones." },
];

const testimonials = [
  ["/images/testimonials/01-carolina.jpg", "Carolina Méndez", "Bogotá · Colombia", "Nunca había hecho conservas y me daba miedo el tema de la esterilización. Empecé con la mermelada de fresa y me salió muy bien. La explicación está tan clara que me dio seguridad desde el primer frasco."],
  ["/images/testimonials/02-paula.jpg", "Paula Santos", "Medellín · Colombia", "Comencé con tres recetas para probar en casa y terminé preparando frascos para mi familia y mis vecinas. Todo está explicado de forma sencilla y fácil de seguir."],
  ["/images/testimonials/03-mariana.jpg", "Mariana Castro", "Cali · Colombia", "La tabla de costos fue lo que más me ayudó. Yo sabía preparar, pero no sabía cuánto cobrar. Ahora ya tengo claro cuánto gasto, cuánto gano y cómo ponerle precio a cada frasco."],
  ["/images/testimonials/04-fernanda.jpg", "Fernanda Ríos", "Barranquilla · Colombia", "Me encantaron las recetas de pimentones y ajíes. Quedan deliciosas, se ven hermosas en el frasco y varias personas ya me preguntaron si las vendo."],
  ["/images/testimonials/05-beatriz.jpg", "Beatriz Álvarez", "Cartagena · Colombia", "Nunca había preparado conservas y pensé que iba a ser complicado. Pero empecé con las recetas para principiantes y pude seguir todo sin problema. Ya tengo varios frascos listos en mi cocina."],
  ["/images/testimonials/06-ana.jpg", "Ana Rodríguez", "Bucaramanga · Colombia", "Lo que más me gustó es que no es solo un recetario. También aprendí sobre almacenamiento, etiquetas y venta. Me ahorró muchísimo tiempo de búsqueda y pruebas por mi cuenta."],
  ["/images/testimonials/07-diana.jpg", "Diana Emprende", "Pereira · Colombia", "Comencé pensando en ganar un dinerito extra y ahora tengo clientes que vuelven a pedirme. Hay días en que preparo y ya tengo varios frascos encargados antes de terminarlos."],
  ["/images/testimonials/08-laura.jpg", "Laura Gómez", "Manizales · Colombia", "Se me dañaban muchas verduras en la casa y terminaba botándolas. Con el material aprendí a aprovecharlas haciendo conservas para toda mi familia."],
  ["/images/testimonials/09-sandra.jpg", "Sandra Milena Rojas", "Ibagué · Colombia", "Yo creía que para empezar necesitaba máquinas y equipos especiales. Al final pude hacer mis primeras conservas con lo que ya tenía en mi cocina."],
];

const faqs = [
  ["¿Necesito experiencia previa?", "No. La guía comienza desde los fundamentos y explica cada proceso paso a paso, con un lenguaje sencillo."],
  ["¿Qué tipos de conservas voy a aprender?", "Encontrarás recetas dulces, saladas, encurtidos, mermeladas, pimentones, ajíes y preparaciones especiales."],
  ["¿Puedo usar las recetas para vender?", "Sí. El material incluye recetas rentables, tabla de costos, cálculo de precios y guías para organizar tus ventas."],
  ["¿Cómo recibo el material?", "Después de la confirmación del pago, recibes acceso digital al material para consultarlo desde tu celular o computadora."],
  ["¿El acceso vence?", "No. El acceso al material es de por vida para que avances a tu ritmo y vuelvas a consultarlo cuando quieras."],
  ["¿Qué pasa si no es para mí?", "Tu compra está protegida por una garantía de 30 días. Puedes solicitar el reembolso dentro de ese período."],
];

function ArrowButton({ href, children, light = false }: { href: string; children: React.ReactNode; light?: boolean }) {
  return <a className={`button ${light ? "button-light" : ""}`} href={href}><span>{children}</span><b aria-hidden="true">→</b></a>;
}

function HeroMedia() {
  return <div className="hero-photo">
    <div className="image-shadow" />
    <img 
      src="/images/especialista-conservas.webp" 
      alt="Especialista en conservas caseras junto a frascos y su guía de recetas" 
      width="600" 
      height="450" 
      fetchPriority="high"
      loading="eager"
      decoding="async"
    />
    <div className="seal"><i>incluye</i><strong>100+</strong><span>recetas</span></div>
  </div>;
}

export default function Home() {
  ReactDOM.preload("/images/especialista-conservas.webp", { as: "image", fetchPriority: "high" });
  const ticker = ["Edición limitada · oferta válida solo por hoy", "Acceso de por vida", "+100 recetas rentables", "Garantía de 30 días", "Entrega digital inmediata"];
  return <main>
    <Tracker />
    <RuletaModal />
    <div className="ticker" aria-label="Información de la oferta"><div>{[...ticker, ...ticker, ...ticker].map((item, i) => <span key={i} aria-hidden={i >= ticker.length}><i>✦</i>{item}</span>)}</div></div>

    <section className="hero paper"><div className="container hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Guías + recetas + herramientas de venta</p>
        <h1><strong>+100 recetas de</strong><br/><em>conservas caseras</em><br/><mark>para preparar y vender</mark></h1>
        <p className="hero-lead">Convierte ingredientes simples en conservas artesanales que puedes disfrutar en casa o vender.</p>
        <div className="mobile-hero-media"><HeroMedia /></div>
        <div className="hero-action"><ArrowButton href="#ofertas">Quiero las +100 recetas</ArrowButton><div className="price"><del>$89.000</del><strong>$20.000</strong><small>solo hoy</small></div></div>
        <p className="hero-detail">Aprende paso a paso a preparar más de 100 conservas artesanales, almacenarlas correctamente, calcular tus costos y convertir tus recetas favoritas en productos para vender.</p>
        <div className="trust"><span>♢ Pago seguro</span><span>↻ Garantía de 30 días</span><span>∞ Acceso de por vida</span></div>
      </div>
      <div className="desktop-hero-media"><HeroMedia /></div>
    </div></section>

    <section className="benefits paper section"><div className="container"><h2>Todo lo que necesitas para pasar de cero a tu primer frasco <em>listo para disfrutar o vender.</em></h2><div className="benefit-grid">{benefits.map(([title, text], i) => <article key={title}><span>{String(i + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="dark-section section paper"><div className="container split">
      <div className="feature-image story-image"><div/><Image src="/images/preserves-collage.webp" alt="Selección de conservas artesanales en frascos de vidrio" width={600} height={600} sizes="(max-width: 900px) 100vw, 50vw" /></div>
      <div><p className="eyebrow warm">Una habilidad que puede valer mucho más de lo que cuesta</p><h2>Transforma ingredientes simples en <em>productos con valor.</em></h2><p className="intro">Unos vegetales, un frasco y la preparación correcta pueden convertirse en una conserva artesanal que luce especial, sabe increíble y está lista para disfrutar, regalar o vender.</p><ul className="editorial-list">{["Convierte ingredientes cotidianos en conservas con apariencia artesanal", "Crea sabores y combinaciones que no encuentras fácilmente en el supermercado", "Prepara frascos bonitos para servir, regalar o vender", "Amplía tu variedad con más de 100 recetas diferentes", "Aprende a calcular cuánto te cuesta producir cada frasco", "Ponle precio a tus conservas y conviértelas en una opción de ingreso"].map((item, i) => <li key={item}><span>{String(i + 1).padStart(2, "0")}</span>{item}</li>)}</ul><ArrowButton href="#ofertas" light>Quiero preparar mis conservas</ArrowButton></div>
    </div></section>

    <section className="fan-section paper"><div className="fan-section-heading"><p className="eyebrow">✦ Lo que dicen quienes ya empezaron</p><h2>Resultados reales de <em>mujeres colombianas.</em></h2><p className="fan-lead">Conservas que hoy se comen en la casa, se regalan y se venden. Esto es lo que comparten las que ya empezaron.</p></div><CardFanCarousel cards={SOCIAL_CARDS} /></section>

    <section className="chapters paper section"><div className="container"><div className="section-heading"><h2>Todo el proceso, organizado en <em>6 áreas clave.</em></h2><p>No es solo un recetario. Aprendes desde los primeros cuidados del frasco hasta la preparación, conservación, costos y precio de venta de tus conservas.</p></div><div className="chapter-grid">{modules.map(([num, title, subtitle]) => <article key={num}><span>Mód. {num}</span><h3>{title}</h3><p>{subtitle}</p></article>)}</div><div className="gallery-heading"><div><h3>Materiales para preparar, conservar y vender tus propias conservas.</h3><p>Recetarios y guías prácticas para acompañarte desde el primer frasco hasta el precio de venta.</p></div></div><div className="deliverables-grid">{deliverables.map(([item, image], i) => <article key={item}><span>{String(i + 1).padStart(2, "0")}</span><div className="mini-cover"><Image src={image} alt={item} width={300} height={375} sizes="(max-width: 620px) 50vw, 25vw" /></div><h4>{item}</h4></article>)}</div></div></section>

    <section className="bonus section paper"><div className="container"><div className="bonus-heading"><div><p className="eyebrow">🎁 4 BONOS EXTRA TOTALMENTE GRATIS</p><h2>Hoy recibes <em>$89.000 en materiales adicionales</em> y NO pagas nada extra por ellos.</h2></div><Image src="/images/cards/sales-gift-set.jpg" alt="Conservas artesanales presentadas como regalos" width={600} height={400} sizes="(max-width: 900px) 100vw, 50vw" /></div><div className="bonus-grid">{bonuses.map((bonus) => <article key={bonus.title}><header><span>{bonus.label}</span><b>Gratis hoy</b></header><Image src={bonus.image} alt={bonus.title} width={400} height={500} sizes="(max-width: 900px) 100vw, 50vw" /><h3>{bonus.title}</h3><p>{bonus.description}</p><footer><span>Valor</span><del>{bonus.value}</del></footer></article>)}</div><p className="fine-print">Los 4 bonos tienen un valor total de $89.000. Hoy están incluidos totalmente gratis junto con la colección completa.</p></div></section>

    <section className="pricing section paper" id="ofertas"><div className="container"><div className="center-heading"><h2>Elige cómo quieres <em>empezar.</em></h2><p>Un solo pago. Acceso de por vida. Elige entre la edición esencial o llévate la colección completa.</p></div><div className="pricing-grid">
      <Offer edition="Edición esencial" title="Guía Esencial de Conservas" price="$20.000" oldPrice="$89.000" href="/checkout/esencial" buttonLabel="Quiero la edición esencial" features={["100+ recetas para preparar y vender", "30 recetas fáciles para empezar", "Conservas especiales", "Almacenamiento y conservación", "Acceso de por vida"]} unavailable={["Tabla de costos y precios", "Guías de ventas y ganancias", "Consejos para conservar mejor"]}/>
      <Offer edition="Edición completa" title="Colección Completa de Conservas" price="$28.000" oldPrice="$167.000" priceNote="Solo $8.000 más que la Edición Esencial" href="/checkout/completa" buttonLabel="Quiero todo por $28.000" featured features={["Todo lo incluido en la Edición Esencial", "Videoclases paso a paso", "Recetas de pimentones y ajíes artesanales", "Tabla práctica de costos y precios", "Guías para vender tus conservas", "Materiales sobre precios y ganancias", "Acceso de por vida"]} bonuses={["Manual de etiquetas para conservas", "Guía Ganancias en un Frasco", "Mermeladas Artesanales", "Guía práctica de conservación"]}/>
    </div><div className="pricing-notes"><strong>Ambas las ediciones son de pago único y tienen acceso de por vida.</strong><span>Además, cuentas con 30 días para probar el material.</span></div></div></section>

    <section className="testimonials section paper"><div className="container"><h2>Lo que dicen quienes ya empezaron a <em>preparar sus conservas.</em></h2><div className="testimonial-grid">{testimonials.map(([photo, name, location, quote]) => <figure key={name}><figcaption><Image className="avatar" src={photo} alt={`Foto de ${name}`} width={46} height={46} /><div><strong>{name}</strong><span>{location}</span></div></figcaption><blockquote>{quote}</blockquote><div className="stars" aria-label="5 de 5 estrellas">★★★★★</div></figure>)}</div><div className="center-action"><ArrowButton href="#ofertas">Quiero empezar hoy</ArrowButton></div></div></section>

    <section className="faq section paper"><div className="narrow"><p className="eyebrow">Antes de empezar</p><h2>Preguntas <em>frecuentes.</em></h2><div className="faq-list">{faqs.map(([question, answer], i) => <details key={question}><summary><span>{String(i + 1).padStart(2, "0")}</span><strong>{question}</strong><b aria-hidden="true">+</b></summary><p>{answer}</p></details>)}</div><div className="center-action"><ArrowButton href="#ofertas">Quiero mis recetas ahora</ArrowButton></div></div></section>

    <footer className="site-footer paper"><div className="container"><div className="footer-grid"><h2>Conservas<br/><em>caseras</em> <mark>rentables</mark><br/>desde casa.</h2><div><span>La colección</span><p>Recetas, conservación, costos, precios y ventas reunidos en un solo material digital.</p></div><div><span>Acceso</span><p>Entrega digital inmediata. Tuyo para siempre, con garantía de devolución de 30 días.</p></div></div><div className="footer-bottom"><span>© 2026 · Todos los derechos reservados</span><span>Prepara · Conserva · Emprende</span></div></div></footer>
  </main>;
}

function Offer({ edition, title, price, oldPrice, priceNote, href, buttonLabel, features, unavailable = [], bonuses = [], featured = false }: { edition: string; title: string; price: string; oldPrice: string; priceNote?: string; href: string; buttonLabel: string; features: string[]; unavailable?: string[]; bonuses?: string[]; featured?: boolean }) {
  return <article className={`offer ${featured ? "featured" : ""}`}>{featured && <b className="popular">Más popular</b>}<span className="eyebrow">{edition}</span><h3>{title}</h3><ul>{features.map(item => <li key={item}><i>{featured ? "✦" : "—"}</i>{item}</li>)}</ul>{(bonuses.length > 0 || unavailable.length > 0) && <div className="offer-bonuses"><b>✦ {featured ? "4 bonos incluidos" : "Bonos gratis"}</b>{bonuses.map(item => <span key={item}>✦ {item}</span>)}{unavailable.map(item => <del key={item}>× {item}</del>)}{featured && <strong>✦ Actualizaciones futuras gratis</strong>}</div>}<div className="offer-bottom"><div><del>{oldPrice}</del><strong>{price}</strong><small>pago único</small></div>{priceNote && <p className="price-note">{priceNote}</p>}<a href={href}>{buttonLabel} <b aria-hidden="true">→</b></a><p>Pago seguro · Garantía de 30 días</p></div></article>;
}
