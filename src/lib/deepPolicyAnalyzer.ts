import { analyseText, fetchPolicyFromUrl } from "./policy-analysis";

// ── Types ────────────────────────────────────────────────────────────────────

export type RiskFactor = {
  factor: string;
  severity: "high" | "medium" | "low";
  detail: string;
  source: string;
};

export type DeepAnalysisResult = {
  seller_url: string;
  risk_score: number;
  risk_level: string;
  buyer_protection_rating: string;
  buyer_protection_score: number;
  risk_factors: RiskFactor[];
  positives: string[];
  summary: string;
  analyzed_at: string;
  analysis_method: string;
};

// ── Policy discovery ─────────────────────────────────────────────────────────

const POLICY_PATHS: Record<string, string[]> = {
  returns: ["/policies/refund-policy", "/pages/return-policy", "/returns", "/pages/returns-and-exchanges"],
  shipping: ["/policies/shipping-policy", "/pages/shipping", "/shipping"],
  terms: ["/policies/terms-of-service", "/terms-of-service", "/terms", "/pages/terms-of-service"],
  privacy: ["/policies/privacy-policy", "/pages/privacy-policy", "/privacy"],
};

async function discoverPolicies(sellerUrl: string): Promise<string> {
  const baseUrl = sellerUrl.replace(/\/$/, "");
  const texts: string[] = [];

  for (const [category, paths] of Object.entries(POLICY_PATHS)) {
    for (const path of paths) {
      try {
        const text = await fetchPolicyFromUrl(baseUrl + path);
        if (text && text.length > 100) {
          texts.push(`[${category.toUpperCase()} POLICY]\n${text}`);
          break;
        }
      } catch {
        /* try next path */
      }
    }
  }

  return texts.join("\n\n---\n\n");
}

// ── Deterministic scoring ────────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<string, number> = { high: 2.0, medium: 1.0, low: 0.5 };

function calculateRiskScore(factors: RiskFactor[]): number {
  let score = 0;
  for (const f of factors) {
    score += SEVERITY_WEIGHTS[f.severity] || 0;
  }
  return Math.min(10, Math.round(score * 10) / 10);
}

function getRiskLevel(score: number): string {
  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  if (score <= 7.5) return "high";
  return "critical";
}

function getLetterGrade(score: number): string {
  if (score <= 1) return "A+";
  if (score <= 2) return "A";
  if (score <= 3) return "B+";
  if (score <= 4) return "B";
  if (score <= 5) return "C+";
  if (score <= 6) return "C";
  if (score <= 7) return "D+";
  if (score <= 8) return "D";
  return "F";
}

// ── LLM prompt ───────────────────────────────────────────────────────────────

function buildPrompt(policyText: string): string {
  return `Analyze the following seller policy text. Identify ALL consumer-impacting clauses and positive signals.

POLICY TEXT:
${policyText.substring(0, 15000)}${policyText.length > 15000 ? "\n...(truncated)" : ""}

DETECT THESE CLAUSE TYPES (use these exact factor names and source categories):

Returns & Refunds (source: "returns"):
- return_shipping_fee — buyer pays return shipping costs
- restocking_fee — percentage or flat fee deducted from refund
- short_return_window — return window shorter than 30 days
- store_credit_only — refunds issued as store credit, not original payment method
- no_refund_opened — opened or used items cannot be returned
- final_sale — clearance/sale items are non-refundable
- exchange_only — exchanges only, no cash refunds
- no_refund — all sales final, no refunds at all

Legal & Dispute (source: "legal"):
- binding_arbitration — mandatory binding arbitration for disputes
- class_action_waiver — waives right to class action lawsuits
- liability_cap — seller liability capped at purchase price or less
- jurisdiction_clause — disputes governed by specific state/country law
- termination_at_will — seller can terminate account without cause or notice

Pricing & Billing (source: "pricing"):
- auto_renewal — subscriptions or services auto-renew
- price_adjustment_clause — seller can change prices after order placement
- hidden_fees — undisclosed or non-obvious fees

Privacy & Data (source: "privacy"):
- data_selling — shares or sells personal data to third parties
- broad_data_collection — collects more data than needed for service

SEVERITY RULES:
- "high": Significantly harms consumer rights (binding_arbitration, class_action_waiver, no_refund, no_refund_opened, final_sale, hidden_fees, termination_at_will)
- "medium": Notable limitation (restocking_fee, store_credit_only, exchange_only, liability_cap, auto_renewal, price_adjustment_clause, data_selling)
- "low": Minor concern (return_shipping_fee, short_return_window, jurisdiction_clause, broad_data_collection)

POSITIVE SIGNALS TO DETECT:
Identify consumer-friendly policies such as: free returns, free shipping, extended return window (60+ days), money-back guarantee, price match guarantee, satisfaction guarantee, easy cancellation, no restocking fee, hassle-free exchanges, lifetime warranty, etc.

SUMMARY RULES:
Write a 2-3 sentence FACTUAL summary. State what was analyzed, what was found, and key metrics.
- DO say: "3 of 4 policy categories analyzed. Return shipping fee detected. 14-day return window (industry average: 30 days)."
- DO NOT say: "safe to buy", "don't buy", "we recommend", "consider finding an alternative", "proceed with caution"
- Present facts and classifications only. No purchase advice.

Return ONLY valid JSON with this structure:
{
  "risk_factors": [
    { "factor": "factor_name", "severity": "high|medium|low", "detail": "factual description", "source": "returns|legal|pricing|privacy" }
  ],
  "positives": ["factual description of each positive policy"],
  "summary": "factual summary only"
}`;
}

