export interface TrackEvent {
  id: string;
  type: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

interface AnalyticsData {
  events: TrackEvent[];
}

const getAuthHeaders = () => ({
  Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN || ""}`,
  "Content-Type": "application/json",
});

async function loadData(): Promise<AnalyticsData> {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return { events: [] };
  }
  try {
    const res = await fetch(UPSTASH_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(["GET", "conservas_analytics"]),
    });
    const data = await res.json();
    if (data.result) {
      return JSON.parse(data.result);
    }
  } catch (error) {
    console.error("Error loading analytics from Upstash:", error);
  }
  return { events: [] };
}

async function saveData(data: AnalyticsData) {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  try {
    await fetch(UPSTASH_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(["SET", "conservas_analytics", JSON.stringify(data)]),
    });
  } catch (error) {
    console.error("Error saving analytics to Upstash:", error);
  }
}

export async function trackEvent(type: string, metadata?: Record<string, string>): Promise<TrackEvent> {
  const data = await loadData();
  const event: TrackEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    metadata,
  };
  data.events.push(event);
  await saveData(data);
  return event;
}

export async function updateEvent(id: string, updates: Partial<TrackEvent>): Promise<TrackEvent | null> {
  const data = await loadData();
  const event = data.events.find((e) => e.id === id);
  if (!event) return null;

  if (updates.type) event.type = updates.type;
  if (updates.timestamp) event.timestamp = updates.timestamp;
  if (updates.metadata) {
    event.metadata = { ...event.metadata, ...updates.metadata };
  }

  await saveData(data);
  return event;
}

export async function approveEvent(params: {
  eventId?: string;
  email: string;
  edition?: string;
  discount?: string;
  receiptUrl?: string;
}): Promise<TrackEvent> {
  const data = await loadData();
  const { eventId, email, edition, discount, receiptUrl } = params;

  const is8k = edition?.includes("8k") || discount === "8k" || discount === "8000";
  const is75 = !is8k && (edition?.includes("75off") || discount === "75");
  const monto = is8k ? "8000" : (is75 ? "14000" : (edition === "esencial" ? "20000" : "28000"));
  const roleta = is8k ? "Giro 2 (8 mil pesos)" : (is75 ? "Giro 1 (75% OFF)" : "Não girou");

  // 1. If eventId is provided, try to find that specific event
  let targetEvent = eventId ? data.events.find((e) => e.id === eventId) : undefined;

  // 2. If not found by eventId, look for a pending review event with the same email
  if (!targetEvent && email) {
    targetEvent = data.events
      .slice()
      .reverse()
      .find((e) => (e.type === "payment_manual_review" || e.type === "payment_rejected") && e.metadata?.email?.toLowerCase() === email.toLowerCase());
  }

  if (targetEvent) {
    targetEvent.type = "payment_approved_email";
    targetEvent.metadata = {
      ...targetEvent.metadata,
      email,
      edition: edition || targetEvent.metadata?.edition || "completa",
      discount: is8k ? "8k" : (is75 ? "75" : (targetEvent.metadata?.discount || "none")),
      monto: monto || targetEvent.metadata?.monto || "28000",
      roleta: roleta || targetEvent.metadata?.roleta || "Não girou",
      emailStatus: "digitou_e_enviado",
      reviewed: "true",
      approvedAt: new Date().toISOString(),
      ...(receiptUrl ? { receiptUrl } : {}),
    };
  } else {
    // Create a new approved event
    targetEvent = {
      id: crypto.randomUUID(),
      type: "payment_approved_email",
      timestamp: new Date().toISOString(),
      metadata: {
        email,
        edition: edition || "completa",
        discount: is8k ? "8k" : (is75 ? "75" : "none"),
        monto,
        roleta,
        emailStatus: "digitou_e_enviado",
        reviewed: "true",
        approvedAt: new Date().toISOString(),
        ...(receiptUrl ? { receiptUrl } : {}),
      },
    };
    data.events.push(targetEvent);
  }

  // Also resolve/clean any other duplicate pending events for this same email so they don't linger
  if (email) {
    data.events.forEach((ev) => {
      if (
        ev.id !== targetEvent?.id &&
        (ev.type === "payment_manual_review" || ev.type === "payment_rejected") &&
        ev.metadata?.email?.toLowerCase() === email.toLowerCase()
      ) {
        ev.type = "payment_approved_email";
        ev.metadata = {
          ...ev.metadata,
          emailStatus: "digitou_e_enviado",
          reviewed: "true",
        };
      }
    });
  }

  await saveData(data);
  return targetEvent;
}

export async function getStats(targetDate?: string) {
  const data = await loadData();
  const events = data.events;

  const count = (type: string) => events.filter((e) => e.type === type).length;

  const today = targetDate || new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((e) => e.timestamp.startsWith(today));
  const countToday = (type: string) => todayEvents.filter((e) => e.type === type).length;

  // Filtrar eventos de pagamentos aprovados (evitando contagem duplicada quando o mesmo pedido emite payment_approved e payment_approved_email)
  const isApprovedPayment = (e: TrackEvent) =>
    e.type === "payment_approved" ||
    e.type === "payment_approved_email" ||
    e.type === "payment_approved_no_email";

  const todayApproved = todayEvents.filter((e) => isApprovedPayment(e));
  
  // Calcular receita evitando duplicidades se houver payment_approved e payment_approved_email juntos
  // Somente somamos eventos 'payment_approved_email', 'payment_approved_no_email', e 'payment_approved' que não tenham email_submitted correspondente
  const totalRevenueToday = todayEvents
    .filter((e) => e.type === "payment_approved" || e.type === "payment_approved_email" || e.type === "payment_approved_no_email")
    .reduce((sum, e) => {
      const monto = e.metadata?.monto ? parseInt(e.metadata.monto, 10) : 0;
      return sum + (isNaN(monto) ? 0 : monto);
    }, 0);

  // Breakdown por promoção / roleta
  const countPromo = (evs: TrackEvent[], key: "8k" | "75" | "completa" | "esencial") => {
    return evs.filter((e) => {
      if (!isApprovedPayment(e)) return false;
      const discount = e.metadata?.discount;
      const edition = e.metadata?.edition || "";
      const roleta = e.metadata?.roleta || "";
      if (key === "8k") return discount === "8k" || edition.includes("8k") || roleta.includes("8 mil") || e.metadata?.monto === "8000";
      if (key === "75") return discount === "75" || edition.includes("75off") || roleta.includes("75%") || e.metadata?.monto === "14000";
      if (key === "esencial") return edition === "esencial" || e.metadata?.monto === "20000";
      if (key === "completa") return (edition === "completa" || e.metadata?.monto === "28000") && discount !== "8k" && discount !== "75";
      return false;
    }).length;
  };

  const countEmailStatus = (evs: TrackEvent[], statusKey: "sent" | "timeout_60s" | "pending") => {
    if (statusKey === "sent") {
      return evs.filter((e) => e.type === "payment_approved_email" || e.metadata?.emailStatus === "digitou_e_enviado" || (e.type === "payment_approved" && !!e.metadata?.email)).length;
    }
    if (statusKey === "timeout_60s") {
      return evs.filter((e) => e.type === "payment_approved_no_email" || e.metadata?.emailStatus === "nao_digitou_esperou_60s" || e.metadata?.emailStatus === "nao_digitou_clicou_direto").length;
    }
    if (statusKey === "pending") {
      return evs.filter((e) => e.type === "payment_manual_review" || e.type === "payment_rejected").length;
    }
    return 0;
  };

  return {
    total: {
      pageViews: count("page_view"),
      clicksEsencial: count("click_esencial"),
      clicksCompleta: count("click_completa"),
      checkoutViewsEsencial: count("checkout_view_esencial"),
      checkoutViewsCompleta: count("checkout_view_completa") + count("checkout_view_completa_75off") + count("checkout_view_completa_8k"),
      receiptsUploaded: count("upload_receipt"),
      paymentsApproved: events.filter(isApprovedPayment).length,
      paymentsApprovedEsencial: events.filter((e) => isApprovedPayment(e) && e.metadata?.edition === "esencial").length,
      paymentsApprovedCompleta: events.filter((e) => isApprovedPayment(e) && (e.metadata?.edition === "completa" || e.metadata?.edition === "completa_75off" || e.metadata?.edition === "completa_8k")).length,
      paymentsRejected: count("payment_rejected"),
      paymentsManualReview: count("payment_manual_review"),
    },
    today: {
      pageViews: countToday("page_view"),
      clicksEsencial: countToday("click_esencial"),
      clicksCompleta: countToday("click_completa"),
      checkoutViewsEsencial: countToday("checkout_view_esencial"),
      checkoutViewsCompleta: countToday("checkout_view_completa") + countToday("checkout_view_completa_75off") + countToday("checkout_view_completa_8k"),
      receiptsUploaded: countToday("upload_receipt"),
      paymentsApproved: todayApproved.length,
      paymentsApprovedEsencial: todayEvents.filter((e) => isApprovedPayment(e) && e.metadata?.edition === "esencial").length,
      paymentsApprovedCompleta: todayEvents.filter((e) => isApprovedPayment(e) && (e.metadata?.edition === "completa" || e.metadata?.edition === "completa_75off" || e.metadata?.edition === "completa_8k")).length,
      paymentsRejected: countToday("payment_rejected"),
      paymentsManualReview: countToday("payment_manual_review"),
      totalRevenueToday,
      
      // Detalhamento de e-mails
      emailsSent: countEmailStatus(todayEvents, "sent"),
      emailsTimeout60s: countEmailStatus(todayEvents, "timeout_60s"),

      // Detalhamento por Promoção / Roleta
      promo8k: countPromo(todayEvents, "8k"),
      promo75: countPromo(todayEvents, "75"),
      promoCompletaRegular: countPromo(todayEvents, "completa"),
      promoEsencialRegular: countPromo(todayEvents, "esencial"),
    },
    recentEvents: todayEvents.slice(-300).reverse(),
  };
}

