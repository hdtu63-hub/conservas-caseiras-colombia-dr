import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ status: string; filename: string }> }
) {
  // Receipt storage has been removed in favor of direct email attachments.
  return new NextResponse("Not Found", { status: 404 });
}
