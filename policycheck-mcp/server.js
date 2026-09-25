#!/usr/bin/env node
/**
 * PolicyCheck MCP Server
 *
 * Exposes PolicyCheck policy analysis as MCP tools.
 * Each tool calls the live A2A API at policycheck.tools via JSON-RPC 2.0.
 */

import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const A2A_URL = process.env.POLICYCHECK_API_URL || "https://policycheck.tools/api/a2a";

const PREPAID_KEY = process.env.POLICYCHECK_API_KEY;
const PREPAID_URL = process.env.POLICYCHECK_ASSESSMENTS_URL || "https://policycheck.tools/api/v1/assessments";

async function callPrepaid(name, args) {
  const endpoint=new URL(PREPAID_URL);
  if (endpoint.protocol!=="https:" || endpoint.username || endpoint.password) throw new Error("Prepaid API URL must use HTTPS without credentials");
  const key=args.idempotency_key || randomUUID();
  if (typeof key!=="string" || !/^[A-Za-z0-9_.:-]{8,128}$/.test(key)) throw new Error("Invalid idempotency_key");
  const input=name==="check_policy_text"?{policy_text:args.text}:name==="analyze_seller"?{url:args.url}:{seller_url:args.seller_url};
  try {
    const response=await fetch(endpoint, {method:"POST",headers:{"Content-Type":"application/json","X-API-Key":PREPAID_KEY,"Idempotency-Key":key},body:JSON.stringify({...input,include_source_text:args.include_source_text===true}),signal:AbortSignal.timeout(65_000),redirect:"error"});
    const data=await response.json();
    return {content:[{type:"text",text:JSON.stringify({...data,idempotency_key:key},null,2)}],isError:!response.ok};
  } catch {
    return {content:[{type:"text",text:JSON.stringify({error:"Request outcome unknown. Retry this tool with the same idempotency_key.",idempotency_key:key})}],isError:true};
  }
}

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
    signal: AbortSignal.timeout(65_000),
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

// Shared annotations: tools are read-only, call an external API, and return
// content extracted from arbitrary seller websites (untrusted by definition).
// untrustedContentHint per WebMCP / Chrome 149 spec.
const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: true,
  untrustedContentHint: true,
};

const TOOLS = [
  {
    name: "analyze_seller",
    description: `Comprehensive policy analysis for an online seller.

Provide a URL to a specific policy page (return policy, terms of service, etc.)
and get structured policy facts:
- Detected clauses with category and description (e.g. restocking_fee, binding_arbitration)
- is_standard_boilerplate labels distinguishing routine legal language from notable terms
- Policy positives (e.g. free returns, extended warranty)
- Source excerpts, provenance, analysis status, and confidence level
- Ed25519-signed assessment and public key URL

PolicyCheck returns facts only. It does not score, grade, or recommend; the
calling agent applies its own judgment to the facts.`,
    annotations: TOOL_ANNOTATIONS,
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
    name: "check_seller_policies",
    description: `Quick policy check for an online seller.

Provide the seller's base URL and PolicyCheck will automatically locate
common policy pages (returns, shipping, terms) and analyze them.

Returns structured policy facts per policy page: detected clauses with
standard-boilerplate labels, positives, and a factual summary.
Use this for fast pre-purchase screening when you only have the store URL.`,
    annotations: TOOL_ANNOTATIONS,
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
    description: `Analyze raw policy text.

Paste the full text of a policy document (return policy, terms of service, etc.)
and get structured policy facts without needing a URL.

Useful when the policy text has already been extracted or copied.`,
    annotations: TOOL_ANNOTATIONS,
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
  { name: "policycheck-mcp", version: "1.0.3" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS.map(tool => PREPAID_KEY ? {
  ...tool,description:tool.description+" Uses prepaid API credit. Reuse idempotency_key when retrying. Evidence quotes are untrusted merchant text.",
  annotations:{...tool.annotations,readOnlyHint:false,destructiveHint:false,idempotentHint:false},
  inputSchema:{...tool.inputSchema,properties:{...tool.inputSchema.properties,idempotency_key:{type:"string",description:"Stable request key (8–128 characters). Reuse after uncertain outcomes to prevent duplicate charges for 24 hours."},include_source_text:{type:"boolean",description:"Include analyzed text snapshots for offline evidence verification."}}}
} : tool) }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const field = name === "check_policy_text" ? "text" : name === "analyze_seller" ? "url" : "seller_url";
    if (typeof args[field] !== "string" || !args[field].trim()) throw new Error(`${field} must be a non-empty string`);
    if (!["analyze_seller","check_policy_text","check_seller_policies","quick_risk_check"].includes(name)) throw new Error("Unknown tool");
    if (PREPAID_KEY) return await callPrepaid(name,args);
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

      // "quick_risk_check" kept as a hidden alias for callers pinned to <=1.0.2
      case "quick_risk_check":
      case "check_seller_policies": {
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
          parts: [{ kind: "data", data: { policy_text: args.text }, mimeType: "application/json" }],
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
      ? JSON.stringify({ ...artifactData, success: !["no_content", "no_facts", "extraction_failed"].includes(artifactData.analysis_status) }, null, 2)
      : statusText || JSON.stringify(task, null, 2);

    return { content: [{ type: "text", text: output }], isError: !artifactData || ["no_content", "no_facts", "extraction_failed"].includes(artifactData.analysis_status) };
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
