import { NextRequest, NextResponse } from "next/server";
import { enhancedAnalyze } from "@/lib/enhancedAnalyzer";

export const runtime = "nodejs";
export const maxDuration = 30; // Allow up to 30 seconds for LLM analysis

type Body = {
  text: string;
  document_type?: "terms" | "privacy" | "refund" | "shipping" | "other";
  product_name?: string;
  deep_analysis?: boolean; // Optional: force LLM analysis even for simple docs
};

/**
 * ChatGPT Action endpoint for analyzing legal documents
 * POST /api/chatgpt/analyze
 *
 * Now uses multi-model analysis for reliability
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

    // Use enhanced multi-model analyzer
    const result = await enhancedAnalyze(body.text, {
      documentType: body.document_type,
      productName: body.product_name,
      useDeepAnalysis: body.deep_analysis
    });

    // Return the enhanced analysis
    return NextResponse.json(result, { status: 200 });

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
