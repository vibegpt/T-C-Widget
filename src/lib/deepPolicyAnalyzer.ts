import { analyseText, fetchPolicyFromUrl } from "./policy-analysis";

export type DeepAnalysisResult = {
  seller_url: string;
  risk_score: number;
  risk_level: string;
  buyer_protection_rating: string;
  risk_factors: Array<{
    factor: string;
    severity: string;
    detail: string;
  }>;
  positives: string[];
  summary: string;
  analyzed_at: string;
  analysis_method: string;
};

const POLICY_PATHS: Record<string, string[]> = {
  returns: ["/policies/refund-policy", "/pages/return-policy", "/returns"],
  shipping: ["/policies/shipping-policy", "/pages/shipping", "/shipping"],
  terms: ["/policies/terms-of-service", "/terms-of-service", "/terms"],
};

/**
 * Discover and fetch policy text from common paths on a seller's site.
 */
async function discoverPolicies(sellerUrl: string): Promise<string> {
  const baseUrl = sellerUrl.replace(/\/$/, "");
  const texts: string[] = [];

  for (const paths of Object.values(POLICY_PATHS)) {
    for (const path of paths) {
      try {
        const text = await fetchPolicyFromUrl(baseUrl + path);
        if (text && text.length > 100) {
          texts.push(text);
          break;
        }
      } catch {
        /* try next path */
      }
    }
  }

  return texts.join("\n\n---\n\n");
}

/**
 * Build LLM prompt for deep clause detection.
 */
function buildPrompt(policyText: string, regexFindings: ReturnType<typeof analyseText>): string {
  return `Analyze the following seller policy text and identify ALL consumer-impacting clauses.

POLICY TEXT:
${policyText.substring(0, 15000)}${policyText.length > 15000 ? "\n...(truncated)" : ""}

REGEX PRE-SCAN FINDINGS (validate and expand on these):
${JSON.stringify(regexFindings.risks, null, 2)}

INSTRUCTIONS:
1. Detect these specific clause types (use these exact factor names if found):
   - binding_arbitration: Mandatory arbitration for disputes
   - class_action_waiver: Waiver of class action rights
   - liability_cap: Cap on seller's total liability
   - termination_at_will: Seller can terminate account without cause
   - no_refund: All sales final / no refunds
   - restocking_fee: Fee deducted from refund on returns
   - return_shipping_fee: Buyer pays return shipping costs
   - store_credit_only: Refunds issued as store credit, not original payment
   - short_return_window: Return window shorter than 30 days
   - no_refund_opened: Opened/used items cannot be returned
   - auto_renewal: Automatic subscription renewal
   - price_change_right: Seller can change prices without notice
   - data_sharing: Shares personal data with third parties
   - warranty_disclaimer: Disclaims warranties (as-is)
   - hidden_fees: Undisclosed or non-obvious fees
   - forced_liquidation: Can liquidate user positions without consent (crypto)
   - clawback: Can reverse completed transactions (crypto)

2. For each detected clause, assign severity:
   - "high": Significantly harms consumer rights (arbitration, no refunds, opened items non-refundable)
   - "medium": Notable limitation (restocking fee, short return window, store credit only)
   - "low": Minor concern (return shipping fee, auto-renewal with easy cancellation)

3. Identify positives (consumer-friendly policies):
   - Free shipping, free returns, money-back guarantee, extended warranty, price matching, etc.

4. Calculate risk_score (0-10): 0 = excellent seller, 10 = extremely risky
   - 0-2: Very consumer-friendly (generous returns, no arbitration, free shipping)
   - 3-4: Good policies with minor limitations
   - 5-6: Mixed — some concerning clauses
   - 7-8: Risky — multiple consumer-unfriendly clauses
   - 9-10: Very risky — no refunds, binding arbitration, liability caps

5. Assign buyer_protection_rating letter grade:
   - "A+" to "A-": Score 0-2, excellent protection
   - "B+" to "B-": Score 2-4, good protection
   - "C+" to "C-": Score 4-6, average protection
   - "D+" to "D-": Score 6-8, poor protection
   - "F": Score 8-10, very poor protection

6. Write a 2-3 sentence summary of the key risks and whether this seller is safe to buy from.

Return ONLY a JSON object with this exact structure:
{
  "risk_factors": [
    { "factor": "string (from the list above)", "severity": "high|medium|low", "detail": "plain English explanation" }
  ],
  "positives": ["string describing each consumer-friendly policy"],
  "risk_score": 0.0,
  "risk_level": "low|medium|high|critical",
  "buyer_protection_rating": "A+",
  "summary": "string"
}`;
}

