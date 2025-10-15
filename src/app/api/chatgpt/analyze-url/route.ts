import { NextRequest, NextResponse } from "next/server";
import { parseTerms } from "@/lib/parseTerms";
import { fetchAndExtract } from "@/lib/extractHtml";

export const runtime = "nodejs";

type Body = {
  url: string;
  document_type?: "terms" | "privacy" | "refund" | "shipping" | "other";
};

/**
 * ChatGPT Action endpoint for analyzing legal documents from URLs
 * POST /api/chatgpt/analyze-url
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body;

    if (!body?.url) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch and extract content from URL
    const extracted = await fetchAndExtract(body.url);

    if (!extracted.text || extracted.text.length < 100) {
      return NextResponse.json(
        { error: "Could not extract meaningful content from URL. The page may be empty or behind a login wall." },
        { status: 400 }
      );
    }

    // Use the existing parseTerms function
    const { parsed, risks } = parseTerms(extracted.text, {
      productHint: extracted.title
    });

    // Generate key findings
    const keyFindings: string[] = [];

    if (risks.arbitration) {
      keyFindings.push("⚠️ Binding arbitration required - limits your ability to sue in court");
    }
    if (risks.classActionWaiver) {
      keyFindings.push("⚠️ Class action lawsuits are waived - you can't join group lawsuits");
    }
    if (risks.liabilityCap !== null) {
      keyFindings.push(`⚠️ Liability capped at $${risks.liabilityCap?.toLocaleString() || '0'} - maximum you can recover`);
    }
    if (risks.terminationAtWill) {
      keyFindings.push("⚠️ Account can be terminated at any time without notice");
    }
    if (risks.walletSelfCustody) {
      keyFindings.push("✓ You maintain custody of your wallet/assets");
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

    if (keyFindings.length === 0) {
      keyFindings.push("Document appears to have standard terms with no major red flags identified");
    }

    return NextResponse.json({
      url: body.url,
      title: extracted.title,
      content_length: extracted.text.length,
      summary: {
        product: parsed.product || extracted.title,
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
    console.error("ChatGPT analyze-url error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error analyzing URL" },
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
