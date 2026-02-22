import { analyseText, fetchPolicyFromUrl } from "./policy-analysis";

// ── Types ────────────────────────────────────────────────────────────────────

export type ReturnsFacts = {
  window_days: number | null;
  return_shipping: "free" | "customer_pays" | "unknown" | null;
  restocking_fee: boolean | null;
  refund_method: "original_payment" | "store_credit" | "exchange_only" | "unknown" | null;
};

export type ShippingFacts = {
  free_threshold_usd: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  tracking_provided: boolean | null;
};

export type LegalFacts = {
  arbitration: boolean | null;
  class_action_waiver: boolean | null;
  jurisdiction: string | null;
};

export type PricingFacts = {
  auto_renews: boolean | null;
};

export type PrivacyFacts = {
  data_sold: boolean | null;
};

export type PolicyCategory<T> = {
  summary: string;
  facts: T;
};

export type Clause = {
  id: string;
  category: string;
  description: string;
  found_in: string;
  is_standard_boilerplate: boolean;
};

export type DeepAnalysisResult = {
  seller_url: string;
  policies: {
    returns?: PolicyCategory<ReturnsFacts>;
    shipping?: PolicyCategory<ShippingFacts>;
    legal?: PolicyCategory<LegalFacts>;
    pricing?: PolicyCategory<PricingFacts>;
    privacy?: PolicyCategory<PrivacyFacts>;
  };
  clauses: Clause[];
  positives: string[];
  summary: string;
  analyzed_at: string;
  analysis_method: string;
  analysis_status: string;
  confidence: string;
};

// ── Policy discovery ─────────────────────────────────────────────────────────

const POLICY_PATHS: Record<string, string[]> = {
  returns: ["/policies/refund-policy", "/pages/return-policy", "/returns", "/pages/returns-and-exchanges"],
  shipping: ["/policies/shipping-policy", "/pages/shipping", "/shipping"],
  terms: ["/policies/terms-of-service", "/terms-of-service", "/terms", "/pages/terms-of-service"],
  privacy: ["/policies/privacy-policy", "/pages/privacy-policy", "/privacy"],
};

const CATEGORY_TO_FOUND_IN: Record<string, string> = {
  returns: "return_policy",
  shipping: "shipping_policy",
  terms: "terms_of_service",
  privacy: "privacy_policy",
};

type FetchResults = {
  attempted: number;
  successful: number;
  totalTextLength: number;
  labeledText: string;
  hasMultiplePages: boolean;
};

async function discoverPolicies(sellerUrl: string): Promise<FetchResults> {
  const baseUrl = sellerUrl.replace(/\/$/, "");
  const sections: string[] = [];
  let attempted = 0;
  let successful = 0;

  for (const [category, paths] of Object.entries(POLICY_PATHS)) {
    attempted++;
    for (const path of paths) {
      try {
        const text = await fetchPolicyFromUrl(baseUrl + path);
        if (text && text.length > 100) {
          const label = CATEGORY_TO_FOUND_IN[category] || category;
          sections.push(`=== ${category.toUpperCase()} POLICY (found_in: "${label}") ===\n${text}`);
          successful++;
          break;
        }
      } catch {
        /* try next path */
      }
    }
  }

  const labeledText = sections.join("\n\n---\n\n");

  return {
    attempted,
    successful,
    totalTextLength: labeledText.length,
    labeledText,
    hasMultiplePages: successful >= 2,
  };
}

// ── Known boilerplate clause IDs ─────────────────────────────────────────────

const STANDARD_BOILERPLATE_CLAUSES = new Set([
  "binding_arbitration",
  "class_action_waiver",
  "termination_at_will",
  "liability_cap",
  "jurisdiction_clause",
]);

// ── Analysis status + confidence ─────────────────────────────────────────────

function getStatusAndConfidence(
  fetchResults: FetchResults | null,
  isTextProvided: boolean,
): { analysis_status: string; confidence: string } {
  if (isTextProvided) {
    return { analysis_status: "text_provided", confidence: "high" };
  }

  if (!fetchResults || fetchResults.successful === 0 || fetchResults.totalTextLength < 100) {
    return { analysis_status: "no_content", confidence: "none" };
  }

  if (fetchResults.successful < fetchResults.attempted) {
    return {
      analysis_status: "partial",
      confidence: fetchResults.successful >= 2 ? "medium" : "low",
    };
  }

  return {
    analysis_status: "complete",
    confidence: fetchResults.successful >= 2 ? "high" : "medium",
  };
}

