import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/app/lib/analytics";
import fs from "fs";
import path from "path";

async function cleanupOldReceipts() {
  const dirs = ["aprovados", "rejeitados"];
  const now = Date.now();
  const maxAge = 3 * 24 * 60 * 60 * 1000; // 3 dias
  
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), "data", "receipts", dir);
    if (!fs.existsSync(dirPath)) continue;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        try { fs.unlinkSync(filePath); } catch(e) {}
      }
    }
  }
}

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
