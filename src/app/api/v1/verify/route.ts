import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/signing";
import { writeAuditRecord, hashApiKey } from "@/lib/audit";

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
    // Accept both new and legacy field names
    const assessment = body.signed_assessment || body.tap_seller_trust;
    const { signature } = body;
    const rawApiKey = req.headers.get("x-api-key") ?? "anonymous";
    const api_key_hash = hashApiKey(rawApiKey);

    if (!assessment || !signature) {
      return NextResponse.json(
        { valid: false, reason: "Missing signed_assessment or signature" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Check expiry
    if (assessment.expires_at) {
      const expires = new Date(assessment.expires_at);
      if (expires.getTime() < Date.now()) {
        return NextResponse.json(
          {
            valid: false,
            reason: "Assessment has expired",
            assessment_id: assessment.assessment_id,
            expired_at: assessment.expires_at,
          },
          { headers: CORS_HEADERS },
        );
      }
    }

    // Verify Ed25519 signature
    const valid = verifySignature(assessment, signature);

    const verifiedAt = new Date().toISOString();
    const auditBase = {
      api_key_hash,
      event: "verify" as const,
      seller_domain: assessment.seller?.domain ?? null,
      agent_id: body.agent_id ?? null,
      transaction_ref: body.transaction_ref ?? null,
      analysis_status: assessment.analysis_status ?? null,
      confidence: assessment.confidence ?? null,
      flags: assessment.flags ?? [],
      clause_count: assessment.clauses?.length ?? 0,
      non_boilerplate_count: assessment.clauses?.filter((c: { is_standard_boilerplate: boolean }) => !c.is_standard_boilerplate).length ?? 0,
      signed: true,
      assessment_id: assessment.assessment_id ?? null,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    };

    if (valid) {
      writeAuditRecord({ ...auditBase, verified: true });
      return NextResponse.json(
        {
          valid: true,
          assessment_id: assessment.assessment_id,
          seller_domain: assessment.seller?.domain,
          expires_at: assessment.expires_at,
          verified_at: verifiedAt,
        },
        { headers: CORS_HEADERS },
      );
    }

    writeAuditRecord({ ...auditBase, verified: false });
    return NextResponse.json(
      {
        valid: false,
        reason: "Signature verification failed",
        assessment_id: assessment.assessment_id,
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    return NextResponse.json(
      { valid: false, reason: (err as Error).message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
