import { NextRequest, NextResponse } from "next/server";
import { deepAnalyze, DeepAnalysisResult } from "@/lib/deepPolicyAnalyzer";
import { writeAuditRecord, hashApiKey } from "@/lib/audit";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Domain-level in-memory cache (24h TTL)
const cache = new Map<string, { data: DeepAnalysisResult & { flags: string[]; fetch_method: string; analysis_method?: string }; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function getCacheKey(sellerUrl: string): string | null {
  try {
    return new URL(sellerUrl).hostname;
  } catch {
    return null;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept both "seller_url" and "url" for compatibility
    const seller_url = body.seller_url || body.url;
    const policy_text = body.policy_text || body.text;
    const agent_id: string | null = body.agent_id ?? null;
    const transaction_ref: string | null = body.transaction_ref ?? null;
    const rawApiKey = req.headers.get("x-api-key") ?? "anonymous";
    const api_key_hash = hashApiKey(rawApiKey);

    if (!seller_url && !policy_text) {
      return NextResponse.json(
        { error: "Provide seller_url (or url) or policy_text" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Determine fetch method
    const fetch_method = policy_text
      ? (seller_url ? "client_provided" : "text_input")
      : "server_fetch";

    // Check cache (only for URL-based lookups without custom policy text)
    const cacheKey = seller_url ? getCacheKey(seller_url) : null;
    if (cacheKey && !policy_text) {
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return NextResponse.json(cached.data, { headers: CORS_HEADERS });
      }
    }

    const result = await deepAnalyze(
      seller_url || "direct text analysis",
      policy_text || null,
    );

    const flags = result.clauses.map((c) => c.id);
    const response = { ...result, flags, fetch_method };

    // Cache the result
    if (cacheKey && !policy_text) {
      cache.set(cacheKey, { data: response, expires: Date.now() + CACHE_TTL });
    }

    // Audit log (fire-and-forget)
    let sellerDomain: string | null = null;
    try { if (seller_url) sellerDomain = new URL(seller_url).hostname; } catch { /* ignore */ }

    writeAuditRecord({
      api_key_hash,
      event: "check",
      seller_domain: sellerDomain,
      agent_id,
      transaction_ref,
      analysis_status: result.analysis_status,
      confidence: result.confidence,
      flags,
      clause_count: result.clauses.length,
      non_boilerplate_count: result.clauses.filter((c) => !c.is_standard_boilerplate).length,
      signed: false,
      verified: null,
      assessment_id: null,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    });

    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
