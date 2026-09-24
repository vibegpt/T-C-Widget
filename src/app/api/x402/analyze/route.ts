import { NextRequest, NextResponse } from "next/server";
import {
  x402ResourceServer,
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
} from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { declareDiscoveryExtension, bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { isBillableAnalysis } from "@/lib/deepPolicyAnalyzer";
import { analyzeInput, signedResult, recordAssessment, requestContext, API_HEADERS } from "@/lib/assessment";
import { InputError, parsePolicyInput } from "@/lib/policy-input";
import { POLICY_DESCRIPTION, INPUT_SCHEMA, OUTPUT_EXAMPLE } from "@/lib/discovery";

export const runtime = "nodejs";
export const maxDuration = 60;

// Lazy singleton — initialized once per cold start
let httpServer: x402HTTPResourceServer | null = null;
let initPromise: Promise<x402HTTPResourceServer> | null = null;

// Set during init so the GET diagnostic can report which facilitator is actually in use.
let facilitatorMode: "cdp" | "fallback" | "uninitialized" = "uninitialized";
let facilitatorUrl: string | null = null;

function getServer(): Promise<x402HTTPResourceServer> {
  if (httpServer) return Promise.resolve(httpServer);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const cdpKeyId = process.env.CDP_API_KEY_ID?.trim();
    const cdpKeySecret = process.env.CDP_API_KEY_SECRET?.trim();
    const usingCdpFacilitator = Boolean(cdpKeyId && cdpKeySecret);
    const fallbackFacilitatorUrl = process.env.X402_FACILITATOR_URL || "https://www.x402.org/facilitator";
    if (!usingCdpFacilitator && process.env.X402_ALLOW_NON_CDP !== "true") {
      throw new Error("CDP facilitator credentials are required. Non-CDP mode must be explicitly enabled with X402_ALLOW_NON_CDP=true.");
    }
    facilitatorMode = usingCdpFacilitator ? "cdp" : "fallback";
    facilitatorUrl = usingCdpFacilitator ? "https://api.cdp.coinbase.com/platform/v2/x402" : fallbackFacilitatorUrl;
    if (!usingCdpFacilitator) console.warn("[x402] Explicit non-CDP mode: CDP Bazaar indexing is unavailable");
    const facilitatorConfig = usingCdpFacilitator
      ? createFacilitatorConfig(cdpKeyId as string, cdpKeySecret as string)
      : { url: fallbackFacilitatorUrl };

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
        description: POLICY_DESCRIPTION,
        mimeType: "application/json",
        extensions: {
          ...declareDiscoveryExtension({
            input: { text: "Items may be returned within 30 days of delivery. Refunds are sent to the original payment method." },
            inputSchema: INPUT_SCHEMA,
            bodyType: "json",
            output: { example: OUTPUT_EXAMPLE },
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
  const start = Date.now();
  try {
    const body = await req.json();
    parsePolicyInput(body); // Reject invalid input before payment processing.
    const context = requestContext(req, body, "x402");
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
          headers: { ...result.response.headers, ...API_HEADERS },
        },
      );
    }

    // Payment verified → validate & analyse first, settle only on success
    if (result.type === "payment-verified") {
      const analysisResult = signedResult(await analyzeInput(body), context);
      if (!isBillableAnalysis(analysisResult)) {
        const audit_recorded = await recordAssessment(analysisResult, context, Date.now()-start);
        return NextResponse.json({ error: "No billable analysis produced", payment: {settled:false}, analysis: analysisResult, audit_recorded }, {
          status: analysisResult.analysis_status === "extraction_failed" ? 503 : 422, headers: API_HEADERS,
        });
      }
      // The signed result is ready before settlement. The resource metadata is
      // required by CDP discovery even when a client omits it from its payload.
      const paymentPayload = { ...result.paymentPayload, resource: {
        url: "https://policycheck.tools/api/x402/analyze",
        description: POLICY_DESCRIPTION, mimeType: "application/json",
      }};
      const settleResult = await server.processSettlement(
        paymentPayload, result.paymentRequirements, result.declaredExtensions,
      );

      if (!settleResult.success) {
        return NextResponse.json(
          {
            error: "Payment settlement failed",
            reason: "errorReason" in settleResult ? settleResult.errorReason : "unknown",
          },
          { status: 402, headers: API_HEADERS },
        );
      }

      const headers: Record<string, string> = { ...API_HEADERS };
      const audit_recorded = await recordAssessment(analysisResult, context, Date.now()-start);
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
          analysis: analysisResult,
          audit_recorded,
        },
        { headers },
      );
    }

    // "no-payment-required" — shouldn't happen for a paid route
    return NextResponse.json({ error: "Unexpected state" }, { status: 500, headers: API_HEADERS });
  } catch (err) {
    console.error("x402 analyze error:", err);
    return NextResponse.json(
      { error: err instanceof InputError || err instanceof SyntaxError ? (err as Error).message : "Paid analysis unavailable" },
      { status: err instanceof InputError || err instanceof SyntaxError ? 400 : 503, headers: API_HEADERS },
    );
  }
}

export async function GET() {
  let initialized=false;
  try { await getServer(); initialized=true; } catch { /* Report readiness, not secrets. */ }
  return NextResponse.json({
    endpoint: "/api/x402/analyze", protocol: "x402 v2", initialized,
    facilitator: { mode: facilitatorMode, url: facilitatorUrl,
      bazaarIndexable: initialized && facilitatorMode === "cdp",
      note: "Configuration readiness only; validate the live 402 response and settlement to confirm indexing." },
    price: process.env.X402_PRICE || "0.03", network: process.env.X402_NETWORK || "eip155:8453",
    description: POLICY_DESCRIPTION,
    usage: { method: "POST", body: {seller_url:"https://example.com"}, payment_header:"PAYMENT-SIGNATURE" },
    charging: "No charge for no_content, no_facts, or extraction_failed. Evidence-backed partial results are billable and disclose limitations.",
  }, {status:initialized?200:503,headers:API_HEADERS});
}
export async function OPTIONS() { return new Response(null,{status:204,headers:API_HEADERS}); }
