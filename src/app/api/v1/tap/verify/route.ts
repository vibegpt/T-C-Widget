import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Legacy redirect — POST /api/v1/tap/verify → /api/v1/verify
export async function OPTIONS() {
  return NextResponse.redirect(new URL("/api/v1/verify", "https://policycheck.tools"), 307);
}

export async function POST(req: NextRequest) {
  const url = new URL("/api/v1/verify", req.url);
  return NextResponse.redirect(url, 307);
}
