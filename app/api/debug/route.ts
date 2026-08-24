import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    envCheck: {
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
      hasBrevoKey: !!process.env.BREVO_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
}
