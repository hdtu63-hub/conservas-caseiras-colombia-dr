import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/app/lib/analytics";
export const runtime = "edge";

export async function GET(req: NextRequest) {
  const password = req.headers.get("x-admin-password");

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || undefined;

  const stats = await getStats(date);
  return NextResponse.json(stats);
}
