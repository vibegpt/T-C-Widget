// Shared policy analysis engine used by A2A and x402 endpoints

export async function fetchPolicyFromUrl(url: string): Promise<string> {
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

export function analyseText(text: string) {
  const risks: Record<string, unknown> = {};
  const keyFindings: string[] = [];

  if (/binding\s+arbitration|mandatory\s+arbitration|resolved\s+(by|through)\s+.*arbitration/i.test(text)) {
    risks.arbitration = true;
    keyFindings.push("⚠️ Binding arbitration required — limits ability to sue in court");
  }

  if (/waive.*class\s+action|class\s+action.*waiv|no\s+class\s+action/i.test(text)) {
    risks.classActionWaiver = true;
    keyFindings.push("⚠️ Class action lawsuits waived — cannot join group lawsuits");
  }

  const liabMatch = text.match(/liability.*(?:shall\s+not|not\s+to)\s+exceed\s+\$?([\d,]+)/i);
  if (liabMatch) {
    const cap = parseInt(liabMatch[1].replace(/,/g, ""), 10);
    risks.liabilityCap = cap;
    keyFindings.push(`⚠️ Liability capped at $${cap.toLocaleString()}`);
  }

  if (/terminate.*at\s+any\s+time|terminate.*without\s+(prior\s+)?notice|terminate.*for\s+any\s+reason/i.test(text)) {
    risks.terminationAtWill = true;
    keyFindings.push("⚠️ Account can be terminated at any time without notice");
  }

  if (/auto[- ]?renew|automatically\s+renew/i.test(text)) {
    risks.autoRenewal = true;
    keyFindings.push("ℹ️ Auto-renewal clause detected — check cancellation terms");
  }

  const optOutMatch = text.match(/(\d+)\s*(?:day|calendar\s+day)s?\s*to\s*opt[\s-]*out/i);
  if (optOutMatch) {
    risks.optOutDays = parseInt(optOutMatch[1], 10);
    keyFindings.push(`ℹ️ ${risks.optOutDays} days to opt out of arbitration`);
  }

  if (/no\s+refund|all\s+sales?\s+(are\s+)?final|non[\s-]?refundable/i.test(text)) {
    risks.noRefunds = true;
    keyFindings.push("🔴 No refunds — all sales are final");
  }

  const restockMatch = text.match(/(\d+)%?\s*restock/i);
  if (restockMatch) {
    risks.restockingFee = restockMatch[1] + "%";
    keyFindings.push(`⚠️ Restocking fee: ${restockMatch[1]}%`);
  }

  if (keyFindings.length === 0) {
    keyFindings.push("✅ No major red flags identified in this document");
  }

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

  // Build factual summary from findings
  const findingCount = keyFindings.filter(f => f.startsWith("⚠️") || f.startsWith("🔴")).length;
  const totalCategories = 5; // returns, shipping, warranty, terms, privacy
  let summary: string;
  if (score >= 80) {
    summary = "Strong buyer protections detected. " + keyFindings.join(". ").replace(/[⚠️🔴ℹ️✅]\s*/g, "");
  } else if (score >= 60) {
    summary = `Moderate risk indicators detected. ${findingCount} issue(s) identified. ` + keyFindings.filter(f => f.startsWith("⚠️") || f.startsWith("🔴")).map(f => f.replace(/[⚠️🔴]\s*/, "")).join(". ");
  } else {
    summary = `High risk indicators detected. ${findingCount} of ${totalCategories} policy categories flagged. ` + keyFindings.filter(f => f.startsWith("⚠️") || f.startsWith("🔴")).map(f => f.replace(/[⚠️🔴]\s*/, "")).join(". ");
  }

  return {
    riskLevel,
    buyerProtectionScore: score,
    summary,
    keyFindings,
    risks,
  };
}

export async function analyseFromUrl(url: string) {
  const text = await fetchPolicyFromUrl(url);
  if (!text || text.length < 100) {
    throw new Error("Could not extract meaningful content from URL.");
  }
  return { url, ...analyseText(text) };
}

export async function quickRiskCheck(sellerUrl: string) {
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
      policiesFound: [] as string[],
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

  const uniqueFindings = [...new Set(allFindings)];
  const flaggedCount = uniqueFindings.filter(f => f.startsWith("⚠️") || f.startsWith("🔴")).length;
  const policiesAnalyzed = Object.keys(found).length;
  let summary: string;
  if (avgScore >= 80) {
    summary = `Strong buyer protections across ${policiesAnalyzed} policy categories analysed. ` + uniqueFindings.filter(f => f.startsWith("✅")).map(f => f.replace(/✅\s*/, "")).join(". ");
  } else if (avgScore >= 60) {
    summary = `Moderate risk indicators detected across ${policiesAnalyzed} policy categories. ${flaggedCount} issue(s) identified.`;
  } else {
    summary = `High risk indicators detected. ${flaggedCount} issues across ${policiesAnalyzed} policy categories analysed.`;
  }

  return {
    sellerUrl: baseUrl,
    policiesFound: Object.keys(found),
    policyUrls: found,
    riskLevel: overallRisk,
    buyerProtectionScore: avgScore,
    summary,
    keyFindings: uniqueFindings,
    analyses,
    errors: errors.length > 0 ? errors : undefined,
  };
}