/**
 * Call OpenAI gpt-4o-mini for deep analysis.
 */
async function callLLM(prompt: string): Promise<Record<string, unknown>> {
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, "").trim();
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a consumer protection analyst specializing in e-commerce policy analysis. Return ONLY valid JSON, no other text.",
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

/**
 * Convert regex-only results to extension-compatible format (fallback).
 */
function regexFallback(
  sellerUrl: string,
  regex: ReturnType<typeof analyseText>,
): DeepAnalysisResult {
  const riskFactors: DeepAnalysisResult["risk_factors"] = [];

  if (regex.risks.arbitration) {
    riskFactors.push({ factor: "binding_arbitration", severity: "high", detail: "Binding arbitration required for all disputes" });
  }
  if (regex.risks.classActionWaiver) {
    riskFactors.push({ factor: "class_action_waiver", severity: "high", detail: "Class action lawsuits are waived" });
  }
  if (regex.risks.liabilityCap) {
    riskFactors.push({ factor: "liability_cap", severity: "medium", detail: `Liability capped at $${Number(regex.risks.liabilityCap).toLocaleString()}` });
  }
  if (regex.risks.terminationAtWill) {
    riskFactors.push({ factor: "termination_at_will", severity: "high", detail: "Account can be terminated at any time without notice" });
  }
  if (regex.risks.autoRenewal) {
    riskFactors.push({ factor: "auto_renewal", severity: "low", detail: "Automatic renewal clause detected" });
  }
  if (regex.risks.noRefunds) {
    riskFactors.push({ factor: "no_refund", severity: "high", detail: "All sales are final — no refunds" });
  }
  if (regex.risks.restockingFee) {
    riskFactors.push({ factor: "restocking_fee", severity: "medium", detail: `Restocking fee: ${regex.risks.restockingFee}` });
  }

  // Convert 0-100 protection score to 0-10 risk score (inverted)
  const riskScore = Math.round((10 - (regex.buyerProtectionScore / 10)) * 10) / 10;

  let grade: string;
  if (riskScore <= 1) grade = "A+";
  else if (riskScore <= 2) grade = "A";
  else if (riskScore <= 3) grade = "B+";
  else if (riskScore <= 4) grade = "B";
  else if (riskScore <= 5) grade = "C+";
  else if (riskScore <= 6) grade = "C";
  else if (riskScore <= 7) grade = "D+";
  else if (riskScore <= 8) grade = "D";
  else grade = "F";

  return {
    seller_url: sellerUrl,
    risk_score: riskScore,
    risk_level: regex.riskLevel,
    buyer_protection_rating: grade,
    risk_factors: riskFactors,
    positives: [],
    summary: regex.summary,
    analyzed_at: new Date().toISOString(),
    analysis_method: "regex_only",
  };
}

/**
 * Deep policy analysis — hybrid regex + LLM with extension-compatible output.
 */
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
      risk_score: 5,
      risk_level: "unknown",
      buyer_protection_rating: "N/A",
      risk_factors: [],
      positives: [],
      summary: "Could not locate or extract policy text. Provide policy_text directly for analysis.",
      analyzed_at: new Date().toISOString(),
      analysis_method: "none",
    };
  }

  // Step 2: Fast regex pre-scan
  const regexResult = analyseText(text);

  // Step 3: LLM deep analysis
  try {
    const prompt = buildPrompt(text, regexResult);
    const llm = await callLLM(prompt);

    const riskFactors = (llm.risk_factors as DeepAnalysisResult["risk_factors"]) || [];
    const positives = (llm.positives as string[]) || [];
    const riskScore = typeof llm.risk_score === "number" ? Math.round(llm.risk_score * 10) / 10 : 5;
    const riskLevel = (llm.risk_level as string) || regexResult.riskLevel;
    const grade = (llm.buyer_protection_rating as string) || "C";
    const summary = (llm.summary as string) || regexResult.summary;

    return {
      seller_url: sellerUrl,
      risk_score: riskScore,
      risk_level: riskLevel,
      buyer_protection_rating: grade,
      risk_factors: riskFactors,
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
