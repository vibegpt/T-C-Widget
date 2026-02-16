import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PolicyCheck API Documentation",
  description:
    "API documentation for PolicyCheck — structured seller policy risk analysis for AI agents. REST, A2A, x402, and MCP integration guides.",
};

// ── Clause registry data (inlined to avoid fs in client component) ──────────

const CLAUSE_TYPES: Record<
  string,
  { category: string; description: string; typical_severity: string }
> = {
  binding_arbitration: { category: "legal", description: "Disputes must be resolved through binding arbitration, not courts", typical_severity: "high" },
  class_action_waiver: { category: "legal", description: "Buyer waives right to participate in class action lawsuits", typical_severity: "high" },
  liability_cap: { category: "legal", description: "Seller limits maximum liability, often to purchase price or a fixed amount", typical_severity: "medium" },
  termination_at_will: { category: "legal", description: "Seller can terminate account or service at any time without cause", typical_severity: "medium" },
  jurisdiction_clause: { category: "legal", description: "Disputes must be resolved in a specific jurisdiction chosen by seller", typical_severity: "low" },
  auto_renewal: { category: "legal", description: "Subscription or service automatically renews unless cancelled", typical_severity: "low" },
  no_returns: { category: "returns", description: "Seller does not accept returns at all", typical_severity: "high" },
  final_sale: { category: "returns", description: "All sales are final, no refunds or exchanges", typical_severity: "high" },
  no_refund: { category: "returns", description: "All sales are final, no refunds provided", typical_severity: "high" },
  no_refund_opened: { category: "returns", description: "Opened or used items cannot be returned for a refund", typical_severity: "high" },
  restocking_fee: { category: "returns", description: "A percentage fee is deducted from refund on returned items", typical_severity: "medium" },
  return_shipping_fee: { category: "returns", description: "Buyer must pay shipping costs to return items", typical_severity: "medium" },
  short_return_window: { category: "returns", description: "Return window is shorter than the industry standard 30 days", typical_severity: "low" },
  exchange_only: { category: "returns", description: "Returns result in exchange or store credit only, no cash refund", typical_severity: "medium" },
  store_credit_only: { category: "returns", description: "Refunds issued as store credit rather than original payment method", typical_severity: "medium" },
  non_refundable_categories: { category: "returns", description: "Certain product categories are excluded from returns/refunds", typical_severity: "medium" },
  price_adjustment_clause: { category: "pricing", description: "Seller reserves right to adjust prices after purchase", typical_severity: "high" },
  hidden_fees: { category: "pricing", description: "Additional fees not clearly disclosed upfront", typical_severity: "high" },
  data_selling: { category: "privacy", description: "Seller sells or shares personal data with third parties for profit", typical_severity: "high" },
  broad_data_collection: { category: "privacy", description: "Seller collects more personal data than necessary for the transaction", typical_severity: "medium" },
  no_tracking: { category: "shipping", description: "No shipment tracking provided", typical_severity: "medium" },
  long_handling_time: { category: "shipping", description: "Unusually long handling or processing time before shipment", typical_severity: "low" },
};

// ── Sidebar nav sections ────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "quick-start", label: "Quick Start" },
  { id: "endpoints", label: "Endpoints" },
  { id: "endpoint-check", label: "POST /api/check", indent: true },
  { id: "endpoint-a2a", label: "POST /api/a2a", indent: true },
  { id: "endpoint-x402", label: "POST /api/x402/analyze", indent: true },
  { id: "endpoint-registry", label: "GET /api/clause-registry", indent: true },
  { id: "response-fields", label: "Response Fields" },
  { id: "clause-registry", label: "Clause Registry" },
  { id: "scoring", label: "Scoring System" },
  { id: "integration-patterns", label: "Integration Patterns" },
  { id: "discovery", label: "Discovery & Protocols" },
  { id: "rate-limits", label: "Rate Limits & Pricing" },
  { id: "notes", label: "Important Notes" },
];

// ── Code block component (server component — copy handled by client script) ─

