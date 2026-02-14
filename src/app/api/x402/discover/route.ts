import { NextResponse } from "next/server";

/**
 * GET /api/x402/discover
 * Approach C: Static discovery endpoint for x402 Bazaar.
 * Returns the same resource metadata as /.well-known/x402.json
 * but at a path co-located with the payment endpoint.
 */

const network = (process.env.X402_NETWORK || "eip155:8453").trim();
const price = (process.env.X402_PRICE || "0.03").trim();
const payTo = (process.env.X402_PAY_TO_ADDRESS || "").trim();

export async function GET() {
  return NextResponse.json(
    {
      endpoint: "/api/x402/analyze",
      protocol: "x402 (HTTP 402 Payments)",
      price: price.startsWith("$") ? price : `$${price}`,
      network,
      payTo,
      description:
        "PolicyCheck premium analysis — seller policy risk intelligence for terms & conditions, return policies, and legal documents.",
      accepts: {
        scheme: "exact",
        network,
        payTo,
        price: price.startsWith("$") ? price : `$${price}`,
      },
      input: {
        method: "POST",
        contentType: "application/json",
        fields: {
          url: "URL of a policy page to analyse",
          sellerUrl:
            "Seller homepage URL — auto-discovers and analyses all policy pages",
          text: "Raw policy/terms text to analyse",
        },
        examples: [
          { url: "https://example.com/policies/refund-policy" },
          { sellerUrl: "https://example-store.com" },
          {
            text: "All sales are final. No refunds or exchanges permitted after 7 days.",
          },
        ],
      },
      output: {
        example: {
          payment: {
            settled: true,
            transaction: "0x...",
            network: "eip155:8453",
            payer: "0x...",
          },
          analysis: {
            riskLevel: "high",
            buyerProtectionScore: 35,
            summary: "High risk indicators detected. 3 of 5 policy categories flagged. Binding arbitration limits dispute resolution. Class action waiver present. No refund policy.",
            keyFindings: [
              "Binding arbitration clause found",
              "Class action waiver present",
              "No refund policy",
            ],
          },
        },
      },
      discovery: {
        wellKnown: "https://policycheck.tools/.well-known/x402.json",
        a2a: "https://policycheck.tools/.well-known/agent.json",
        mcp: "https://www.npmjs.com/package/policycheck-mcp",
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
