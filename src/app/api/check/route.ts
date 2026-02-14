import { NextRequest, NextResponse } from "next/server";
import { analyseText, quickRiskCheck } from "@/lib/policy-analysis";

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
    const { seller_url, policy_text } = body;

    let result;

    if (policy_text) {
      result = { seller_url: seller_url || "direct text analysis", ...analyseText(policy_text) };
    } else if (seller_url) {
      result = await quickRiskCheck(seller_url);
    } else {
      return NextResponse.json(
        { error: "Provide seller_url or policy_text" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
