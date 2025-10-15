import { NextRequest, NextResponse } from "next/server";
import { parseTerms } from "@/lib/parseTerms";

export const runtime = "nodejs";

type Body = {
  text: string;
  document_type?: "terms" | "privacy" | "refund" | "shipping" | "other";
  product_name?: string;
};

/**
 * ChatGPT Action endpoint for analyzing legal documents
 * POST /api/chatgpt/analyze
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body;

    if (!body?.text) {
      return NextResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    // Use the existing parseTerms function (deterministic, fast, free)
    const { parsed, risks, debug } = parseTerms(body.text, {
      productHint: body.product_name
    });

    // Generate key findings for ChatGPT to summarize
    const keyFindings: string[] = [];

    if (risks.arbitration) {
      keyFindings.push("⚠️ Binding arbitration required - limits your ability to sue in court");
    }
    if (risks.classActionWaiver) {
      keyFindings.push("⚠️ Class action lawsuits are waived - you can't join group lawsuits");
    }
    if (risks.liabilityCap !== null) {
      keyFindings.push(`⚠️ Liability capped at $${risks.liabilityCap?.toLocaleString() || '0'} - maximum you can recover in damages`);
    }
    if (risks.terminationAtWill) {
      keyFindings.push("⚠️ Account can be terminated at any time without notice");
    }
    if (risks.walletSelfCustody) {
      keyFindings.push("✓ You maintain custody of your wallet/assets (they don't control your keys)");
    }
    if (risks.irreversibleTxs) {
      keyFindings.push("⚠️ Transactions are final and irreversible");
    }
    if (risks.bridgingL2Risks) {
      keyFindings.push("⚠️ Layer 2 bridging involves technical risks and withdrawal delays");
    }
    if (risks.optOutDays !== null) {
      keyFindings.push(`ℹ️ You have ${risks.optOutDays} days to opt out of arbitration by mail`);
    }

    // If no specific findings, add general observations
    if (keyFindings.length === 0) {
      keyFindings.push("Document appears to have standard terms with no major red flags identified");
    }

    return NextResponse.json({
      summary: {
        product: parsed.product,
        updated_at: parsed.updatedAt,
        jurisdiction: parsed.jurisdiction,
        sections: parsed.sections.map(s => ({
          key: s.key,
          title: s.title,
          bullets: s.bullets || [],
          body: s.bullets?.join(" ") || s.body || ""
        }))
      },
      risks: {
        arbitration: risks.arbitration || false,
        classActionWaiver: risks.classActionWaiver || false,
        liabilityCap: risks.liabilityCap,
        terminationAtWill: risks.terminationAtWill || false,
        optOutDays: risks.optOutDays
      },
      key_findings: keyFindings
    }, { status: 200 });

  } catch (e: unknown) {
    console.error("ChatGPT analyze error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

// Enable CORS for ChatGPT
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
