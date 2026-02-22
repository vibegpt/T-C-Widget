import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Legacy redirect — POST /api/v1/tap/seller-trust → /api/v1/signed-assessment
export async function OPTIONS() {
  return NextResponse.redirect(new URL("/api/v1/signed-assessment", "https://policycheck.tools"), 307);
}

export async function POST(req: NextRequest) {
  const url = new URL("/api/v1/signed-assessment", req.url);
  return NextResponse.redirect(url, 307);
}
