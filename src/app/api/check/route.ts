import { NextRequest, NextResponse } from "next/server";
import { deepAnalyze, DeepAnalysisResult } from "@/lib/deepPolicyAnalyzer";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Domain-level in-memory cache (24h TTL)
const cache = new Map<string, { data: DeepAnalysisResult; expires: number }>();
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
    const policy_text = body.policy_text;

    if (!seller_url && !policy_text) {
      return NextResponse.json(
        { error: "Provide seller_url (or url) or policy_text" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

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

    // Cache the result
    if (cacheKey && !policy_text) {
      cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });
    }

    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
