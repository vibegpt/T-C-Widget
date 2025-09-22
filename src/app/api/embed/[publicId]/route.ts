import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import crypto from "node:crypto";

export const runtime = "nodejs";

// CORS headers for cross-origin widget requests
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
};

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function pickLocale<T extends { locale: string }>(rows: T[], requested: string) {
  // Prefer exact match, then language-only (en), then any English variant, then the first available
  const lang = requested.toLowerCase();
  const base = lang.split("-")[0];
  return (
    rows.find(r => r.locale.toLowerCase() === lang) ||
    rows.find(r => r.locale.toLowerCase() === base) ||
    rows.find(r => r.locale.toLowerCase().startsWith(base + "-")) ||
    rows[0] || null
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ publicId: string }> }   // Next 15: params is async
) {
  try {
    const url = new URL(req.url);
    const requestedLang = (url.searchParams.get("lang") || "en").toLowerCase();
    const { publicId } = await ctx.params;

    // 1) find embed by public_id
    const { data: embed, error: e1 } = await supabaseAdmin
      .from("embeds")
      .select("id, policy_id")
      .eq("public_id", publicId)
      .single();
    if (e1 || !embed) {
      return NextResponse.json({ error: "Embed not found" }, { 
        status: 404,
        headers: CORS_HEADERS
      });
    }

    // 2) get policy + current version
    const { data: policy, error: e2 } = await supabaseAdmin
      .from("policies")
      .select("id, title, current_version_id")
      .eq("id", embed.policy_id)
      .single();
    if (e2 || !policy) {
      return NextResponse.json({ error: "Policy not found" }, { 
        status: 404,
        headers: CORS_HEADERS
      });
    }
    if (!policy.current_version_id) {
      return NextResponse.json({ error: "No published version", detail: { policy_id: policy.id } }, { 
        status: 404,
        headers: CORS_HEADERS
      });
    }

    // 3) get all summaries for this version, then pick best locale
    const { data: allSummaries, error: sErr } = await supabaseAdmin
      .from("summaries")
      .select("id, overall_risk, grade_level, locale, is_translated, summary_json, created_at")
      .eq("policy_version_id", policy.current_version_id);


    if (sErr || !allSummaries || allSummaries.length === 0) {
      return NextResponse.json({ error: "Summary not found", detail: { policy_version_id: policy.current_version_id } }, { 
        status: 404,
        headers: CORS_HEADERS
      });
    }

    const summary = pickLocale(allSummaries, requestedLang);
    
    if (!summary) {
      return NextResponse.json({ 
        error: "Summary not found for locale", 
        detail: { 
          policy_version_id: policy.current_version_id,
          requestedLang,
          availableLocales: allSummaries.map(s => s.locale)
        } 
      }, { 
        status: 404,
        headers: CORS_HEADERS
      });
    }

    // 4) get clauses in the chosen summary locale; if none, fall back to any clauses for this version
    let { data: clauses } = await supabaseAdmin
      .from("clauses")
      .select("tag, risk, plain_english, locale")
      .eq("policy_version_id", policy.current_version_id)
      .eq("locale", summary.locale)
      .limit(200);

    if (!clauses || clauses.length === 0) {
      const { data: alt } = await supabaseAdmin
        .from("clauses")
        .select("tag, risk, plain_english, locale")
        .eq("policy_version_id", policy.current_version_id)
        .limit(200);
      clauses = alt || [];
    }

    const payload = {
      policyTitle: policy.title || "Terms",
      updatedAt: summary.created_at,
      locale: summary.locale,
      overallRisk: summary.overall_risk,
      highlights: summary.summary_json?.highlights || [],
      clauses: (clauses || []).map(c => ({
        tag: c.tag,
        risk: c.risk,
        plain_english: c.plain_english,
      })),
    };

    // --- ETag (stable across identical payloads) ---
    const etag = crypto
      .createHash("sha1")
      .update(JSON.stringify(payload))
      .digest("hex");

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      // Client has the same version – tell it to use its cache
      return new NextResponse(null, {
        status: 304,
        headers: {
          ...CORS_HEADERS,
          ETag: etag,
          // allow caches to keep a short-lived fresh copy and serve stale while revalidating
          "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        },
      });
    }

    // Normal 200 response with caching headers
    return NextResponse.json(payload, {
      headers: {
        ...CORS_HEADERS,
        ETag: etag,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err?.message || "Server error" }, { 
      status: 500,
      headers: CORS_HEADERS
    });
  }
}
