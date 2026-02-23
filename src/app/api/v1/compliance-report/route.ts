import { NextRequest, NextResponse } from "next/server";
import { getComplianceReport, hashApiKey, CompliancePeriod } from "@/lib/audit";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

const VALID_PERIODS: CompliancePeriod[] = ["last-7-days", "last-30-days", "last-90-days", "all-time"];

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const rawApiKey = req.headers.get("x-api-key");
  if (!rawApiKey) {
    return NextResponse.json(
      { error: "X-API-Key header required" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period") ?? "last-30-days";

  if (!VALID_PERIODS.includes(periodParam as CompliancePeriod)) {
    return NextResponse.json(
      { error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}` },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const period = periodParam as CompliancePeriod;

  try {
    const api_key_hash = hashApiKey(rawApiKey);
    const report = await getComplianceReport(api_key_hash, period);

    return NextResponse.json(report, { headers: CORS_HEADERS });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not configured") || message.includes("ECONNREFUSED") || message.includes("fetch")) {
      return NextResponse.json(
        { error: "Audit storage unavailable" },
        { status: 503, headers: CORS_HEADERS },
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