// ── LLM call ─────────────────────────────────────────────────────────────────

async function callLLM(prompt: string): Promise<Record<string, unknown>> {
  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, "").trim();
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a consumer protection analyst. Analyze e-commerce policies and return ONLY valid JSON. Present factual findings only — no purchase advice or recommendations.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  return JSON.parse(content);
}

// ── Regex fallback ───────────────────────────────────────────────────────────

function regexFallback(sellerUrl: string, regex: ReturnType<typeof analyseText>): DeepAnalysisResult {
  const factors: RiskFactor[] = [];

  if (regex.risks.arbitration) factors.push({ factor: "binding_arbitration", severity: "high", detail: "Binding arbitration required for all disputes", source: "legal" });
  if (regex.risks.classActionWaiver) factors.push({ factor: "class_action_waiver", severity: "high", detail: "Class action lawsuits are waived", source: "legal" });
  if (regex.risks.liabilityCap) factors.push({ factor: "liability_cap", severity: "medium", detail: `Liability capped at $${Number(regex.risks.liabilityCap).toLocaleString()}`, source: "legal" });
  if (regex.risks.terminationAtWill) factors.push({ factor: "termination_at_will", severity: "high", detail: "Account can be terminated without notice", source: "legal" });
  if (regex.risks.autoRenewal) factors.push({ factor: "auto_renewal", severity: "medium", detail: "Automatic renewal clause detected", source: "pricing" });
  if (regex.risks.noRefunds) factors.push({ factor: "no_refund", severity: "high", detail: "All sales are final — no refunds", source: "returns" });
  if (regex.risks.restockingFee) factors.push({ factor: "restocking_fee", severity: "medium", detail: `Restocking fee: ${regex.risks.restockingFee}`, source: "returns" });

  const riskScore = calculateRiskScore(factors);

  return {
    seller_url: sellerUrl,
    risk_score: riskScore,
    risk_level: getRiskLevel(riskScore),
    buyer_protection_rating: getLetterGrade(riskScore),
    buyer_protection_score: Math.max(0, Math.min(100, Math.round(100 - riskScore * 10))),
    risk_factors: factors,
    positives: [],
    summary: regex.summary,
    analyzed_at: new Date().toISOString(),
    analysis_method: "regex_only",
  };
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function deepAnalyze(
  sellerUrl: string,
  policyText?: string | null,
): Promise<DeepAnalysisResult> {
  // Step 1: Get policy text
  let text = policyText || "";
  if (!text) {
    text = await discoverPolicies(sellerUrl);
  }

  if (!text || text.length < 50) {
    return {
      seller_url: sellerUrl,
      risk_score: 0,
      risk_level: "unknown",
      buyer_protection_rating: "N/A",
      buyer_protection_score: 0,
      risk_factors: [],
      positives: [],
      summary: "Could not locate or extract policy text. Provide policy_text directly for analysis.",
      analyzed_at: new Date().toISOString(),
      analysis_method: "none",
    };
  }

  // Step 2: Fast regex pre-scan (used as fallback)
  const regexResult = analyseText(text);

  // Step 3: LLM deep analysis
  try {
    const prompt = buildPrompt(text);
    const llm = await callLLM(prompt);

    const rawFactors = (llm.risk_factors as RiskFactor[]) || [];
    const positives = (llm.positives as string[]) || [];
    const llmSummary = (llm.summary as string) || "";

    // Validate and normalize factors
    const validSeverities = new Set(["high", "medium", "low"]);
    const factors: RiskFactor[] = rawFactors
      .filter((f) => f.factor && f.detail && validSeverities.has(f.severity))
      .map((f) => ({
        factor: f.factor,
        severity: f.severity,
        detail: f.detail,
        source: f.source || "other",
      }));

    // Deterministic scoring from detected factors
    const riskScore = calculateRiskScore(factors);
    const riskLevel = getRiskLevel(riskScore);
    const grade = getLetterGrade(riskScore);
    const protectionScore = Math.max(0, Math.min(100, Math.round(100 - riskScore * 10)));

    // Build factual summary
    const sourcesAnalyzed = new Set(factors.map((f) => f.source));
    const policyCount = sourcesAnalyzed.size || 1;
    const highCount = factors.filter((f) => f.severity === "high").length;
    const summary =
      llmSummary ||
      `${policyCount} policy categories analyzed. ${factors.length} risk factor(s) identified${highCount > 0 ? `, ${highCount} high severity` : ""}. Buyer protection score: ${protectionScore}/100.`;

    return {
      seller_url: sellerUrl,
      risk_score: riskScore,
      risk_level: riskLevel,
      buyer_protection_rating: grade,
      buyer_protection_score: protectionScore,
      risk_factors: factors,
      positives,
      summary,
      analyzed_at: new Date().toISOString(),
      analysis_method: "regex_plus_llm",
    };
  } catch (err) {
    console.error("LLM analysis failed, falling back to regex:", err);
    return regexFallback(sellerUrl, regexResult);
  }
}
