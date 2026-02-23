import { NextRequest, NextResponse } from "next/server";
import { getAuditLog, hashApiKey, AuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

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

  // Parse filters
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const domain = searchParams.get("domain") ?? undefined;
  const event = searchParams.get("event") as AuditEvent | null;
  const limitParam = searchParams.get("limit");

  const from = fromParam ? Number(fromParam) : undefined;
  const to = toParam ? Number(toParam) : undefined;
  const limit = limitParam ? Math.min(Number(limitParam), 500) : 100;

  if ((from !== undefined && isNaN(from)) || (to !== undefined && isNaN(to))) {
    return NextResponse.json(
      { error: "from and to must be Unix timestamps in seconds" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const api_key_hash = hashApiKey(rawApiKey);
    const records = await getAuditLog(api_key_hash, { from, to, domain, event: event ?? undefined, limit });

    return NextResponse.json(
      {
        records,
        count: records.length,
        filters: { from, to, domain, event, limit },
      },
      { headers: CORS_HEADERS },
    );
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
