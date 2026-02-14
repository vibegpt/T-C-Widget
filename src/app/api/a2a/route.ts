import { NextRequest, NextResponse } from "next/server";
import {
  fetchPolicyFromUrl,
  analyseText,
  analyseFromUrl,
  quickRiskCheck,
} from "@/lib/policy-analysis";

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
  if (analysisResult.summary) summaryLines.push(`Summary: ${analysisResult.summary}`);
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
    agentCard: "https://policycheck.tools/.well-known/agent.json",
    documentation: "https://policycheck.tools/docs/a2a",
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
