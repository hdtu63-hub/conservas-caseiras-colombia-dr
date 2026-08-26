export interface MetaPurchaseData {
  email?: string;
  edition?: string;
  amount?: number | string;
  discount?: string;
  eventId?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
}

// Edge-compatible SHA-256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendMetaPurchaseEvent(data: MetaPurchaseData): Promise<boolean> {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || "1832021307783603";
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN;

  if (!accessToken) {
    console.log("Meta Conversions API: META_ACCESS_TOKEN / FB_ACCESS_TOKEN not configured in environment variables.");
    return false;
  }

  try {
    const is8k = data.edition?.includes("8k") || data.discount === "8k" || String(data.amount) === "8000";
    const is75 = !is8k && (data.edition?.includes("75off") || data.discount === "75" || String(data.amount) === "14000");
    const isEsencial = data.edition === "esencial" || String(data.amount) === "20000";

    const value = data.amount
      ? (typeof data.amount === "string" ? parseInt(data.amount, 10) : data.amount)
      : (is8k ? 8000 : (is75 ? 14000 : (isEsencial ? 20000 : 28000)));

    const contentName = is8k
      ? "Colección Completa de Conservas + 7 Bonos VIP"
      : is75
      ? "Colección Completa de Conservas (75% OFF)"
      : isEsencial
      ? "Guía Esencial de Conservas"
      : "Colección Completa de Conservas Caseras";

    const editionParam = is8k ? "completa_8k" : (is75 ? "completa_75off" : (data.edition || "completa"));

    const userData: Record<string, unknown> = {};

    if (data.email) {
      const hashedEmail = await sha256(data.email);
      userData.em = [hashedEmail];
    }
    if (data.ip) {
      userData.client_ip_address = data.ip;
    }
    if (data.userAgent) {
      userData.client_user_agent = data.userAgent;
    }
    if (data.fbc) {
      userData.fbc = data.fbc;
    }
    if (data.fbp) {
      userData.fbp = data.fbp;
    }

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: data.eventId || `purchase_${data.email || "anon"}_${Date.now()}`,
          action_source: "website",
          user_data: userData,
          custom_data: {
            currency: "COP",
            value: isNaN(value) ? 28000 : value,
            content_name: contentName,
            content_type: "product",
            content_ids: [`conservas-${editionParam}`],
            num_items: 1,
          },
        },
      ],
    };

    const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Meta Conversions API Error:", response.status, errorText);
      return false;
    }

    const resJson = await response.json();
    console.log("Meta Conversions API Purchase Event Sent Successfully:", resJson);
    return true;
  } catch (error) {
    console.error("Failed to send Meta Conversions API event:", error);
    return false;
  }
}
