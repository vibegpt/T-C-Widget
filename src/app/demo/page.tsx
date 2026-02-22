"use client";

import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type Clause = {
  id: string;
  category: string;
  description: string;
  found_in: string;
  is_standard_boilerplate: boolean;
};

type PolicyCategory<T> = {
  summary: string;
  facts: T;
};

type SignedAssessment = {
  version: string;
  provider: string;
  assessment_id: string;
  timestamp: string;
  expires_at: string;
  seller: { domain: string; url: string | null };
  flags: string[];
  clauses_summary: Record<string, number>;
  policies: {
    returns?: PolicyCategory<{
      window_days: number | null;
      return_shipping: string | null;
      restocking_fee: boolean | null;
      refund_method: string | null;
    }>;
    shipping?: PolicyCategory<{
      free_threshold_usd: number | null;
      estimated_days_min: number | null;
      estimated_days_max: number | null;
      tracking_provided: boolean | null;
    }>;
    legal?: PolicyCategory<{
      arbitration: boolean | null;
      class_action_waiver: boolean | null;
      jurisdiction: string | null;
    }>;
    pricing?: PolicyCategory<{ auto_renews: boolean | null }>;
    privacy?: PolicyCategory<{ data_sold: boolean | null }>;
  };
  clauses: Clause[];
  positives: string[];
  summary: string;
  analysis_status: string;
  confidence: string;
};

type AssessmentResult = {
  signed_assessment: SignedAssessment;
  signature: string;
  signed_payload_hash: string;
  verification_url: string;
  jwks_url: string;
};

