import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Temporarily bypass Upstash to test if route itself works
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || "";
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";

    if (!upstashUrl || !upstashToken) {
      return NextResponse.json({ error: "Upstash env vars not configured", upstashUrl: !!upstashUrl, upstashToken: !!upstashToken }, { status: 500 });
    }

    // Test raw Upstash connection directly
    let rawData: unknown = null;
    let fetchError: string | null = null;
    try {
      const res = await fetch(upstashUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["GET", "conservas_analytics"]),
      });
      rawData = await res.json();
    } catch (e) {
      fetchError = String(e);
    }

    return NextResponse.json({
      status: "ok",
      hasUpstashUrl: !!upstashUrl,
      hasUpstashToken: !!upstashToken,
      fetchError,
      rawDataKeys: rawData ? Object.keys(rawData as object) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Crash", detail: String(e) }, { status: 500 });
  }
}
