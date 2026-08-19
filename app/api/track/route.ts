import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/app/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, metadata } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const event = await trackEvent(type, metadata);
    return NextResponse.json({ success: true, id: event.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