type VerificationResult = {
  valid: boolean;
  assessment_id?: string;
  seller_domain?: string;
  expires_at?: string;
  verified_at?: string;
  reason?: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const QUICK_PICKS = ["https://amazon.com", "https://target.com", "https://6pm.com"];

const FETCH_SNIPPET = `const result = await fetch("https://policycheck.tools/api/v1/signed-assessment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ seller_url: "https://amazon.com" }),
}).then(r => r.json());

// result.signed_assessment.policies  — structured policy facts
// result.signed_assessment.clauses   — detected clauses with is_standard_boilerplate
// result.signed_assessment.flags     — flat array of clause IDs
// result.signature                   — Ed25519 signature (base64url)
// result.verification_url            — where to verify`;

const MCP_SNIPPET = `// After installing: npx policycheck-mcp
// In your agent or MCP-compatible tool:

const assessment = await tools.get_signed_assessment({
  seller_url: "https://amazon.com"
});

// assessment.policies.returns.facts.window_days   // e.g. 30
// assessment.policies.returns.facts.return_shipping // "free" | "customer_pays"
// assessment.clauses                               // detected clause list
// assessment.flags                                 // ["return_shipping_fee", ...]
// assessment.signature                             // cryptographic proof`;

const VERIFY_SNIPPET = `// Verify a received assessment (stateless, no DB needed)
const verify = await fetch("https://policycheck.tools/api/v1/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    signed_assessment: result.signed_assessment,
    signature: result.signature,
  }),
}).then(r => r.json());

// { valid: true, assessment_id: "...", seller_domain: "amazon.com" }`;

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ value, label }: { value: string; label?: string }) {
  const map: Record<string, string> = {
    complete: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
    high: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
    medium: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
    partial: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
    low: "bg-orange-900/50 text-orange-300 border-orange-700/50",
    no_content: "bg-red-900/50 text-red-300 border-red-700/50",
    none: "bg-red-900/50 text-red-300 border-red-700/50",
    text_provided: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border font-medium ${map[value] ?? "bg-gray-800/50 text-gray-300 border-gray-600/50"}`}>
      {label ?? value}
    </span>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-baseline gap-4 py-1.5 border-b border-[#2a2a4a]/50 last:border-0">
      <span className="text-xs text-[#64748b] shrink-0">{label}</span>
      <span className="text-xs text-[#e2e8f0] text-right font-[family-name:var(--font-geist-mono)]">{value}</span>
    </div>
  );
}

function BoolFact({ val }: { val: boolean | null }) {
  if (val === null) return <span className="text-[#64748b]">unknown</span>;
  return val
    ? <span className="text-emerald-400">yes</span>
    : <span className="text-red-400">no</span>;
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative group my-4">
      <pre className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-4 overflow-x-auto text-sm leading-relaxed font-[family-name:var(--font-geist-mono)]">
        <code className="text-[#e2e8f0]">{children}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-[#2a2a4a] text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[#3a3a5a] hover:text-white"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ── Policy fact panels ───────────────────────────────────────────────────────

function PolicyPanel({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f0f1a] border border-[#2a2a4a]/60 rounded-lg p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#a78bfa] mb-1">{title}</div>
      <p className="text-xs text-[#94a3b8] mb-3 leading-relaxed">{summary}</p>
      <div>{children}</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [url, setUrl] = useState("https://amazon.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState<"fetch" | "mcp" | "verify">("fetch");

  async function analyze() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setVerification(null);

    try {
      const res = await fetch("/api/v1/signed-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!result) return;
    setVerifying(true);
    setVerification(null);
    try {
      const res = await fetch("/api/v1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signed_assessment: result.signed_assessment,
          signature: result.signature,
        }),
      });
      const data = await res.json();
      setVerification(data);
    } catch {
      setVerification({ valid: false, reason: "Request failed" });
    } finally {
      setVerifying(false);
    }
  }

  const sa = result?.signed_assessment;
  const p = sa?.policies;

  const nonBoilerplate = sa?.clauses.filter((c) => !c.is_standard_boilerplate) ?? [];
  const boilerplate = sa?.clauses.filter((c) => c.is_standard_boilerplate) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e2e8f0]">

      {/* ── Top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#2a2a4a] h-14 flex items-center px-6">
        <a href="/" className="text-lg font-semibold text-white mr-2">PolicyCheck</a>
        <span className="text-[#64748b] text-sm">Live Demo</span>
        <div className="ml-auto flex gap-4 text-sm">
          <a href="/docs" className="text-[#94a3b8] hover:text-white transition-colors">Docs</a>
          <a href="https://policycheck.tools/.well-known/agent.json" className="text-[#94a3b8] hover:text-white transition-colors">Agent Card</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-28 pb-24">

        {/* ── Hero ── */}
        <div className="mb-10">
          <div className="inline-block px-3 py-1 rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa] text-xs font-medium mb-4">
            Interactive Demo
          </div>
          <h1 className="text-4xl font-bold mb-3 leading-tight">
            Structured policy facts.<br />Cryptographic proof.
          </h1>
          <p className="text-[#94a3b8] text-lg leading-relaxed max-w-2xl">
            Enter any e-commerce store URL. PolicyCheck extracts structured facts from the seller&apos;s policies — return window, shipping costs, legal clauses — and returns a signed assessment your agent can present at checkout.
          </p>
        </div>

        {/* ── Input ── */}
        <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 mb-8">
          <label className="block text-sm font-medium text-[#94a3b8] mb-3">Seller URL</label>
          <div className="flex gap-3 mb-4">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="https://example-store.com"
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#a78bfa] transition-colors font-[family-name:var(--font-geist-mono)]"
            />
            <button
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="px-6 py-2.5 bg-[#a78bfa] hover:bg-[#9061f9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analysing…
                </>
              ) : "Analyse"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-[#64748b]">Try:</span>
            {QUICK_PICKS.map(pick => (
              <button
                key={pick}
                onClick={() => { setUrl(pick); setResult(null); setVerification(null); setError(null); }}
                className="text-xs px-2.5 py-1 rounded border border-[#2a2a4a] text-[#94a3b8] hover:text-white hover:border-[#a78bfa] transition-colors font-[family-name:var(--font-geist-mono)]"
              >
                {pick.replace("https://", "")}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 mb-8 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ── Results ── */}
        {sa && (
          <div className="space-y-5 mb-12">

            {/* Status + summary */}
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <div className="flex flex-wrap gap-3 items-center mb-3">
                <span className="text-sm font-semibold text-[#e2e8f0]">{sa.seller.domain}</span>
                <StatusBadge value={sa.analysis_status} />
                <StatusBadge value={sa.confidence} label={`confidence: ${sa.confidence}`} />
              </div>
              <p className="text-sm text-[#94a3b8] leading-relaxed">{sa.summary}</p>
              {sa.analysis_status === "no_content" && (
                <p className="mt-3 text-sm text-[#94a3b8] border-t border-[#2a2a4a] pt-3">
                  Could not extract policy content — the site may use JavaScript rendering. Provide <code className="text-[#a78bfa]">policy_text</code> directly.
                </p>
              )}
            </div>

            {/* Policy facts */}
            {p && Object.keys(p).length > 0 && (
              <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-4">Policy Facts</h3>
                <div className="grid sm:grid-cols-2 gap-3">

                  {p.returns && (
                    <PolicyPanel title="Returns" summary={p.returns.summary}>
                      <FactRow label="Return window" value={p.returns.facts.window_days !== null ? `${p.returns.facts.window_days} days` : null} />
                      <FactRow label="Return shipping" value={p.returns.facts.return_shipping} />
                      <FactRow label="Restocking fee" value={<BoolFact val={p.returns.facts.restocking_fee} />} />
                      <FactRow label="Refund method" value={p.returns.facts.refund_method} />
                    </PolicyPanel>
                  )}

                  {p.shipping && (
                    <PolicyPanel title="Shipping" summary={p.shipping.summary}>
                      <FactRow label="Free shipping over" value={p.shipping.facts.free_threshold_usd !== null ? `$${p.shipping.facts.free_threshold_usd}` : null} />
                      <FactRow label="Delivery time" value={
                        p.shipping.facts.estimated_days_min !== null && p.shipping.facts.estimated_days_max !== null
                          ? `${p.shipping.facts.estimated_days_min}–${p.shipping.facts.estimated_days_max} days`
                          : null
                      } />
                      <FactRow label="Tracking provided" value={<BoolFact val={p.shipping.facts.tracking_provided} />} />
                    </PolicyPanel>
                  )}

                  {p.legal && (
                    <PolicyPanel title="Legal" summary={p.legal.summary}>
                      <FactRow label="Arbitration" value={<BoolFact val={p.legal.facts.arbitration} />} />
                      <FactRow label="Class action waiver" value={<BoolFact val={p.legal.facts.class_action_waiver} />} />
                      <FactRow label="Jurisdiction" value={p.legal.facts.jurisdiction} />
                    </PolicyPanel>
                  )}

                  {p.pricing && (
                    <PolicyPanel title="Pricing" summary={p.pricing.summary}>
                      <FactRow label="Auto-renews" value={<BoolFact val={p.pricing.facts.auto_renews} />} />
                    </PolicyPanel>
                  )}

                  {p.privacy && (
                    <PolicyPanel title="Privacy" summary={p.privacy.summary}>
                      <FactRow label="Data sold" value={<BoolFact val={p.privacy.facts.data_sold} />} />
                    </PolicyPanel>
                  )}

                </div>
              </div>
            )}

            {/* Notable clauses */}
            {nonBoilerplate.length > 0 && (
              <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-4">
                  Detected Clauses <span className="text-[#94a3b8] normal-case font-normal">({nonBoilerplate.length})</span>
                </h3>
                <div className="space-y-3">
                  {nonBoilerplate.map((c, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-xs rounded border bg-amber-900/30 text-amber-300 border-amber-700/50 shrink-0">{c.category}</span>
                      <div className="min-w-0">
                        <code className="text-[#a78bfa] text-xs font-[family-name:var(--font-geist-mono)]">{c.id}</code>
                        <p className="text-sm text-[#94a3b8] mt-0.5">{c.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard boilerplate clauses — collapsed by default */}
            {boilerplate.length > 0 && (
              <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#2a2a4a]/30 transition-colors list-none">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Standard Boilerplate <span className="text-[#94a3b8] normal-case font-normal">({boilerplate.length} — common across major retailers)</span>
                    </span>
                    <span className="text-[#64748b] text-sm group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="border-t border-[#2a2a4a] px-6 py-4 space-y-3">
                    {boilerplate.map((c, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-xs rounded border bg-slate-800/50 text-slate-400 border-slate-600/50 shrink-0">{c.category}</span>
                        <div className="min-w-0">
                          <code className="text-[#94a3b8] text-xs font-[family-name:var(--font-geist-mono)]">{c.id}</code>
                          <p className="text-sm text-[#64748b] mt-0.5">{c.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Positives */}
            {sa.positives.length > 0 && (
              <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-4">
                  Positives <span className="text-[#94a3b8] normal-case font-normal">({sa.positives.length})</span>
                </h3>
                <ul className="space-y-2">
                  {sa.positives.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#94a3b8]">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cryptographic proof */}
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">Cryptographic Proof</h3>
              <p className="text-sm text-[#94a3b8] mb-4">
                This assessment is signed with Ed25519. Any party can independently verify it hasn&apos;t been tampered with.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#64748b] mb-1">Signature</p>
                  <code className="text-xs text-[#a78bfa] font-[family-name:var(--font-geist-mono)] break-all">
                    {result?.signature.slice(0, 48)}…
                  </code>
                </div>
                <button
                  onClick={verify}
                  disabled={verifying}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-[#a78bfa] text-[#a78bfa] hover:bg-[#a78bfa]/10 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {verifying ? "Verifying…" : "Verify This Assessment"}
                </button>
              </div>

              {verification && (
                <div className={`mt-4 rounded-lg p-4 border text-sm ${verification.valid ? "bg-emerald-900/20 border-emerald-700/40 text-emerald-300" : "bg-red-900/20 border-red-700/40 text-red-300"}`}>
                  {verification.valid ? (
                    <div className="space-y-1">
                      <p className="font-semibold">✓ Signature valid — assessment is genuine</p>
                      <p className="text-xs opacity-75">Assessment ID: {verification.assessment_id}</p>
                      <p className="text-xs opacity-75">Verified at: {verification.verified_at}</p>
                      <p className="text-xs opacity-75">Expires: {verification.expires_at}</p>
                    </div>
                  ) : (
                    <p>✗ {verification.reason ?? "Verification failed"}</p>
                  )}
                </div>
              )}
            </div>

            {/* Raw signed assessment */}
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowRaw(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#2a2a4a]/30 transition-colors"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                  Raw Signed Assessment <span className="text-[#a78bfa] normal-case font-normal">— for developers</span>
                </span>
                <span className="text-[#64748b] text-lg">{showRaw ? "−" : "+"}</span>
              </button>
              {showRaw && (
                <div className="border-t border-[#2a2a4a] px-6 pb-6">
                  <CodeBlock>{JSON.stringify(result, null, 2)}</CodeBlock>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── How agents use this ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-2">How an AI agent uses this</h2>
          <p className="text-[#94a3b8] mb-6">
            Here&apos;s what happens when an AI agent calls PolicyCheck before making a purchase on your behalf:
          </p>

          <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center text-sm font-[family-name:var(--font-geist-mono)]">
              {[
                { label: "User", desc: "instructs agent to buy" },
                { label: "Agent", desc: "finds product" },
                { label: "PolicyCheck", desc: "extracts policy facts" },
                { label: "Agent", desc: "receives signed proof" },
                { label: "Checkout", desc: "presents assessment" },
                { label: "Merchant", desc: "verifies signature" },
              ].map((step, i, arr) => (
                <div key={i} className="flex items-center gap-2">
                  <div>
                    <div className="text-[#a78bfa] font-semibold">{step.label}</div>
                    <div className="text-[#64748b] text-xs">{step.desc}</div>
                  </div>
                  {i < arr.length - 1 && <span className="text-[#2a2a4a] text-lg hidden sm:block">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-sm text-[#94a3b8]">
            <p>
              <strong className="text-[#e2e8f0]">Data, not judgement.</strong> PolicyCheck extracts facts — return window, return shipping cost, arbitration clause. The agent decides what to do with them based on user preferences.
            </p>
            <p>
              <strong className="text-[#e2e8f0]">Boilerplate is labelled.</strong> Clauses like binding arbitration appear in virtually every major retailer&apos;s ToS. PolicyCheck marks them as <code className="text-[#a78bfa]">is_standard_boilerplate: true</code> so agents can filter signal from noise.
            </p>
            <p>
              <strong className="text-[#e2e8f0]">Verifiable proof.</strong> The signed assessment travels with the transaction. Merchants, payment processors, or auditors can verify it independently using the public JWKS key — no trust required.
            </p>
            <p>
              <strong className="text-[#e2e8f0]">5-minute TTL.</strong> Assessments expire after 5 minutes, preventing stale data from being replayed at checkout.
            </p>
          </div>
        </div>

        {/* ── Code snippets ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Integrate in minutes</h2>

          <div className="flex gap-1 mb-2 border-b border-[#2a2a4a]">
            {(["fetch", "mcp", "verify"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSnippet(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeSnippet === tab
                    ? "text-[#a78bfa] border-[#a78bfa]"
                    : "text-[#64748b] border-transparent hover:text-[#94a3b8]"
                }`}
              >
                {tab === "fetch" ? "Fetch API" : tab === "mcp" ? "MCP Tool" : "Verify"}
              </button>
            ))}
          </div>

          {activeSnippet === "fetch" && <CodeBlock>{FETCH_SNIPPET}</CodeBlock>}
          {activeSnippet === "mcp" && <CodeBlock>{MCP_SNIPPET}</CodeBlock>}
          {activeSnippet === "verify" && <CodeBlock>{VERIFY_SNIPPET}</CodeBlock>}
        </div>

        {/* ── CTAs ── */}
        <div className="border-t border-[#2a2a4a] pt-8">
          <h2 className="text-xl font-semibold mb-4">Ready to integrate?</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: "API Docs",
                desc: "Full endpoint reference, response fields, integration patterns.",
                href: "/docs",
                label: "Read the docs →",
              },
              {
                title: "MCP Server",
                desc: "Install as a tool in any MCP-compatible agent.",
                href: "https://www.npmjs.com/package/policycheck-mcp",
                label: "npx policycheck-mcp →",
                mono: true,
              },
              {
                title: "Agent Card",
                desc: "Machine-readable A2A discovery for agent frameworks.",
                href: "https://policycheck.tools/.well-known/agent.json",
                label: "View agent.json →",
              },
            ].map(card => (
              <a
                key={card.href}
                href={card.href}
                className="block bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-5 hover:border-[#a78bfa]/50 transition-colors group"
              >
                <h3 className="font-semibold text-[#e2e8f0] mb-1">{card.title}</h3>
                <p className="text-sm text-[#64748b] mb-3">{card.desc}</p>
                <span className={`text-sm text-[#a78bfa] group-hover:underline ${card.mono ? "font-[family-name:var(--font-geist-mono)]" : ""}`}>
                  {card.label}
                </span>
              </a>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
