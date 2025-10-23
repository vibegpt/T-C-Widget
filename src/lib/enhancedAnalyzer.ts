import { parseTerms } from './parseTerms';

/**
 * Enhanced multi-model policy analyzer
 * Combines fast regex parsing with LLM validation for reliability
 */

type AnalysisResult = {
  summary: {
    product: string;
    updated_at: string | null;
    jurisdiction: string[];
    sections: Array<{
      key: string;
      title: string;
      bullets: string[];
      body: string;
      confidence?: number; // 0-1, how confident we are in this analysis
    }>;
  };
  risks: {
    arbitration: boolean;
    classActionWaiver: boolean;
    liabilityCap: number | null;
    terminationAtWill: boolean;
    optOutDays: number | null;
    walletSelfCustody?: boolean;
    irreversibleTxs?: boolean;
    bridgingL2Risks?: boolean;
  };
  key_findings: string[];
  confidence_score: number; // Overall confidence in the analysis
  analysis_method: 'regex_only' | 'regex_plus_llm' | 'llm_only';
};

/**
 * Analyzes legal text with multi-model enhancement
 */
export async function enhancedAnalyze(
  text: string,
  options: {
    documentType?: 'terms' | 'privacy' | 'refund' | 'shipping' | 'other';
    productName?: string;
    useDeepAnalysis?: boolean; // If true, always use LLM even for simple cases
  } = {}
): Promise<AnalysisResult> {

  // Step 1: Fast regex analysis (always run this first)
  const regexResult = parseTerms(text, {
    productHint: options.productName
  });

  // Step 2: Determine if we need LLM enhancement
  const needsLLM = shouldUseLLM(text, regexResult, options.useDeepAnalysis);

  if (!needsLLM) {
    // Regex was good enough, return enhanced regex results
    return formatRegexResults(regexResult, options.documentType);
  }

  // Step 3: Use LLM to validate and enhance findings
  const llmResult = await analyzewithLLM(text, regexResult, options);

  return llmResult;
}

/**
 * Determines if LLM analysis is needed based on regex confidence
 */
function shouldUseLLM(
  text: string,
  regexResult: ReturnType<typeof parseTerms>,
  forceDeep?: boolean
): boolean {
  // Always use LLM if explicitly requested
  if (forceDeep) return true;

  // Use LLM for complex documents (>5000 words)
  if (text.length > 25000) return true;

  // Use LLM if regex found very few findings (might be missing things)
  const findingsCount = regexResult.parsed.sections.length;
  if (findingsCount < 3) return true;

  // Use LLM if we found critical clauses (arbitration, liability caps)
  if (regexResult.risks.arbitration || regexResult.risks.liabilityCap !== null) {
    return true; // Double-check critical findings
  }

  // Otherwise, regex is probably fine
  return false;
}

/**
 * Format regex-only results with confidence scores
 */
function formatRegexResults(
  regexResult: ReturnType<typeof parseTerms>,
  documentType?: string
): AnalysisResult {
  const keyFindings: string[] = [];

  if (regexResult.risks.arbitration) {
    keyFindings.push("⚠️ Binding arbitration required - limits your ability to sue in court");
  }
  if (regexResult.risks.classActionWaiver) {
    keyFindings.push("⚠️ Class action lawsuits are waived - you can't join group lawsuits");
  }
  if (regexResult.risks.liabilityCap !== null) {
    keyFindings.push(`⚠️ Liability capped at $${regexResult.risks.liabilityCap?.toLocaleString() || '0'} - maximum you can recover in damages`);
  }
  if (regexResult.risks.terminationAtWill) {
    keyFindings.push("⚠️ Account can be terminated at any time without notice");
  }
  if (regexResult.risks.optOutDays !== null) {
    keyFindings.push(`ℹ️ You have ${regexResult.risks.optOutDays} days to opt out of arbitration by mail`);
  }

  if (keyFindings.length === 0) {
    keyFindings.push("Document appears to have standard terms with no major red flags identified");
  }

  return {
    summary: {
      product: regexResult.parsed.product || 'Unknown',
      updated_at: regexResult.parsed.updatedAt,
      jurisdiction: regexResult.parsed.jurisdiction,
      sections: regexResult.parsed.sections.map(s => ({
        key: s.key,
        title: s.title,
        bullets: s.bullets || [],
        body: s.bullets?.join(" ") || s.body || "",
        confidence: 0.85 // Regex has good confidence for pattern matching
      }))
    },
    risks: {
      arbitration: regexResult.risks.arbitration || false,
      classActionWaiver: regexResult.risks.classActionWaiver || false,
      liabilityCap: regexResult.risks.liabilityCap,
      terminationAtWill: regexResult.risks.terminationAtWill || false,
      optOutDays: regexResult.risks.optOutDays,
      walletSelfCustody: regexResult.risks.walletSelfCustody,
      irreversibleTxs: regexResult.risks.irreversibleTxs,
      bridgingL2Risks: regexResult.risks.bridgingL2Risks,
    },
    key_findings: keyFindings,
    confidence_score: 0.85,
    analysis_method: 'regex_only'
  };
}

/**
 * Analyze with LLM (using mcp__zen__chat for flexibility)
 */
