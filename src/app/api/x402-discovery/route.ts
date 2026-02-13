import { NextResponse } from "next/server";

/**
 * GET /api/x402-discovery
 * Serves the x402 Bazaar discovery manifest.
 * Rewritten from /.well-known/x402.json in next.config.ts
 */

const network = (process.env.X402_NETWORK || "eip155:8453").trim();
const price = (process.env.X402_PRICE || "0.03").trim();
const payTo = (process.env.X402_PAY_TO_ADDRESS || "").trim();

const manifest = {
  x402Version: 2,
  resources: [
    {
      url: "https://legaleasy.tools/api/x402/analyze",
      method: "POST",
      description:
        "PolicyCheck premium analysis — seller policy risk intelligence for terms & conditions, return policies, and legal documents. Returns risk level, buyer protection score, key findings, and factual summary.",
      mimeType: "application/json",
      accepts: {
        scheme: "exact",
        network,
        payTo,
        price: price.startsWith("$") ? price : `$${price}`,
      },
      input: {
        bodyType: "json",
        schema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of a policy page to analyse",
            },
            sellerUrl: {
              type: "string",
              description:
                "Seller homepage URL — auto-discovers and analyses all policy pages",
            },
            text: {
              type: "string",
              description: "Raw policy/terms text to analyse",
            },
          },
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
    },
  ],
  provider: {
    name: "PolicyCheck by LegalEasy",
    url: "https://legaleasy.tools",
    description:
      "AI-powered pre-purchase policy analysis for agentic commerce",
  },
  relatedProtocols: {
    a2a: "https://legaleasy.tools/.well-known/agent.json",
    mcp: "https://www.npmjs.com/package/policycheck-mcp",
  },
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
