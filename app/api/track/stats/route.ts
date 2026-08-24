import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/app/lib/analytics";
export const runtime = "edge";

export async function GET(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || undefined;
    const stats = await getStats(date);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Internal error", detail: String(error) },
      { status: 500 }
    );
  }
}
