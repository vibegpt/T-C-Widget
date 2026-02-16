import { NextRequest, NextResponse } from "next/server";
import { deepAnalyze } from "@/lib/deepPolicyAnalyzer";

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

function extractIntent(text: string): { url?: string; rawText?: string } {
  const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/);
  const url = urlMatch ? urlMatch[0] : undefined;
  return { url, rawText: url ? undefined : text };
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

  let sellerUrl: string | undefined;
  let policyText: string | undefined;

  if (dataPart && dataPart.data) {
    const data = dataPart.data as Record<string, string>;
    sellerUrl = data.seller_url || data.url;
    policyText = data.policy_text || data.text;
  } else if (textPart && textPart.text) {
    const intent = extractIntent(textPart.text);
    sellerUrl = intent.url;
    policyText = intent.rawText;
  }

  if (!sellerUrl && !policyText) {
    throw { code: -32602, message: "Provide seller_url or url in data part, or paste policy text directly." };
  }

  const analysisResult = await deepAnalyze(
    sellerUrl || "direct text analysis",
    policyText || null,
  );

  // Build human-readable summary
  const summaryLines: string[] = [];
  summaryLines.push(`Risk Level: ${analysisResult.risk_level.toUpperCase()}`);
  summaryLines.push(`Risk Score: ${analysisResult.risk_score}/10`);
  summaryLines.push(`Buyer Protection: ${analysisResult.buyer_protection_rating} (${analysisResult.buyer_protection_score}/100)`);
  if (analysisResult.summary) summaryLines.push(`\nSummary: ${analysisResult.summary}`);

  if (analysisResult.risk_factors.length > 0) {
    summaryLines.push("", "Risk Factors:");
    for (const f of analysisResult.risk_factors) {
      summaryLines.push(`  [${f.severity.toUpperCase()}] ${f.factor}: ${f.detail}`);
    }
  }

  if (analysisResult.positives.length > 0) {
    summaryLines.push("", "Positives:");
    for (const p of analysisResult.positives) {
      summaryLines.push(`  + ${p}`);
    }
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
          { kind: "data", data: analysisResult as unknown as Record<string, unknown>, mimeType: "application/json" },
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