// ── LLM prompt ───────────────────────────────────────────────────────────────

function buildPrompt(policyText: string): string {
  return `Analyze the following seller policy text. Extract structured facts about each policy category and list detectable clause types.

The text below may contain labeled sections from different policy pages (e.g., RETURNS POLICY, TERMS POLICY). Pay attention to which section each clause was found in.

POLICY TEXT:
${policyText.substring(0, 15000)}${policyText.length > 15000 ? "\n...(truncated)" : ""}

EXTRACT POLICY FACTS FOR EACH SECTION PRESENT:

For "returns" (if a returns/refund policy is present):
- window_days: integer (days), or null if not stated
- return_shipping: "free", "customer_pays", or "unknown"
- restocking_fee: true/false/null
- refund_method: "original_payment", "store_credit", "exchange_only", or "unknown"
- summary: 1-2 sentence factual description

For "shipping" (if a shipping policy is present):
- free_threshold_usd: number or null (dollar amount for free shipping, e.g. 35)
- estimated_days_min: integer or null
- estimated_days_max: integer or null
- tracking_provided: true/false/null
- summary: 1-2 sentence factual description

For "legal" (if terms of service is present):
- arbitration: true/false/null
- class_action_waiver: true/false/null
- jurisdiction: string (e.g. "California") or null
- summary: 1-2 sentence factual description

For "pricing" (if pricing/billing terms are present):
- auto_renews: true/false/null
- summary: 1-2 sentence factual description

For "privacy" (if a privacy policy is present):
- data_sold: true/false/null (whether data is sold or shared commercially)
- summary: 1-2 sentence factual description

DETECT THESE CLAUSE TYPES (use these exact IDs):

Returns & Refunds (category: "returns"):
- return_shipping_fee — buyer pays return shipping costs
- restocking_fee — percentage or flat fee deducted from refund
- short_return_window — return window shorter than 30 days
- store_credit_only — refunds issued as store credit, not original payment method
- no_refund_opened — opened or used items cannot be returned
- final_sale — clearance/sale items are non-refundable
- exchange_only — exchanges only, no cash refunds
- no_refund — all sales final, no refunds at all

Legal & Dispute (category: "legal"):
- binding_arbitration — mandatory binding arbitration for disputes
- class_action_waiver — waives right to class action lawsuits
- liability_cap — seller liability capped at purchase price or less
- jurisdiction_clause — disputes governed by specific state/country law
- termination_at_will — seller can terminate account without cause or notice

Pricing & Billing (category: "pricing"):
- auto_renewal — subscriptions or services auto-renew
- price_adjustment_clause — seller can change prices after order placement
- hidden_fees — undisclosed or non-obvious fees

Privacy & Data (category: "privacy"):
- data_selling — shares or sells personal data to third parties
- broad_data_collection — collects more data than needed for service

FOUND_IN FIELD:
For each clause, set "found_in" to one of:
- "return_policy", "shipping_policy", "terms_of_service", "privacy_policy", "unknown"

IS_STANDARD_BOILERPLATE:
Set is_standard_boilerplate: true for clauses that appear in virtually all major retailer policies and represent standard legal language rather than unusual restrictions. These include: binding_arbitration, class_action_waiver, liability_cap, jurisdiction_clause, termination_at_will.
Set is_standard_boilerplate: false for clauses that represent unusual restrictions affecting consumers (e.g., no_refund, final_sale, store_credit_only, restocking_fee, short_return_window).

POSITIVE SIGNALS TO DETECT:
Identify consumer-friendly policies such as: free returns, free shipping, extended return window (60+ days), money-back guarantee, price match guarantee, satisfaction guarantee, easy cancellation, no restocking fee, hassle-free exchanges, lifetime warranty, etc.

SUMMARY RULES:
Write a 2-3 sentence FACTUAL summary. State what was analyzed, what was found, and key metrics.
- DO say: "3 of 4 policy categories analyzed. Return shipping fee detected. 14-day return window."
- DO NOT say: "safe to buy", "don't buy", "we recommend", "proceed with caution"
- Present facts and classifications only. No purchase advice.

Return ONLY valid JSON with this structure:
{
  "policies": {
    "returns": { "summary": "...", "facts": { "window_days": 30, "return_shipping": "free", "restocking_fee": false, "refund_method": "original_payment" } },
    "shipping": { "summary": "...", "facts": { "free_threshold_usd": 35, "estimated_days_min": 5, "estimated_days_max": 8, "tracking_provided": true } },
    "legal": { "summary": "...", "facts": { "arbitration": true, "class_action_waiver": false, "jurisdiction": "California" } },
    "pricing": { "summary": "...", "facts": { "auto_renews": false } },
    "privacy": { "summary": "...", "facts": { "data_sold": false } }
  },
  "clauses": [
    { "id": "binding_arbitration", "category": "legal", "description": "Mandatory binding arbitration for all disputes", "found_in": "terms_of_service", "is_standard_boilerplate": true }
  ],
  "positives": ["factual description of each positive policy"],
  "summary": "factual summary only"
}

Only include policy categories that were actually present in the text. Omit categories with no content.`;
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

function regexFallback(
  sellerUrl: string,
  regex: ReturnType<typeof analyseText>,
  fetchResults: FetchResults | null,
  isTextProvided: boolean,
): DeepAnalysisResult {
  const clauses: Clause[] = [];

  if (regex.risks.arbitration) clauses.push({ id: "binding_arbitration", category: "legal", description: "Binding arbitration required for all disputes", found_in: "unknown", is_standard_boilerplate: true });
  if (regex.risks.classActionWaiver) clauses.push({ id: "class_action_waiver", category: "legal", description: "Class action lawsuits are waived", found_in: "unknown", is_standard_boilerplate: true });
  if (regex.risks.liabilityCap) clauses.push({ id: "liability_cap", category: "legal", description: `Liability capped at $${Number(regex.risks.liabilityCap).toLocaleString()}`, found_in: "unknown", is_standard_boilerplate: true });
  if (regex.risks.terminationAtWill) clauses.push({ id: "termination_at_will", category: "legal", description: "Account can be terminated without notice", found_in: "unknown", is_standard_boilerplate: true });
  if (regex.risks.autoRenewal) clauses.push({ id: "auto_renewal", category: "pricing", description: "Automatic renewal clause detected", found_in: "unknown", is_standard_boilerplate: false });
  if (regex.risks.noRefunds) clauses.push({ id: "no_refund", category: "returns", description: "All sales are final — no refunds", found_in: "unknown", is_standard_boilerplate: false });
  if (regex.risks.restockingFee) clauses.push({ id: "restocking_fee", category: "returns", description: `Restocking fee: ${regex.risks.restockingFee}`, found_in: "unknown", is_standard_boilerplate: false });

  const { analysis_status, confidence } = getStatusAndConfidence(fetchResults, isTextProvided);

  return {
    seller_url: sellerUrl,
    policies: {},
    clauses,
    positives: [],
    summary: regex.summary,
    analyzed_at: new Date().toISOString(),
    analysis_method: "regex_only",
    analysis_status,
    confidence,
  };
}

// ── Normalize LLM clauses ─────────────────────────────────────────────────────

function normalizeClauses(rawClauses: unknown[]): Clause[] {
  const validFoundIn = new Set(["return_policy", "shipping_policy", "terms_of_service", "privacy_policy", "unknown"]);
  return rawClauses
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).id === "string")
    .map((c) => ({
      id: c.id as string,
      category: (c.category as string) || "other",
      description: (c.description as string) || "",
      found_in: validFoundIn.has(c.found_in as string) ? (c.found_in as string) : "unknown",
      // Trust LLM's is_standard_boilerplate, but always mark known boilerplate IDs as true
      is_standard_boilerplate: STANDARD_BOILERPLATE_CLAUSES.has(c.id as string)
        ? true
        : Boolean(c.is_standard_boilerplate),
    }));
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function deepAnalyze(
  sellerUrl: string,
  policyText?: string | null,
): Promise<DeepAnalysisResult> {
  const isTextProvided = !!policyText;
  let fetchResults: FetchResults | null = null;

  // Step 1: Get policy text
  let text = policyText || "";
  if (!text) {
    fetchResults = await discoverPolicies(sellerUrl);
    text = fetchResults.labeledText;
  }

  if (!text || text.length < 50) {
    const { analysis_status, confidence } = getStatusAndConfidence(fetchResults, isTextProvided);
    return {
      seller_url: sellerUrl,
      policies: {},
      clauses: [],
      positives: [],
      summary: "Unable to extract policy content from this site. The site may use JavaScript rendering or bot protection that prevents server-side analysis. Use the PolicyCheck Chrome extension for browser-based analysis, or provide policy_text directly.",
      analyzed_at: new Date().toISOString(),
      analysis_method: "none",
      analysis_status,
      confidence,
    };
  }

  // Step 2: Fast regex pre-scan (used as fallback)
  const regexResult = analyseText(text);

  // Step 3: LLM deep analysis
  try {
    const prompt = buildPrompt(text);
    const llm = await callLLM(prompt);

    const rawPolicies = (llm.policies as Record<string, unknown>) || {};
    const rawClauses = (llm.clauses as unknown[]) || [];
    const positives = (llm.positives as string[]) || [];
    const llmSummary = (llm.summary as string) || "";

    const clauses = normalizeClauses(rawClauses);

    // Build policies object — only include keys the LLM returned
    const policies: DeepAnalysisResult["policies"] = {};

    if (rawPolicies.returns && typeof rawPolicies.returns === "object") {
      const r = rawPolicies.returns as Record<string, unknown>;
      const facts = (r.facts as Record<string, unknown>) || {};
      policies.returns = {
        summary: (r.summary as string) || "",
        facts: {
          window_days: (facts.window_days as number) ?? null,
          return_shipping: (facts.return_shipping as ReturnsFacts["return_shipping"]) ?? null,
          restocking_fee: (facts.restocking_fee as boolean) ?? null,
          refund_method: (facts.refund_method as ReturnsFacts["refund_method"]) ?? null,
        },
      };
    }

    if (rawPolicies.shipping && typeof rawPolicies.shipping === "object") {
      const s = rawPolicies.shipping as Record<string, unknown>;
      const facts = (s.facts as Record<string, unknown>) || {};
      policies.shipping = {
        summary: (s.summary as string) || "",
        facts: {
          free_threshold_usd: (facts.free_threshold_usd as number) ?? null,
          estimated_days_min: (facts.estimated_days_min as number) ?? null,
          estimated_days_max: (facts.estimated_days_max as number) ?? null,
          tracking_provided: (facts.tracking_provided as boolean) ?? null,
        },
      };
    }

    if (rawPolicies.legal && typeof rawPolicies.legal === "object") {
      const l = rawPolicies.legal as Record<string, unknown>;
      const facts = (l.facts as Record<string, unknown>) || {};
      policies.legal = {
        summary: (l.summary as string) || "",
        facts: {
          arbitration: (facts.arbitration as boolean) ?? null,
          class_action_waiver: (facts.class_action_waiver as boolean) ?? null,
          jurisdiction: (facts.jurisdiction as string) ?? null,
        },
      };
    }

    if (rawPolicies.pricing && typeof rawPolicies.pricing === "object") {
      const p = rawPolicies.pricing as Record<string, unknown>;
      const facts = (p.facts as Record<string, unknown>) || {};
      policies.pricing = {
        summary: (p.summary as string) || "",
        facts: {
          auto_renews: (facts.auto_renews as boolean) ?? null,
        },
      };
    }

    if (rawPolicies.privacy && typeof rawPolicies.privacy === "object") {
      const p = rawPolicies.privacy as Record<string, unknown>;
      const facts = (p.facts as Record<string, unknown>) || {};
      policies.privacy = {
        summary: (p.summary as string) || "",
        facts: {
          data_sold: (facts.data_sold as boolean) ?? null,
        },
      };
    }

    const { analysis_status, confidence } = getStatusAndConfidence(fetchResults, isTextProvided);

    const policyCategoryCount = Object.keys(policies).length;
    const summary =
      llmSummary ||
      `${policyCategoryCount} policy categories analyzed. ${clauses.length} clause(s) detected.`;

    return {
      seller_url: sellerUrl,
      policies,
      clauses,
      positives,
      summary,
      analyzed_at: new Date().toISOString(),
      analysis_method: "regex_plus_llm",
      analysis_status,
      confidence,
    };
  } catch (err) {
    console.error("LLM analysis failed, falling back to regex:", err);
    return regexFallback(sellerUrl, regexResult, fetchResults, isTextProvided);
  }
}
