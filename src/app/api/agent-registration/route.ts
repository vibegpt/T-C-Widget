import { NextResponse } from "next/server";
import registration from "../../../../public/.well-known/agent-registration.json";

// Serves /.well-known/agent-registration.json via rewrite (see next.config.ts).
// The static file in public/ is the source of truth; this route guarantees the
// path resolves on Vercel regardless of static-file serving behaviour for
// dotfolder paths. Required for ERC-8004 on-chain registration.

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(registration, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
