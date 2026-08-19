import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ status: string; filename: string }> }
) {
  try {
    const resolvedParams = await params;
    const { status, filename } = resolvedParams;

    // Validate params to prevent directory traversal
    if (!["aprovados", "rejeitados"].includes(status)) {
      return new NextResponse("Not Found", { status: 404 });
    }
    
    // Only allow alphanumeric, _, -, and .jpg/.png/.pdf
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|pdf)$/i.test(filename)) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const filepath = path.join(process.cwd(), "data", "receipts", status, filename);

    if (!fs.existsSync(filepath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filepath);
    
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
