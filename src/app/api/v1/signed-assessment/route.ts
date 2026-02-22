import { NextRequest, NextResponse } from "next/server";
import { deepAnalyze } from "@/lib/deepPolicyAnalyzer";
import { signPayload } from "@/lib/signing";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const seller_url = body.seller_url || body.url;
    const policy_text = body.policy_text || body.text;

    if (!seller_url && !policy_text) {
      return NextResponse.json(
        { error: "Provide seller_url (or url) or policy_text (or text)" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Run analysis using existing deep analyzer
    const result = await deepAnalyze(seller_url || "direct text analysis", policy_text || null);

    // Extract seller domain
    let sellerDomain = "unknown";
    try {
      if (seller_url) sellerDomain = new URL(seller_url).hostname;
    } catch { /* keep "unknown" */ }

    // Build clauses_summary grouped by category
    const clausesByCategory: Record<string, number> = {};
    for (const c of result.clauses) {
      const cat = c.category || "other";
      clausesByCategory[cat] = (clausesByCategory[cat] || 0) + 1;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // +5 min

    // Build signed assessment envelope
    const signedAssessment = {
      version: "2.0",
      provider: "policycheck.tools",
      assessment_id: randomUUID(),
      timestamp: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      seller: {
        domain: sellerDomain,
        url: seller_url || null,
      },
      flags: result.clauses.map((c) => c.id),
      clauses_summary: clausesByCategory,
      policies: result.policies,
      clauses: result.clauses,
      positives: result.positives,
      summary: result.summary,
      analysis_status: result.analysis_status,
      confidence: result.confidence,
    };

    // Sign the payload
    const { signature, signed_payload_hash } = signPayload(signedAssessment);

    return NextResponse.json(
      {
        signed_assessment: signedAssessment,
        signature,
        signed_payload_hash,
        verification_url: "https://policycheck.tools/api/v1/verify",
        jwks_url: "https://policycheck.tools/.well-known/jwks.json",
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