async function analyzewithLLM(
  text: string,
  regexResult: ReturnType<typeof parseTerms>,
  options: {
    documentType?: string;
    productName?: string;
  }
): Promise<AnalysisResult> {

  // For now, we'll use a hybrid approach:
  // - Start with regex findings
  // - Let LLM validate and enhance them

  // Build prompt for LLM
  const prompt = buildLLMPrompt(text, regexResult, options);

  try {
    // Call mcp__zen__chat with appropriate model
    // For speed + quality balance, use gemini-2.5-flash or o3-mini
    const response = await callLLMAnalyzer(prompt, text);

    // Merge LLM findings with regex findings
    return mergeLLMWithRegex(regexResult, response);

  } catch (error) {
    console.error('LLM analysis failed, falling back to regex:', error);
    // Fallback to regex-only if LLM fails
    return formatRegexResults(regexResult, options.documentType);
  }
}

/**
 * Build prompt for LLM analysis
 */
function buildLLMPrompt(
  text: string,
  regexResult: ReturnType<typeof parseTerms>,
  options: {
    documentType?: string;
    productName?: string;
  }
): string {
  const docType = options.documentType || 'terms of service';
  const product = options.productName || regexResult.parsed.product || 'this service';

  return `You are a legal document analyzer. Analyze this ${docType} for ${product} and identify consumer protection issues.

DOCUMENT TEXT:
${text.substring(0, 15000)} ${text.length > 15000 ? '...(truncated)' : ''}

REGEX FINDINGS (validate these):
${JSON.stringify(regexResult.risks, null, 2)}

TASK:
1. Validate the regex findings above - are they correct?
2. Find ANY additional important clauses the regex might have missed:
   - Refund policies (return windows, restocking fees, conditions)
   - Shipping policies (timeframes, costs, tracking)
   - Privacy/data collection practices
   - Liability limitations
   - Dispute resolution (arbitration, class action waivers)
   - Account termination rights
   - Warranty disclaimers
   - Automatic renewals
   - Hidden fees

3. For shopping/commerce policies, focus on:
   - Return window (how many days?)
   - Return conditions (unopened? unworn? original packaging?)
   - Who pays return shipping?
   - Restocking fees (percentage or flat fee?)
   - Refund method (original payment? store credit?)
   - Shipping timeframes
   - Shipping costs

Return ONLY a JSON object with this structure (no other text):
{
  "validated_risks": {
    "arbitration": boolean,
    "classActionWaiver": boolean,
    "liabilityCap": number | null,
    "terminationAtWill": boolean,
    "optOutDays": number | null
  },
  "additional_findings": [
    {
      "key": "short_key",
      "title": "Human-readable title",
      "description": "Plain English explanation",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "consumer_impact": "How this affects the customer"
    }
  ],
  "key_insights": [
    "Most important finding 1",
    "Most important finding 2",
    "Most important finding 3"
  ],
  "confidence": 0.0-1.0
}`;
}

/**
 * Call LLM analyzer using OpenAI API
 */
async function callLLMAnalyzer(prompt: string, text: string): Promise<any> {
  // Only import OpenAI when we actually need it (server-side only)
  const { default: OpenAI } = await import('openai');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Use GPT-4o-mini for cost-effectiveness + speed
    // Can upgrade to GPT-4o or o1-mini for better accuracy if needed
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast + cheap + good quality
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyzer. Return ONLY valid JSON, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent, factual analysis
      response_format: { type: 'json_object' } // Ensure JSON response
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Merge LLM findings with regex findings
 */
function mergeLLMWithRegex(
  regexResult: ReturnType<typeof parseTerms>,
  llmResult: any
): AnalysisResult {
  const keyFindings: string[] = [];

  // Use LLM-validated risks
  const risks = llmResult.validated_risks;

  if (risks.arbitration) {
    keyFindings.push("⚠️ Binding arbitration required - limits your ability to sue in court");
  }
  if (risks.classActionWaiver) {
    keyFindings.push("⚠️ Class action lawsuits are waived - you can't join group lawsuits");
  }
  if (risks.liabilityCap !== null) {
    keyFindings.push(`⚠️ Liability capped at $${risks.liabilityCap?.toLocaleString() || '0'} - maximum you can recover in damages`);
  }
  if (risks.terminationAtWill) {
    keyFindings.push("⚠️ Account can be terminated at any time without notice");
  }
  if (risks.optOutDays !== null) {
    keyFindings.push(`ℹ️ You have ${risks.optOutDays} days to opt out of arbitration by mail`);
  }

  // Add LLM-discovered insights
  if (llmResult.key_insights) {
    llmResult.key_insights.forEach((insight: string) => {
      if (!keyFindings.includes(insight)) {
        keyFindings.push(insight);
      }
    });
  }

  // Merge sections from both regex and LLM
  const sections = [
    ...regexResult.parsed.sections.map(s => ({
      key: s.key,
      title: s.title,
      bullets: s.bullets || [],
      body: s.bullets?.join(" ") || s.body || "",
      confidence: 0.85
    })),
    ...(llmResult.additional_findings || []).map((f: any) => ({
      key: f.key,
      title: f.title,
      bullets: [f.consumer_impact],
      body: f.description,
      confidence: llmResult.confidence || 0.9
    }))
  ];

  return {
    summary: {
      product: regexResult.parsed.product || 'Unknown',
      updated_at: regexResult.parsed.updatedAt,
      jurisdiction: regexResult.parsed.jurisdiction,
      sections
    },
    risks: {
      arbitration: risks.arbitration || false,
      classActionWaiver: risks.classActionWaiver || false,
      liabilityCap: risks.liabilityCap,
      terminationAtWill: risks.terminationAtWill || false,
      optOutDays: risks.optOutDays,
    },
    key_findings: keyFindings,
    confidence_score: llmResult.confidence || 0.9,
    analysis_method: 'regex_plus_llm'
  };
}
