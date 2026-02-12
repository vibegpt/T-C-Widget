import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// PolicyCheck A2A Server — JSON-RPC 2.0 endpoint
// Implements Google's Agent2Agent Protocol for agent-to-agent communication
// Spec: https://a2a-protocol.org/latest/specification/
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface TaskMessage {
  role: "user" | "agent";
  parts: Part[];
}

interface Part {
  kind: "text" | "data" | "file";
  text?: string;
  data?: Record<string, unknown>;
  mimeType?: string;
}

interface Task {
  id: string;
  status: {
    state: "submitted" | "working" | "input-required" | "completed" | "failed" | "canceled";
    message?: TaskMessage;
  };
  artifacts?: Artifact[];
  messages?: TaskMessage[];
}

interface Artifact {
  artifactId: string;
  name: string;
  parts: Part[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonRpcSuccess(id: string | number, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: string | number | null, code: number, message: string, data?: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message, data } });
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateArtifactId(): string {
  return `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Policy fetching ──────────────────────────────────────────────────────────

async function fetchPolicyFromUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PolicyCheck-A2A/1.0 (Policy Analysis Service Agent)",
        Accept: "text/html,text/plain,application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let text = await response.text();
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("html")) {
      text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
      text = text.replace(/<[^>]+>/g, " ");
      text = text
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      text = text.replace(/\s+/g, " ").trim();
    }
    return text;
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`Failed to fetch policy: ${(error as Error).message}`);
  }
}

// ── Core analysis (inline version — uses regex patterns from parseTerms) ─────

function analyseText(text: string) {
  const risks: Record<string, unknown> = {};
  const keyFindings: string[] = [];
  const lower = text.toLowerCase();

  // Arbitration
  if (/binding\s+arbitration|mandatory\s+arbitration|resolved\s+(by|through)\s+.*arbitration/i.test(text)) {
    risks.arbitration = true;
    keyFindings.push("⚠️ Binding arbitration required — limits ability to sue in court");
  }

  // Class action waiver
  if (/waive.*class\s+action|class\s+action.*waiv|no\s+class\s+action/i.test(text)) {
    risks.classActionWaiver = true;
    keyFindings.push("⚠️ Class action lawsuits waived — cannot join group lawsuits");
  }

  // Liability cap
  const liabMatch = text.match(/liability.*(?:shall\s+not|not\s+to)\s+exceed\s+\$?([\d,]+)/i);
  if (liabMatch) {
    const cap = parseInt(liabMatch[1].replace(/,/g, ""), 10);
    risks.liabilityCap = cap;
    keyFindings.push(`⚠️ Liability capped at $${cap.toLocaleString()}`);
  }

  // Termination at will
  if (/terminate.*at\s+any\s+time|terminate.*without\s+(prior\s+)?notice|terminate.*for\s+any\s+reason/i.test(text)) {
    risks.terminationAtWill = true;
    keyFindings.push("⚠️ Account can be terminated at any time without notice");
  }

  // Auto-renewal
  if (/auto[- ]?renew|automatically\s+renew/i.test(text)) {
    risks.autoRenewal = true;
    keyFindings.push("ℹ️ Auto-renewal clause detected — check cancellation terms");
  }

  // Opt-out window
  const optOutMatch = text.match(/(\d+)\s*(?:day|calendar\s+day)s?\s*to\s*opt[\s-]*out/i);
  if (optOutMatch) {
    risks.optOutDays = parseInt(optOutMatch[1], 10);
    keyFindings.push(`ℹ️ ${risks.optOutDays} days to opt out of arbitration`);
  }

  // No-refund / final sale
  if (/no\s+refund|all\s+sales?\s+(are\s+)?final|non[\s-]?refundable/i.test(text)) {
    risks.noRefunds = true;
    keyFindings.push("🔴 No refunds — all sales are final");
  }

  // Restocking fee
  const restockMatch = text.match(/(\d+)%?\s*restock/i);
  if (restockMatch) {
    risks.restockingFee = restockMatch[1] + "%";
    keyFindings.push(`⚠️ Restocking fee: ${restockMatch[1]}%`);
  }

  if (keyFindings.length === 0) {
    keyFindings.push("✅ No major red flags identified in this document");
  }

  // Calculate score
  let score = 100;
  if (risks.arbitration) score -= 15;
  if (risks.classActionWaiver) score -= 10;
  if (risks.liabilityCap) score -= 5;
  if (risks.terminationAtWill) score -= 10;
  if (risks.autoRenewal) score -= 5;
  if (risks.noRefunds) score -= 20;
  if (risks.restockingFee) score -= 5;
  score = Math.max(0, score);

  let riskLevel: string;
  if (score >= 80) riskLevel = "low";
  else if (score >= 60) riskLevel = "medium";
  else if (score >= 40) riskLevel = "high";
  else riskLevel = "critical";

  return {
    riskLevel,
    buyerProtectionScore: score,
    recommendation:
      score >= 80 ? "proceed"
        : score >= 60 ? "proceed_with_caution"
        : score >= 40 ? "review_carefully"
        : "not_recommended",
    keyFindings,
    risks,
  };
}

async function analyseFromUrl(url: string) {
  const text = await fetchPolicyFromUrl(url);
  if (!text || text.length < 100) {
    throw new Error("Could not extract meaningful content from URL.");
  }
  return { url, ...analyseText(text) };
}

async function quickRiskCheck(sellerUrl: string) {
  const baseUrl = sellerUrl.replace(/\/$/, "");
  const policyPaths: Record<string, string[]> = {
    returns: ["/policies/refund-policy", "/pages/return-policy", "/returns"],
    shipping: ["/policies/shipping-policy", "/pages/shipping", "/shipping"],
    terms: ["/policies/terms-of-service", "/terms-of-service", "/terms"],
  };

  const found: Record<string, string> = {};

  for (const [policyType, paths] of Object.entries(policyPaths)) {
    for (const path of paths) {
      try {
        const text = await fetchPolicyFromUrl(baseUrl + path);
        if (text && text.length > 100) {
          found[policyType] = baseUrl + path;
          break;
        }
      } catch { /* try next path */ }
    }
  }

  if (Object.keys(found).length === 0) {
    return {
      sellerUrl: baseUrl,
      policiesFound: [],
      riskLevel: "unknown",
      message: "Could not automatically locate policy pages. Please provide direct policy URLs.",
    };
  }

  const analyses: Record<string, unknown> = {};
  let totalScore = 0;
  let scoreCount = 0;
  const allFindings: string[] = [];
  const errors: string[] = [];

  for (const [policyType, url] of Object.entries(found)) {
    try {
      const analysis = await analyseFromUrl(url);
      analyses[policyType] = analysis;
      totalScore += analysis.buyerProtectionScore;
      scoreCount++;
      allFindings.push(...analysis.keyFindings);
    } catch (err) {
      errors.push(`${policyType}: ${(err as Error).message}`);
    }
  }

  const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
  let overallRisk: string;
  if (avgScore >= 80) overallRisk = "low";
  else if (avgScore >= 60) overallRisk = "medium";
  else if (avgScore >= 40) overallRisk = "high";
  else overallRisk = "critical";

  return {
    sellerUrl: baseUrl,
    policiesFound: Object.keys(found),
    policyUrls: found,
    riskLevel: overallRisk,
    buyerProtectionScore: avgScore,
    recommendation:
      avgScore >= 80 ? "proceed"
        : avgScore >= 60 ? "proceed_with_caution"
        : avgScore >= 40 ? "review_carefully"
        : "not_recommended",
    keyFindings: [...new Set(allFindings)],
    analyses,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ── Intent extraction from natural language ──────────────────────────────────

function extractIntent(text: string): { skill: string; url?: string; rawText?: string } {
  const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/);
  const url = urlMatch ? urlMatch[0] : undefined;
  const lower = text.toLowerCase();

  if (lower.includes("quick") && lower.includes("check")) return { skill: "quick-risk-check", url };
  if (lower.includes("return") || lower.includes("refund")) return { skill: "return-policy-analysis", url, rawText: url ? undefined : text };
  if (lower.includes("shipping") || lower.includes("delivery")) return { skill: "shipping-policy-analysis", url, rawText: url ? undefined : text };
  if (lower.includes("warranty") || lower.includes("guarantee")) return { skill: "warranty-analysis", url, rawText: url ? undefined : text };
  if (lower.includes("terms") || lower.includes("legal") || lower.includes("arbitration")) return { skill: "terms-analysis", url, rawText: url ? undefined : text };
  if (url) return { skill: "comprehensive-policy-analysis", url };
  return { skill: "comprehensive-policy-analysis", rawText: text };
}

// ── A2A message/send handler ─────────────────────────────────────────────────

async function handleMessageSend(params: Record<string, unknown>): Promise<Task> {
  const message = params.message as TaskMessage | undefined;
  const taskId = (params.taskId as string) || generateTaskId();

  if (!message || !message.parts || message.parts.length === 0) {
    throw { code: -32602, message: "Invalid params: message with parts required" };
  }

  const textPart = message.parts.find((p) => p.kind === "text");
  const dataPart = message.parts.find((p) => p.kind === "data");

  let analysisResult: Record<string, unknown>;

  if (dataPart && dataPart.data) {
    const data = dataPart.data as Record<string, string>;
    if (data.seller_url && data.skill === "quick-risk-check") {
      analysisResult = await quickRiskCheck(data.seller_url) as Record<string, unknown>;
    } else if (data.url) {
      analysisResult = await analyseFromUrl(data.url) as Record<string, unknown>;
    } else if (data.seller_url) {
      analysisResult = await quickRiskCheck(data.seller_url) as Record<string, unknown>;
    } else {
      throw { code: -32602, message: "Provide seller_url or url in data part" };
    }
  } else if (textPart && textPart.text) {
    const intent = extractIntent(textPart.text);
    if (intent.skill === "quick-risk-check" && intent.url) {
      analysisResult = await quickRiskCheck(intent.url) as Record<string, unknown>;
    } else if (intent.url) {
      analysisResult = await analyseFromUrl(intent.url) as Record<string, unknown>;
    } else if (intent.rawText) {
      analysisResult = { source: "raw_text", ...analyseText(intent.rawText) };
    } else {
      throw { code: -32602, message: "Please provide a seller URL or paste policy text directly." };
    }
  } else {
    throw { code: -32602, message: "No text or data part found in message" };
  }

  // Build human-readable summary
  const summaryLines: string[] = [];
  if (analysisResult.riskLevel) summaryLines.push(`Risk Level: ${(analysisResult.riskLevel as string).toUpperCase()}`);
  if (analysisResult.buyerProtectionScore !== undefined) summaryLines.push(`Buyer Protection Score: ${analysisResult.buyerProtectionScore}/100`);
  if (analysisResult.recommendation) summaryLines.push(`Recommendation: ${analysisResult.recommendation}`);
  if (Array.isArray(analysisResult.keyFindings)) {
    summaryLines.push("", "Key Findings:");
    (analysisResult.keyFindings as string[]).forEach((f) => summaryLines.push(`  ${f}`));
  }

  const task: Task = {
    id: taskId,
    status: {
      state: "completed",
      message: {
        role: "agent",
        parts: [{ kind: "text", text: summaryLines.join("\n") }],
      },
    },
    artifacts: [
      {
        artifactId: generateArtifactId(),
        name: "policy_analysis",
        parts: [
          { kind: "data", data: analysisResult, mimeType: "application/json" },
          { kind: "text", text: summaryLines.join("\n") },
        ],
      },
    ],
  };

  return task;
}

// ── Main JSON-RPC handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JsonRpcRequest;

    if (body.jsonrpc !== "2.0" || !body.method) {
      return jsonRpcError(body.id || null, -32600, "Invalid JSON-RPC 2.0 request");
    }

    switch (body.method) {
      case "message/send": {
        try {
          const task = await handleMessageSend(body.params || {});
          return jsonRpcSuccess(body.id, task);
        } catch (err: any) {
          if (err.code) return jsonRpcError(body.id, err.code, err.message);
          return jsonRpcError(body.id, -32000, err.message || "Analysis failed");
        }
      }
      case "tasks/get": {
        return jsonRpcError(body.id, -32001, "PolicyCheck is stateless. Tasks complete immediately via message/send.");
      }
      default:
        return jsonRpcError(body.id, -32601, `Method not found: ${body.method}`);
    }
  } catch (err) {
    console.error("A2A endpoint error:", err);
    return jsonRpcError(null, -32700, "Parse error");
  }
}

export async function GET() {
  return NextResponse.json({
    name: "PolicyCheck",
    description: "Pre-purchase policy analysis service agent. Send a JSON-RPC 2.0 POST to this endpoint.",
    agentCard: "https://legaleasy.tools/.well-known/agent.json",
    documentation: "https://legaleasy.tools/docs/a2a",
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}
