import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const seed = process.env.POLICYCHECK_SIGNING_KEY || process.env.POLICYCHECK_TAP_SIGNING_KEY;
  const unavailable = (code: string) => NextResponse.json(
    { error: "Signing service unavailable", code },
    { status: 503, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  );
  // Report only readiness categories: never return key material or raw errors.
  if (!seed?.trim()) return unavailable("signing_key_missing");
  if (!/^[a-fA-F0-9]{64}$/.test(seed.trim())) return unavailable("signing_key_malformed");
  try {
    const { getJwks } = await import("@/lib/signing");
    return NextResponse.json(getJwks(), {
      headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return unavailable(seed !== seed.trim() ? "signing_key_whitespace" : "signing_runtime_error");
  }
}