function Code({ children, id }: { children: string; id?: string }) {
  return (
    <div className="relative group my-4">
      <pre
        id={id}
        className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 overflow-x-auto text-sm leading-relaxed font-[family-name:var(--font-geist-mono)]"
      >
        <code className="text-[#e2e8f0]">{children}</code>
      </pre>
      <button
        data-copy-target={id}
        className="copy-btn absolute top-2 right-2 px-2 py-1 text-xs rounded bg-[#2a2a4a] text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[#3a3a5a] hover:text-white"
      >
        Copy
      </button>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-[#1a1a2e] border border-[#2a2a4a] rounded px-1.5 py-0.5 text-sm font-[family-name:var(--font-geist-mono)] text-[#a78bfa]">
      {children}
    </code>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold mt-16 mb-4 pt-4 border-t border-[#2a2a4a] scroll-mt-8">
      {children}
    </h2>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-xl font-semibold mt-10 mb-3 scroll-mt-8">
      {children}
    </h3>
  );
}

function Badge({ color, children }: { color: "green" | "blue" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
  const colors = {
    green: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
    blue: "bg-blue-900/50 text-blue-300 border-blue-700/50",
    yellow: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
    red: "bg-red-900/50 text-red-300 border-red-700/50",
    gray: "bg-gray-800/50 text-gray-300 border-gray-600/50",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function MethodBadge({ method }: { method: "POST" | "GET" }) {
  return method === "POST" ? <Badge color="green">POST</Badge> : <Badge color="blue">GET</Badge>;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <>
      {/* Client-side copy script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              var btn = e.target.closest('.copy-btn');
              if (!btn) return;
              var targetId = btn.getAttribute('data-copy-target');
              var pre = targetId ? document.getElementById(targetId) : btn.closest('.relative')?.querySelector('pre');
              if (!pre) return;
              navigator.clipboard.writeText(pre.textContent || '').then(function() {
                var orig = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(function() { btn.textContent = orig; }, 2000);
              });
            });
          `,
        }}
      />

      <div className="min-h-screen bg-[#0a0a0a] text-[#e2e8f0]">
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#2a2a4a] h-14 flex items-center px-6">
          <a href="/" className="text-lg font-semibold text-white mr-2">
            PolicyCheck
          </a>
          <span className="text-[#64748b] text-sm">API Documentation</span>
          <div className="ml-auto flex gap-4 text-sm">
            <a href="https://github.com/vibegpt/T-C-Widget" className="text-[#94a3b8] hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://policycheck.tools/.well-known/agent.json" className="text-[#94a3b8] hover:text-white transition-colors">
              Agent Card
            </a>
          </div>
        </header>

        <div className="flex pt-14">
          {/* Sidebar */}
          <nav className="hidden lg:block fixed top-14 left-0 w-60 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-[#2a2a4a] p-4">
            <ul className="space-y-1">
              {NAV_SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`block py-1.5 text-sm transition-colors hover:text-white ${
                      s.indent
                        ? "pl-4 text-[#64748b] hover:text-[#94a3b8]"
                        : "text-[#94a3b8] font-medium"
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main content */}
          <main className="lg:ml-60 max-w-4xl mx-auto px-6 py-10 w-full">
            {/* ───────── Overview ───────── */}
            <h1 id="overview" className="text-4xl font-bold mb-4 scroll-mt-20">
              PolicyCheck API
            </h1>
            <p className="text-lg text-[#94a3b8] mb-6 leading-relaxed">
              Pre-purchase seller policy verification for AI agents. Analyzes return policies, shipping terms,
              terms of service, and privacy policies — returns structured risk data so your agent can make
              informed purchasing decisions.
            </p>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 mb-8">
              <p className="text-sm text-[#94a3b8]">
                <strong className="text-[#e2e8f0]">Design principle:</strong> PolicyCheck is an intelligence
                provider, not a gatekeeper. It returns factual risk classifications and scores — your agent
                decides what to do with them. No purchase recommendations, no &quot;safe to buy&quot; verdicts.
              </p>
            </div>
            <p className="text-[#94a3b8] mb-2">Base URL:</p>
            <Code id="base-url">https://policycheck.tools</Code>

            {/* ───────── Quick Start ───────── */}
            <H2 id="quick-start">Quick Start</H2>
            <p className="text-[#94a3b8] mb-4">
              Analyze a seller by URL — PolicyCheck auto-discovers and fetches return, shipping, terms, and
              privacy policy pages:
            </p>
            <Code id="qs-url">{`curl -X POST https://policycheck.tools/api/check \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://amazon.com"}'`}</Code>

            <p className="text-[#94a3b8] mb-4">Or provide policy text directly for highest-confidence analysis:</p>
            <Code id="qs-text">{`curl -X POST https://policycheck.tools/api/check \\
  -H "Content-Type: application/json" \\
  -d '{"policy_text": "All sales are final. No refunds. 25% restocking fee."}'`}</Code>

            {/* ───────── Endpoints ───────── */}
            <H2 id="endpoints">Endpoints</H2>

            {/* /api/check */}
            <H3 id="endpoint-check">
              <MethodBadge method="POST" /> /api/check
            </H3>
            <p className="text-[#94a3b8] mb-4">
              Primary REST endpoint. Accepts a seller URL or raw policy text and returns a full risk
              assessment. Supports CORS for browser-based clients.
            </p>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-2 mt-6">Request Body</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="border-b border-[#2a2a4a]">
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Field</th>
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Type</th>
                    <th className="text-left py-2 text-[#94a3b8] font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-[#e2e8f0]">
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] text-[#a78bfa]">url</td>
                    <td className="py-2 pr-4 text-[#94a3b8]">string</td>
                    <td className="py-2 text-[#94a3b8]">Seller homepage URL. PolicyCheck auto-discovers policy pages.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] text-[#a78bfa]">seller_url</td>
                    <td className="py-2 pr-4 text-[#94a3b8]">string</td>
                    <td className="py-2 text-[#94a3b8]">Alias for <InlineCode>url</InlineCode>.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] text-[#a78bfa]">policy_text</td>
                    <td className="py-2 pr-4 text-[#94a3b8]">string</td>
                    <td className="py-2 text-[#94a3b8]">Raw policy text to analyze directly. Higher confidence than URL fetch.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] text-[#a78bfa]">text</td>
                    <td className="py-2 pr-4 text-[#94a3b8]">string</td>
                    <td className="py-2 text-[#94a3b8]">Alias for <InlineCode>policy_text</InlineCode>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-[#64748b] mb-6">
              Provide at least one of <InlineCode>url</InlineCode>/<InlineCode>seller_url</InlineCode> or{" "}
              <InlineCode>policy_text</InlineCode>/<InlineCode>text</InlineCode>. Both can be provided together.
            </p>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-2">Response</h4>
            <Code id="check-response">{`{
  "seller_url": "https://amazon.com",
  "risk_score": 1.5,                      // number | null — 0-10 scale
  "risk_level": "low",                    // "low" | "medium" | "high" | "critical" | "unknown"
  "buyer_protection_rating": "A",         // string | null — letter grade A+ through F
  "buyer_protection_score": 85,           // number | null — 0-100 (inverse of risk)
  "risk_factors": [
    {
      "factor": "return_shipping_fee",    // clause type identifier
      "severity": "low",                  // "high" | "medium" | "low"
      "detail": "Buyer pays return shipping costs.",
      "source": "returns",                // "returns" | "legal" | "pricing" | "privacy" | "shipping"
      "found_in": "return_policy",        // which policy page contained this clause
      "severity_note": null               // "standard_tos_boilerplate" when severity was discounted
    }
  ],
  "positives": [                          // consumer-friendly policies found
    "Free shipping on orders over $25"
  ],
  "summary": "3 of 4 policy categories analyzed. Return shipping fee detected.",
  "flags": ["return_shipping_fee"],       // flat array of clause type names
  "fetch_method": "server_fetch",         // "server_fetch" | "client_provided" | "text_input"
  "analysis_status": "partial",           // "complete" | "partial" | "no_content" | "text_provided"
  "confidence": "medium",                 // "high" | "medium" | "low" | "none"
  "analysis_method": "regex_plus_llm",    // "regex_plus_llm" | "regex_only" | "none"
  "analyzed_at": "2026-02-16T11:29:53Z"   // ISO 8601 timestamp
}`}</Code>

            <p className="text-sm text-[#64748b] mb-6">
              When <InlineCode>analysis_status</InlineCode> is <InlineCode>&quot;no_content&quot;</InlineCode>,{" "}
              <InlineCode>risk_score</InlineCode>, <InlineCode>buyer_protection_rating</InlineCode>, and{" "}
              <InlineCode>buyer_protection_score</InlineCode> will be <InlineCode>null</InlineCode>.
              See <a href="#response-fields" className="text-[#a78bfa] hover:underline">Response Fields</a> for details.
            </p>

            {/* /api/a2a */}
            <H3 id="endpoint-a2a">
              <MethodBadge method="POST" /> /api/a2a
            </H3>
            <p className="text-[#94a3b8] mb-4">
              JSON-RPC 2.0 endpoint implementing the{" "}
              <a href="https://a2a-protocol.org" className="text-[#a78bfa] hover:underline">Agent-to-Agent (A2A) protocol</a>.
              For agent frameworks that support A2A discovery and task delegation.
            </p>
            <p className="text-[#94a3b8] mb-4">
              Agent card: <InlineCode>https://policycheck.tools/.well-known/agent.json</InlineCode>
            </p>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-2 mt-6">Request</h4>
            <Code id="a2a-request">{`curl -X POST https://policycheck.tools/api/a2a \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [
          {
            "kind": "data",
            "data": { "seller_url": "https://amazon.com" }
          }
        ]
      }
    }
  }'`}</Code>

            <p className="text-[#94a3b8] mb-4">
              The response includes a completed task with both a human-readable text summary and a structured
              data artifact containing the same fields as <InlineCode>/api/check</InlineCode>.
              You can also send natural language — the endpoint extracts URLs from text parts.
            </p>

            {/* /api/x402/analyze */}
            <H3 id="endpoint-x402">
              <MethodBadge method="POST" /> /api/x402/analyze
            </H3>
            <p className="text-[#94a3b8] mb-4">
              Paid analysis endpoint using the{" "}
              <a href="https://www.x402.org" className="text-[#a78bfa] hover:underline">x402 micropayment protocol</a>.
              First request returns HTTP 402 with payment requirements. After paying on Base mainnet, re-send
              with the <InlineCode>X-PAYMENT</InlineCode> header.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-4">
                <tbody className="text-[#e2e8f0]">
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4 text-[#94a3b8] font-medium w-36">Price</td>
                    <td className="py-2">$0.03 per analysis</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4 text-[#94a3b8] font-medium">Network</td>
                    <td className="py-2">Base mainnet (eip155:8453)</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4 text-[#94a3b8] font-medium">Body fields</td>
                    <td className="py-2">
                      <InlineCode>url</InlineCode>, <InlineCode>sellerUrl</InlineCode>, <InlineCode>seller_url</InlineCode>,{" "}
                      <InlineCode>text</InlineCode>, or <InlineCode>policy_text</InlineCode>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#94a3b8] mb-4">
              The response wraps the analysis inside a <InlineCode>payment</InlineCode> +{" "}
              <InlineCode>analysis</InlineCode> envelope:
            </p>
            <Code id="x402-response">{`{
  "payment": {
    "settled": true,
    "transaction": "0x...",
    "network": "eip155:8453",
    "payer": "0x..."
  },
  "analysis": {
    "risk_score": 1.5,
    "risk_level": "low",
    "flags": ["return_shipping_fee"],
    ...                                   // same fields as /api/check
  }
}`}</Code>

            {/* /api/clause-registry */}
            <H3 id="endpoint-registry">
              <MethodBadge method="GET" /> /api/clause-registry
            </H3>
            <p className="text-[#94a3b8] mb-4">
              Returns the versioned registry of all clause types PolicyCheck can detect. Use this to build
              rules against stable identifiers. Cached for 24 hours.
            </p>
            <Code id="registry-request">{`curl https://policycheck.tools/api/clause-registry`}</Code>
            <p className="text-[#94a3b8] mb-4">
              See the full registry contents in the{" "}
              <a href="#clause-registry" className="text-[#a78bfa] hover:underline">Clause Registry</a> section below.
            </p>

            {/* ───────── Response Fields Deep Dive ───────── */}
            <H2 id="response-fields">Response Fields Deep Dive</H2>

            <h4 className="text-lg font-semibold mt-6 mb-2">
              <InlineCode>flags</InlineCode>
            </h4>
            <p className="text-[#94a3b8] mb-4">
              The primary field for rule-based agents. A flat string array of detected clause type identifiers.
              An agent with a user preference of &quot;never buy from sellers with binding arbitration&quot; just checks:
            </p>
            <Code id="flags-example">{`if (result.flags.includes("binding_arbitration")) {
  // abort purchase or ask human for confirmation
}`}</Code>

            <h4 className="text-lg font-semibold mt-8 mb-2">
              <InlineCode>analysis_status</InlineCode> + <InlineCode>confidence</InlineCode>
            </h4>
            <p className="text-[#94a3b8] mb-4">
              <strong className="text-[#e2e8f0]">Critical for agents to check before trusting scores.</strong>{" "}
              If <InlineCode>analysis_status === &quot;no_content&quot;</InlineCode>, the scores are{" "}
              <InlineCode>null</InlineCode> and should not be used for decisions. The agent should fall back
              to browser-based analysis or flag for human review.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="border-b border-[#2a2a4a]">
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Status</th>
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Confidence</th>
                    <th className="text-left py-2 text-[#94a3b8] font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-[#e2e8f0]">
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><InlineCode>complete</InlineCode></td>
                    <td className="py-2 pr-4"><InlineCode>high</InlineCode></td>
                    <td className="py-2 text-[#94a3b8]">All policy categories fetched and analyzed.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><InlineCode>partial</InlineCode></td>
                    <td className="py-2 pr-4"><InlineCode>medium</InlineCode> / <InlineCode>low</InlineCode></td>
                    <td className="py-2 text-[#94a3b8]">Some policy pages fetched. Score reflects only what was found.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><InlineCode>text_provided</InlineCode></td>
                    <td className="py-2 pr-4"><InlineCode>high</InlineCode></td>
                    <td className="py-2 text-[#94a3b8]">Agent provided the policy text. Highest trust.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><InlineCode>no_content</InlineCode></td>
                    <td className="py-2 pr-4"><InlineCode>none</InlineCode></td>
                    <td className="py-2 text-[#94a3b8]">No text extracted. All scores are <InlineCode>null</InlineCode>. Do not use for decisions.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="text-lg font-semibold mt-8 mb-2">
              <InlineCode>fetch_method</InlineCode>
            </h4>
            <p className="text-[#94a3b8] mb-4">
              Indicates data provenance:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="border-b border-[#2a2a4a]">
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Value</th>
                    <th className="text-left py-2 text-[#94a3b8] font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-[#e2e8f0]">
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><InlineCode>server_fetch</InlineCode></td>
                    <td className="py-2 text-[#94a3b8]">PolicyCheck fetched and parsed the policies from the seller&apos;s site.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><InlineCode>client_provided</InlineCode></td>
                    <td className="py-2 text-[#94a3b8]">The calling agent provided policy text along with a URL. Higher trust — the agent likely rendered the page in a browser.</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><InlineCode>text_input</InlineCode></td>
                    <td className="py-2 text-[#94a3b8]">Raw text provided without a URL.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="text-lg font-semibold mt-8 mb-2">
              <InlineCode>found_in</InlineCode> + <InlineCode>severity_note</InlineCode>
            </h4>
            <p className="text-[#94a3b8] mb-4">
              On each risk factor, <InlineCode>found_in</InlineCode> indicates which policy page contained the
              clause: <InlineCode>return_policy</InlineCode>, <InlineCode>shipping_policy</InlineCode>,{" "}
              <InlineCode>terms_of_service</InlineCode>, <InlineCode>privacy_policy</InlineCode>, or{" "}
              <InlineCode>unknown</InlineCode>.
            </p>
            <p className="text-[#94a3b8] mb-4">
              When <InlineCode>severity_note</InlineCode> is <InlineCode>&quot;standard_tos_boilerplate&quot;</InlineCode>,
              the clause was found in terms of service and its severity was discounted in scoring. Standard legal
              clauses like binding arbitration appear in nearly every major retailer&apos;s ToS — they&apos;re still
              reported as findings but scored as low severity rather than high.
            </p>

            {/* ───────── Clause Registry ───────── */}
            <H2 id="clause-registry">Clause Registry</H2>
            <p className="text-[#94a3b8] mb-4">
              All clause types PolicyCheck can detect. Identifiers are stable within a major version — agent
              developers can safely write rules against these names. Current version:{" "}
              <InlineCode>1.0.1</InlineCode>
            </p>
            <p className="text-[#94a3b8] mb-6">
              Live endpoint: <InlineCode>GET https://policycheck.tools/api/clause-registry</InlineCode>
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-8">
                <thead>
                  <tr className="border-b border-[#2a2a4a]">
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Clause Type</th>
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Category</th>
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Description</th>
                    <th className="text-left py-2 text-[#94a3b8] font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody className="text-[#e2e8f0]">
                  {Object.entries(CLAUSE_TYPES).map(([name, info]) => (
                    <tr key={name} className="border-b border-[#1a1a2e]">
                      <td className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] text-[#a78bfa] text-xs whitespace-nowrap">
                        {name}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <Badge
                          color={
                            info.category === "legal"
                              ? "blue"
                              : info.category === "returns"
                                ? "yellow"
                                : info.category === "pricing"
                                  ? "red"
                                  : info.category === "privacy"
                                    ? "gray"
                                    : "green"
                          }
                        >
                          {info.category}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-[#94a3b8]">{info.description}</td>
                      <td className="py-2 whitespace-nowrap">
                        <Badge
                          color={
                            info.typical_severity === "high"
                              ? "red"
                              : info.typical_severity === "medium"
                                ? "yellow"
                                : "green"
                          }
                        >
                          {info.typical_severity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ───────── Scoring System ───────── */}
            <H2 id="scoring">Scoring System</H2>
            <p className="text-[#94a3b8] mb-4">
              Risk scores are calculated <strong className="text-[#e2e8f0]">deterministically</strong> from
              detected risk factors — the LLM identifies clauses, but the score comes from a fixed formula:
            </p>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-2 mt-6">
              Severity Weights
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="border-b border-[#2a2a4a]">
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Severity</th>
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Weight</th>
                    <th className="text-left py-2 text-[#94a3b8] font-medium">Example</th>
                  </tr>
                </thead>
                <tbody className="text-[#e2e8f0]">
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><Badge color="red">high</Badge></td>
                    <td className="py-2 pr-4">+2.0</td>
                    <td className="py-2 text-[#94a3b8]">no_refund, binding_arbitration, hidden_fees</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><Badge color="yellow">medium</Badge></td>
                    <td className="py-2 pr-4">+1.0</td>
                    <td className="py-2 text-[#94a3b8]">restocking_fee, store_credit_only, data_selling</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]">
                    <td className="py-2 pr-4"><Badge color="green">low</Badge></td>
                    <td className="py-2 pr-4">+0.5</td>
                    <td className="py-2 text-[#94a3b8]">return_shipping_fee, jurisdiction_clause</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#94a3b8] mb-6">
              Risk score is the sum of all weights, capped at 10. A seller with 3 high-severity clauses and
              1 medium scores: 2.0 + 2.0 + 2.0 + 1.0 = <strong className="text-[#e2e8f0]">7.0</strong>.
            </p>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-2">Grade Scale</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr className="border-b border-[#2a2a4a]">
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Risk Score</th>
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Grade</th>
                    <th className="text-left py-2 text-[#94a3b8] font-medium">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="text-[#e2e8f0]">
                  {[
                    ["0 – 1", "A+", "low"],
                    ["1.1 – 2", "A", "low"],
                    ["2.1 – 3", "B+", "medium"],
                    ["3.1 – 4", "B", "medium"],
                    ["4.1 – 5", "C+", "medium"],
                    ["5.1 – 6", "C", "medium"],
                    ["6.1 – 7", "D+", "high"],
                    ["7.1 – 8", "D", "high"],
                    ["8.1 – 10", "F", "critical"],
                  ].map(([range, grade, level]) => (
                    <tr key={grade} className="border-b border-[#1a1a2e]">
                      <td className="py-1.5 pr-4 font-[family-name:var(--font-geist-mono)]">{range}</td>
                      <td className="py-1.5 pr-4 font-semibold">{grade}</td>
                      <td className="py-1.5">
                        <Badge
                          color={
                            level === "low" ? "green" : level === "medium" ? "yellow" : level === "high" ? "red" : "red"
                          }
                        >
                          {level}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-2">
              Buyer Protection Score
            </h4>
            <p className="text-[#94a3b8] mb-4">
              <InlineCode>buyer_protection_score = 100 - (risk_score × 10)</InlineCode>, clamped to 0–100.
              A risk score of 1.5 yields a buyer protection score of 85.
            </p>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-2 mt-6">
              ToS Boilerplate Discounting
            </h4>
            <p className="text-[#94a3b8] mb-4">
              When analyzing via URL (not raw text), certain legal clauses found <em>only</em> in the terms of
              service page are downgraded to low severity. These clauses appear in virtually every major
              retailer&apos;s ToS and inflate scores when treated as high severity:
            </p>
            <ul className="list-disc list-inside text-[#94a3b8] mb-4 space-y-1">
              <li><InlineCode>binding_arbitration</InlineCode></li>
              <li><InlineCode>class_action_waiver</InlineCode></li>
              <li><InlineCode>termination_at_will</InlineCode></li>
              <li><InlineCode>liability_cap</InlineCode></li>
            </ul>
            <p className="text-[#94a3b8] mb-4">
              These clauses are still reported in <InlineCode>risk_factors</InlineCode> with their original
              severity, but the <InlineCode>severity_note</InlineCode> field is set to{" "}
              <InlineCode>&quot;standard_tos_boilerplate&quot;</InlineCode> and scoring uses low weight (0.5 instead
              of 2.0).
            </p>

            {/* ───────── Integration Patterns ───────── */}
            <H2 id="integration-patterns">Integration Patterns</H2>

            <h4 className="text-lg font-semibold mt-6 mb-3">Pattern 1: Pre-purchase Check</h4>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 mb-2 font-[family-name:var(--font-geist-mono)] text-sm text-[#94a3b8] overflow-x-auto">
              User → Agent → finds product → <span className="text-[#a78bfa]">PolicyCheck</span> → risk report → Agent decides → purchase or abort
            </div>
            <Code id="pattern-1">{`const result = await fetch("https://policycheck.tools/api/check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: sellerUrl }),
}).then(r => r.json());

if (result.analysis_status === "no_content") {
  // Can't analyze — ask human or try browser-based approach
  return askHuman(\`Could not analyze \${sellerUrl}. Proceed anyway?\`);
}

if (result.risk_level === "critical") {
  return abort("Seller has critical risk indicators");
}

proceed();`}</Code>

            <h4 className="text-lg font-semibold mt-10 mb-3">Pattern 2: Threshold-based Automation</h4>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 mb-2 font-[family-name:var(--font-geist-mono)] text-sm text-[#94a3b8] overflow-x-auto">
              Agent has rule: buyer_protection_score &gt;= 70 → auto-proceed | &lt; 70 → ask human
            </div>
            <Code id="pattern-2">{`const MIN_SCORE = 70;

if (result.buyer_protection_score === null) {
  return askHuman("Unable to verify seller policies.");
}

if (result.buyer_protection_score >= MIN_SCORE) {
  proceed();  // score 85 → auto-approve
} else {
  askHuman(\`Buyer protection score is \${result.buyer_protection_score}/100.\`);
}`}</Code>

            <h4 className="text-lg font-semibold mt-10 mb-3">Pattern 3: Dealbreaker Flags</h4>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 mb-2 font-[family-name:var(--font-geist-mono)] text-sm text-[#94a3b8] overflow-x-auto">
              Agent has dealbreakers → check flags → match found → abort | no match → proceed
            </div>
            <Code id="pattern-3">{`const DEALBREAKERS = ["no_refund", "no_returns", "hidden_fees"];

const matched = result.flags.filter(f => DEALBREAKERS.includes(f));
if (matched.length > 0) {
  abort(\`Dealbreaker policies found: \${matched.join(", ")}\`);
} else {
  proceed();
}`}</Code>

            {/* ───────── Discovery & Protocols ───────── */}
            <H2 id="discovery">Discovery &amp; Protocols</H2>
            <p className="text-[#94a3b8] mb-6">
              PolicyCheck is available through multiple discovery mechanisms and protocols:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-8">
                <thead>
                  <tr className="border-b border-[#2a2a4a]">
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">Method</th>
                    <th className="text-left py-2 pr-4 text-[#94a3b8] font-medium">URL / Identifier</th>
                    <th className="text-left py-2 text-[#94a3b8] font-medium">Protocol</th>
                  </tr>
                </thead>
                <tbody className="text-[#e2e8f0]">
                  {[
                    ["REST API", "POST policycheck.tools/api/check", "HTTP"],
                    ["A2A Agent Card", "policycheck.tools/.well-known/agent.json", "A2A"],
                    ["x402 Payments", "POST policycheck.tools/api/x402/analyze", "x402"],
                    ["MCP Server", "npx policycheck-mcp", "MCP"],
                    ["Chrome Extension", "Chrome Web Store", "WebMCP"],
                    ["OpenAPI Spec", "policycheck.tools/openapi.json", "OpenAPI"],
                    ["Clause Registry", "GET policycheck.tools/api/clause-registry", "HTTP"],
                  ].map(([method, url, protocol]) => (
                    <tr key={method} className="border-b border-[#1a1a2e]">
                      <td className="py-2 pr-4 font-medium whitespace-nowrap">{method}</td>
                      <td className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] text-xs text-[#a78bfa]">
                        {url}
                      </td>
                      <td className="py-2">
                        <Badge color="gray">{protocol}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ───────── Rate Limits & Pricing ───────── */}
            <H2 id="rate-limits">Rate Limits &amp; Pricing</H2>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#94a3b8]">
                <strong className="text-emerald-400">Free during beta.</strong> The{" "}
                <InlineCode>/api/check</InlineCode> and <InlineCode>/api/a2a</InlineCode> endpoints are
                currently free with no enforced rate limits. The <InlineCode>/api/x402/analyze</InlineCode>{" "}
                endpoint charges $0.03 per analysis via on-chain micropayment.
              </p>
            </div>
            <p className="text-[#94a3b8] mb-4">
              Results are cached by domain for 24 hours on the server side. Repeated requests for the same
              seller URL return cached results instantly. Providing <InlineCode>policy_text</InlineCode>{" "}
              bypasses the cache.
            </p>

            {/* ───────── Important Notes ───────── */}
            <H2 id="notes">Important Notes</H2>
            <ul className="space-y-4 text-[#94a3b8] mb-12">
              <li className="flex gap-3">
                <span className="text-[#64748b] select-none shrink-0">1.</span>
                <span>
                  <strong className="text-[#e2e8f0]">Intelligence provider, not gatekeeper.</strong>{" "}
                  PolicyCheck returns factual risk classifications and scores. It does not make
                  purchase recommendations or issue &quot;safe to buy&quot; verdicts. Your agent decides what to do
                  with the data.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#64748b] select-none shrink-0">2.</span>
                <span>
                  <strong className="text-[#e2e8f0]">Always check <InlineCode>analysis_status</InlineCode>.</strong>{" "}
                  Scores reflect only what could be analyzed. A <InlineCode>null</InlineCode> score
                  means &quot;no data&quot;, not &quot;perfect seller.&quot; Never treat missing data as a positive signal.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#64748b] select-none shrink-0">3.</span>
                <span>
                  <strong className="text-[#e2e8f0]">JavaScript-rendered sites.</strong> Server-side
                  fetching cannot analyze SPAs or bot-protected sites (e.g., Temu, Best Buy). For
                  these, use the Chrome extension or provide <InlineCode>policy_text</InlineCode>{" "}
                  directly from a browser context.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#64748b] select-none shrink-0">4.</span>
                <span>
                  <strong className="text-[#e2e8f0]">Not legal advice.</strong> PolicyCheck identifies
                  policy clauses and classifies risk levels. It is not a substitute for legal counsel.
                </span>
              </li>
            </ul>

            {/* Footer */}
            <div className="border-t border-[#2a2a4a] pt-6 pb-12 text-sm text-[#64748b]">
              <p>
                PolicyCheck &middot;{" "}
                <a href="https://github.com/vibegpt/T-C-Widget" className="hover:text-[#94a3b8] transition-colors">
                  GitHub
                </a>{" "}
                &middot;{" "}
                <a href="https://policycheck.tools/.well-known/agent.json" className="hover:text-[#94a3b8] transition-colors">
                  Agent Card
                </a>{" "}
                &middot;{" "}
                <a href="https://policycheck.tools/api/clause-registry" className="hover:text-[#94a3b8] transition-colors">
                  Clause Registry
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
