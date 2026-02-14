#!/usr/bin/env node
/**
 * PolicyCheck MCP Server
 *
 * Exposes PolicyCheck policy analysis as MCP tools.
 * Each tool calls the live A2A API at policycheck.tools via JSON-RPC 2.0.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const A2A_URL = process.env.POLICYCHECK_API_URL || "https://policycheck.tools/api/a2a";

// ── JSON-RPC 2.0 helper ────────────────────────────────────────────────────

let rpcId = 0;

async function callA2A(message) {
  const body = {
    jsonrpc: "2.0",
    id: ++rpcId,
    method: "message/send",
    params: { message },
  };

  const res = await fetch(A2A_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`A2A request failed: HTTP ${res.status}`);
  }

  const json = await res.json();

  if (json.error) {
    throw new Error(json.error.message || "A2A error");
  }

  return json.result;
}

// ── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "analyze_seller",
    description: `Comprehensive policy analysis for an online seller.

Provide a URL to a specific policy page (return policy, terms of service, etc.)
and get a full risk assessment including:
- Risk level (low / medium / high / critical)
- Buyer protection score (0-100)
- Key findings in plain English
- Factual summary of policy risks

Use this to get seller policy risk data to inform purchase decisions.`,
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "URL of the policy page to analyze (e.g. https://example.com/policies/refund-policy)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "quick_risk_check",
    description: `Quick risk check for an online seller.

Provide the seller's base URL and PolicyCheck will automatically locate
common policy pages (returns, shipping, terms) and analyze them.

Returns an overall risk score plus per-policy breakdowns.
Use this for a fast assessment when you only have the store URL.`,
    inputSchema: {
      type: "object",
      properties: {
        seller_url: {
          type: "string",
          description:
            "Base URL of the seller (e.g. https://www.amazon.com)",
        },
      },
      required: ["seller_url"],
    },
  },
  {
    name: "check_policy_text",
    description: `Analyze raw policy text for risks.

Paste the full text of a policy document (return policy, terms of service, etc.)
and get a risk assessment without needing a URL.

Useful when the policy text has already been extracted or copied.`,
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The raw policy text to analyze",
        },
      },
      required: ["text"],
    },
  },
];

// ── Server setup ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "policycheck-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let task;

    switch (name) {
      case "analyze_seller": {
        task = await callA2A({
          role: "user",
          parts: [
            { kind: "data", data: { url: args.url }, mimeType: "application/json" },
          ],
        });
        break;
      }

      case "quick_risk_check": {
        task = await callA2A({
          role: "user",
          parts: [
            {
              kind: "data",
              data: { seller_url: args.seller_url, skill: "quick-risk-check" },
              mimeType: "application/json",
            },
          ],
        });
        break;
      }

      case "check_policy_text": {
        task = await callA2A({
          role: "user",
          parts: [{ kind: "text", text: args.text }],
        });
        break;
      }

      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
          isError: true,
        };
    }

    // Extract results from A2A task response
    const statusText = task.status?.message?.parts?.find((p) => p.kind === "text")?.text || "";
    const artifactData = task.artifacts?.[0]?.parts?.find((p) => p.kind === "data")?.data;

    const output = artifactData
      ? JSON.stringify({ success: true, ...artifactData }, null, 2)
      : statusText || JSON.stringify(task, null, 2);

    return { content: [{ type: "text", text: output }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message, tool: name }) }],
      isError: true,
    };
  }
});

// ── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PolicyCheck MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
