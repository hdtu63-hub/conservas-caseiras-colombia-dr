export interface TrackEvent {
  id: string;
  type: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

interface AnalyticsData {
  events: TrackEvent[];
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${UPSTASH_TOKEN}`,
  "Content-Type": "application/json",
});

async function loadData(): Promise<AnalyticsData> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return { events: [] };
  }
  try {
    const res = await fetch(UPSTASH_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(["GET", "conservas_analytics"]),
      cache: "no-store",
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

export async function getStats(targetDate?: string) {
  const data = await loadData();
  const events = data.events;

  const count = (type: string) => events.filter((e) => e.type === type).length;

  const today = targetDate || new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((e) => e.timestamp.startsWith(today));
  const countToday = (type: string) => todayEvents.filter((e) => e.type === type).length;

  const totalRevenueToday = todayEvents
    .filter((e) => e.type === "payment_approved")
    .reduce((sum, e) => {
      const monto = e.metadata?.monto ? parseInt(e.metadata.monto, 10) : 0;
      return sum + (isNaN(monto) ? 0 : monto);
    }, 0);

  return {
    total: {
      pageViews: count("page_view"),
      clicksEsencial: count("click_esencial"),
      clicksCompleta: count("click_completa"),
      checkoutViewsEsencial: count("checkout_view_esencial"),
      checkoutViewsCompleta: count("checkout_view_completa"),
      receiptsUploaded: count("upload_receipt"),
      paymentsApproved: count("payment_approved"),
      paymentsApprovedEsencial: events.filter((e) => e.type === "payment_approved" && e.metadata?.edition === "esencial").length,
      paymentsApprovedCompleta: events.filter((e) => e.type === "payment_approved" && e.metadata?.edition === "completa").length,
      paymentsRejected: count("payment_rejected"),
    },
    today: {
      pageViews: countToday("page_view"),
      clicksEsencial: countToday("click_esencial"),
      clicksCompleta: countToday("click_completa"),
      checkoutViewsEsencial: countToday("checkout_view_esencial"),
      checkoutViewsCompleta: countToday("checkout_view_completa"),
      receiptsUploaded: countToday("upload_receipt"),
      paymentsApproved: countToday("payment_approved"),
      paymentsApprovedEsencial: todayEvents.filter((e) => e.type === "payment_approved" && e.metadata?.edition === "esencial").length,
      paymentsApprovedCompleta: todayEvents.filter((e) => e.type === "payment_approved" && e.metadata?.edition === "completa").length,
      paymentsRejected: countToday("payment_rejected"),
      totalRevenueToday,
    },
    recentEvents: todayEvents.slice(-200).reverse(),
  };
}
