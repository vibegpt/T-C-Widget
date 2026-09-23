import { NextRequest, NextResponse } from "next/server";
import {
  x402ResourceServer,
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
} from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { declareDiscoveryExtension, bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { deepAnalyze } from "@/lib/deepPolicyAnalyzer";

export const runtime = "nodejs";

// Lazy singleton — initialized once per cold start
let httpServer: x402HTTPResourceServer | null = null;
let initPromise: Promise<x402HTTPResourceServer> | null = null;

function getServer(): Promise<x402HTTPResourceServer> {
  if (httpServer) return Promise.resolve(httpServer);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Use CDP facilitator (mainnet) when credentials are set, otherwise x402.org (testnet)
    const cdpKeyId = process.env.CDP_API_KEY_ID;
    const cdpKeySecret = process.env.CDP_API_KEY_SECRET;

    const facilitatorConfig = cdpKeyId && cdpKeySecret
      ? createFacilitatorConfig(cdpKeyId, cdpKeySecret)
      : { url: process.env.X402_FACILITATOR_URL || "https://www.x402.org/facilitator" };

    const facilitator = new HTTPFacilitatorClient(facilitatorConfig);

    const resourceServer = new x402ResourceServer(facilitator);
    registerExactEvmScheme(resourceServer);
    resourceServer.registerExtension(bazaarResourceServerExtension);

    const rawPrice = (process.env.X402_PRICE || "0.03").trim();
    const price = rawPrice.startsWith("$") ? rawPrice : `$${rawPrice}`;

    const server = new x402HTTPResourceServer(resourceServer, {
      "POST /api/x402/analyze": {
        accepts: {
          scheme: "exact",
          network: (process.env.X402_NETWORK || "eip155:8453").trim() as `${string}:${string}`,
          payTo: (process.env.X402_PAY_TO_ADDRESS || "").trim(),
          price,
        },
        description: "PolicyCheck premium analysis — full risk assessment with detailed findings",
        mimeType: "application/json",
        extensions: {
          ...declareDiscoveryExtension({
            input: {
              url: "https://example.com/policies/refund-policy",
            },
            inputSchema: {
              properties: {
                url: { type: "string", description: "URL of a policy page to analyse" },
                sellerUrl: { type: "string", description: "Seller homepage URL — auto-discovers all policy pages" },
                text: { type: "string", description: "Raw policy/terms text to analyse" },
              },
            },
            bodyType: "json",
            output: {
              example: {
                payment: { settled: true, transaction: "0x...", network: "eip155:8453", payer: "0x..." },
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
          }),
        },
      },
    });

    await server.initialize();
    httpServer = server;
    return server;
  })();

  initPromise.catch(() => {
    initPromise = null; // allow retry on next request
  });

  return initPromise;
}

export async function POST(req: NextRequest) {
  try {
    const server = await getServer();

    const adapter = {
      getHeader: (name: string) => req.headers.get(name) ?? undefined,
      getMethod: () => "POST" as const,
      getPath: () => "/api/x402/analyze",
      getUrl: () => req.url,
      getAcceptHeader: () => req.headers.get("accept") || "",
      getUserAgent: () => req.headers.get("user-agent") || "",
    };

    const result = await server.processHTTPRequest({
      adapter,
      path: "/api/x402/analyze",
      method: "POST",
    });

    // No payment or invalid payment → return 402 with requirements
    if (result.type === "payment-error") {
      return new NextResponse(
        result.response.body != null ? JSON.stringify(result.response.body) : undefined,
        {
          status: result.response.status,
          headers: result.response.headers,
        },
      );
    }

    // Payment verified → validate & analyse first, settle only on success
    if (result.type === "payment-verified") {
      // Parse and validate the request body before settling
      const body = await req.json();
      const sellerUrl = body.sellerUrl || body.seller_url || body.url;
      const policyText = body.text || body.policy_text;

      if (!sellerUrl && !policyText) {
        return NextResponse.json(
          { error: "Provide 'url', 'sellerUrl', or 'text' in request body" },
          { status: 400 },
        );
      }

      const analysisResult = await deepAnalyze(
        sellerUrl || "direct text analysis",
        policyText || null,
      );

      const flags = analysisResult.clauses.map((c) => c.id);
      const fetch_method = policyText
        ? (sellerUrl ? "client_provided" : "text_input")
        : "server_fetch";

      // Analysis succeeded — now settle the payment
      const settleResult = await server.processSettlement(
        result.paymentPayload,
        result.paymentRequirements,
        result.declaredExtensions,
      );

      if (!settleResult.success) {
        return NextResponse.json(
          {
            error: "Payment settlement failed",
            reason: "errorReason" in settleResult ? settleResult.errorReason : "unknown",
          },
          { status: 402 },
        );
      }

      const headers: Record<string, string> = {
        "Access-Control-Allow-Origin": "*",
      };
      if ("headers" in settleResult && settleResult.headers) {
        Object.assign(headers, settleResult.headers);
      }

      return NextResponse.json(
        {
          payment: {
            settled: true,
            transaction: settleResult.transaction,
            network: settleResult.network,
            payer: settleResult.payer,
          },
          analysis: { ...analysisResult, flags, fetch_method },
        },
        { headers },
      );
    }

    // "no-payment-required" — shouldn't happen for a paid route
    return NextResponse.json({ error: "Unexpected state" }, { status: 500 });
  } catch (err) {
    console.error("x402 analyze error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/x402/analyze",
    protocol: "x402 (HTTP 402 Payments)",
    price: process.env.X402_PRICE || "$0.03",
    network: process.env.X402_NETWORK || "eip155:8453",
    description:
      "Paid policy analysis endpoint. POST with {url}, {sellerUrl}, or {text}. " +
      "First request returns 402 with payment requirements. " +
      "Re-send with X-PAYMENT header after signing.",
    usage: {
      method: "POST",
      body: { url: "https://example.com/terms" },
      headers: { "Content-Type": "application/json" },
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PAYMENT",
    },
  });
}
