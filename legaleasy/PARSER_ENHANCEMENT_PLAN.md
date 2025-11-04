# Parser Enhancement Plan: Fix Critical Detection Gaps

**Date**: November 4, 2025
**Issue**: Parser failed to detect explicit "clawback" clause in MEXC Terms (Clause 21(c))
**Impact**: HIGH - Users could lose money due to undetected risk

---

## Problem Analysis

### What Was Missed

**MEXC User Agreement, Clause 21(c):**
```
"(c) Clawback and/or retrieve any profits obtained in violation of
this Agreement or other Legal Documents to compensate for any losses
suffered as a consequence thereto;"
```

**Why It Was Missed:**
1. Current parser only checks for ~10 common patterns
2. No crypto-specific detection patterns
3. Single-pass analysis (misses synonyms/variations)
4. No clause-number extraction (can't cite "Clause 21(c)")
5. No context-aware detection (misses "clawback" buried in legalese)

---

## Enhanced Detection Architecture

### Multi-Layer Detection System

```
┌─────────────────────────────────────┐
│  Layer 1: Quick Pattern Matching   │ (Current system)
│  - Fast regex for common clauses    │
│  - 100ms processing time            │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Layer 2: Industry-Specific Scan   │ (NEW)
│  - Crypto exchange patterns         │
│  - Medical billing patterns         │
│  - SaaS contract patterns           │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Layer 3: AI Semantic Analysis     │ (NEW)
│  - GPT-4 reads full document        │
│  - Finds clauses by meaning         │
│  - Extracts exact clause numbers    │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Layer 4: Verification & Scoring   │ (NEW)
│  - Cross-check all layers           │
│  - Risk severity scoring            │
│  - Generate citation links          │
└─────────────────────────────────────┘
```

---

## Implementation: Enhanced Parser

### New Detection Patterns

#### 1. Crypto Exchange Patterns (HIGH PRIORITY)

```javascript
const cryptoExchangePatterns = {
  // Clawback / Profit Seizure
  clawback: [
    /clawback/i,
    /retrieve.*profits?/i,
    /recover.*profits?/i,
    /seize.*profits?/i,
    /confiscate.*profits?/i,
    /reverse.*profits?/i,
    /deduct.*profits?/i,
  ],

  // Forced Liquidation
  forcedLiquidation: [
    /forced?\s+liquidat(ion|e)/i,
    /auto[-\s]?liquidat(ion|e)/i,
    /compulsory liquidation/i,
    /unilateral.*liquidat(ion|e)/i,
  ],

  // Auto-Deleveraging (ADL)
  autoDeleveraging: [
    /auto[-\s]?deleverag/i,
    /ADL/,
    /automatic.*position.*reduc/i,
    /counter[-\s]?party.*loss/i,
  ],

  // Trade Rollback
  tradeRollback: [
    /rollback.*trad(e|ing)/i,
    /reverse.*trad(e|ing)/i,
    /cancel.*executed.*trad(e|ing)/i,
    /void.*trad(e|ing)/i,
    /annul.*trad(e|ing)/i,
  ],

  // Risk Control (Broad Authority)
  riskControl: [
    /risk control.*sole discretion/i,
    /abnormal trading/i,
    /suspicious.*activit(y|ies)/i,
    /freeze.*account.*discretion/i,
    /suspend.*without.*notice/i,
  ],

  // Asset Confiscation
  assetSeizure: [
    /confiscate.*assets?/i,
    /seize.*assets?/i,
    /forfeit.*assets?/i,
    /retain.*assets?/i,
    /withhold.*funds?/i,
  ],
};
```

#### 2. Medical Billing Patterns

```javascript
const medicalBillingPatterns = {
  // Surprise Billing
  surpriseBilling: [
    /out[-\s]?of[-\s]?network/i,
    /balance billing/i,
    /facility fee/i,
    /emergency.*rates?/i,
  ],

  // Debt Collection
  debtCollection: [
    /debt collection/i,
    /collections? agenc/i,
    /credit reporting/i,
    /collections? process/i,
  ],

  // Payment Required
  paymentRequired: [
    /payment.*due.*upon.*receipt/i,
    /immediate payment/i,
    /payment.*before.*discharge/i,
  ],
};
```

#### 3. General Contract Red Flags

```javascript
const generalContractPatterns = {
  // Unilateral Changes
  unilateralChange: [
    /modify.*terms.*without.*notice/i,
    /change.*terms.*at.*any.*time/i,
    /update.*terms.*sole.*discretion/i,
  ],

  // Assignment Rights (They can sell your data/contract)
  assignment: [
    /assign.*agreement.*without.*consent/i,
    /transfer.*rights.*without.*notice/i,
  ],

  // Indemnification (You pay their legal fees)
  indemnification: [
    /indemnif(y|ication)/i,
    /hold harmless/i,
    /defend.*against.*claims/i,
  ],

  // Severability (One bad clause doesn't void whole contract)
  severability: [
    /severabilit(y|ies)/i,
    /invalid.*remain.*in.*force/i,
  ],
};
```

---

## Enhanced Parser Implementation

### File: `web/parse-terms-enhanced.js`

```javascript
// @ts-check
/**
 * Enhanced multi-layer document parser
 * Detects crypto-specific, medical, and general contract risks
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const cleanText = (raw) => raw.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

/**
 * Layer 1: Fast pattern matching (existing + enhanced)
 */
function layer1_quickScan(text) {
  const findings = [];
  const riskFlags = {};

  // Crypto Exchange Patterns
  const cryptoPatterns = {
    clawback: [
      /clawback/i,
      /retrieve.*profits?/i,
      /recover.*profits?.*compensate/i,
      /seize.*profits?/i,
      /confiscate.*profits?/i,
    ],
    forcedLiquidation: [
      /forced?\s+liquidat(ion|e)/i,
      /auto[-\s]?liquidat(ion|e)/i,
      /compulsory liquidation/i,
    ],
    autoDeleveraging: [
      /auto[-\s]?deleverag/i,
      /ADL/,
      /automatic.*position.*reduc/i,
    ],
    tradeRollback: [
      /rollback.*point/i,
      /reverse.*trad(e|ing)/i,
      /cancel.*executed.*trad(e|ing)/i,
      /void.*trad(e|ing)/i,
    ],
    riskControl: [
      /risk control.*sole discretion/i,
      /abnormal trading/i,
      /suspicious.*activit(y|ies)/i,
      /freeze.*account.*discretion/i,
    ],
    assetSeizure: [
      /confiscate.*remaining.*assets?/i,
      /seize.*assets?/i,
      /forfeit.*assets?/i,
    ],
  };

  // Check crypto patterns
  for (const [key, patterns] of Object.entries(cryptoPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        riskFlags[key] = true;

        // Extract context (100 chars before/after match)
        const match = text.match(pattern);
        if (match) {
          const startIdx = Math.max(0, match.index - 100);
          const endIdx = Math.min(text.length, match.index + match[0].length + 100);
          const context = text.slice(startIdx, endIdx);

          findings.push({
            type: key,
            severity: getSeverity(key),
            pattern: pattern.source,
            context: context.trim(),
            matched: match[0],
          });
        }
        break; // Found one match for this type, move to next
      }
    }
  }

  // Existing patterns (arbitration, class waiver, etc.)
  if (/(binding,?\s*individual\s*arbitration|arbitration.*JAMS)/i.test(text)) {
    riskFlags.hasArbitration = true;
    findings.push({
      type: 'arbitration',
      severity: 'high',
      context: extractContext(text, /(binding,?\s*individual\s*arbitration)/i),
    });
  }

  if (/(class (action|representative).*(waived|waiver)|waive.*right.*class action)/i.test(text)) {
    riskFlags.hasClassWaiver = true;
    findings.push({
      type: 'classWaiver',
      severity: 'high',
      context: extractContext(text, /(class.*waiver)/i),
    });
  }

  if (/(suspend|terminate).*(any\s*time|sole\s*discretion|without (prior )?notice)/i.test(text)) {
    riskFlags.terminationAtWill = true;
    findings.push({
      type: 'terminationAtWill',
      severity: 'medium',
      context: extractContext(text, /(suspend|terminate).*(sole\s*discretion)/i),
    });
  }

  return { findings, riskFlags };
}

/**
 * Layer 2: Document type detection + targeted scanning
 */
function layer2_industrySpecific(text, documentType = 'auto') {
  if (documentType === 'auto') {
    documentType = detectDocumentType(text);
  }

  const findings = [];

  switch (documentType) {
    case 'crypto_exchange':
      findings.push(...scanCryptoExchange(text));
      break;
    case 'medical_bill':
      findings.push(...scanMedicalBill(text));
      break;
    case 'saas_contract':
      findings.push(...scanSaaSContract(text));
      break;
    default:
      // General scan
      findings.push(...scanGeneralContract(text));
  }

  return { findings, documentType };
}

function detectDocumentType(text) {
  const lower = text.toLowerCase();

  if (/\b(exchange|trading|crypto|bitcoin|leverage|margin|futures)\b/i.test(text)) {
    return 'crypto_exchange';
  }
  if (/\b(patient|hospital|medical|billing|insurance|procedure)\b/i.test(text)) {
    return 'medical_bill';
  }
  if (/\b(saas|software.*service|subscription|license)\b/i.test(text)) {
    return 'saas_contract';
  }

  return 'general';
}

function scanCryptoExchange(text) {
  const findings = [];

  // Specific clause number detection for exchanges
  const clauseMatch = text.match(/(\d+)\)\s*["""]?Account Restrictions["""]?.*?clawback/is);
  if (clauseMatch) {
    findings.push({
      type: 'clawback_clause_found',
      severity: 'critical',
      clauseNumber: clauseMatch[1],
      context: clauseMatch[0].slice(0, 300),
      citation: `Clause ${clauseMatch[1]}: Account Restrictions`,
    });
  }

  // Check for profit retrieval language
  if (/retrieve.*profits?.*violation/i.test(text)) {
    findings.push({
      type: 'profit_retrieval',
      severity: 'critical',
      context: extractContext(text, /retrieve.*profits?.*violation/i, 200),
    });
  }

  // Check for abnormal trading definitions
  if (/abnormal trading.*behavior|activities/i.test(text)) {
    findings.push({
      type: 'abnormal_trading_trigger',
      severity: 'high',
      context: extractContext(text, /abnormal trading/i, 300),
      note: 'Vague trigger - could apply to legitimate profitable trading',
    });
  }

  return findings;
}

/**
 * Layer 3: AI Semantic Analysis (GPT-4 reads full document)
 */
async function layer3_aiAnalysis(text, documentType) {
  const prompt = `You are analyzing a legal document for consumer protection risks.

Document type: ${documentType}

Find ALL instances of these high-risk clauses and provide EXACT clause numbers/sections:

1. **Clawback provisions** - Can they take back profits?
2. **Forced liquidation** - Can they close your positions without consent?
3. **Auto-deleveraging** - Will your position be reduced due to others' losses?
4. **Trade rollback** - Can they reverse executed trades?
5. **Asset seizure** - Can they confiscate funds?
6. **Arbitration** - Mandatory arbitration instead of court?
7. **Class action waiver** - Can't join class action lawsuits?
8. **Unilateral changes** - Can they change terms without notice?

For EACH finding, provide:
- Exact clause number (e.g., "Clause 21(c)")
- Verbatim quote (first 100 chars)
- Risk severity (critical/high/medium/low)
- Plain-English explanation

Return as JSON array.

Document text:
${text.slice(0, 100000)}`; // Limit to ~100k chars for API

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyzer. Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistency
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.findings || [];
  } catch (error) {
    console.error('AI analysis failed:', error);
    return [];
  }
}

/**
 * Layer 4: Merge & verify findings from all layers
 */
function layer4_mergeAndScore(layer1, layer2, layer3) {
  const allFindings = [];
  const seenTypes = new Set();

  // Add Layer 3 (AI) findings first (highest confidence)
  for (const finding of layer3) {
    allFindings.push({
      ...finding,
      source: 'ai_analysis',
      confidence: 'high',
    });
    seenTypes.add(finding.type);
  }

  // Add Layer 2 (industry-specific) if not duplicate
  for (const finding of layer2.findings) {
    if (!seenTypes.has(finding.type)) {
      allFindings.push({
        ...finding,
        source: 'industry_scan',
        confidence: 'medium',
      });
      seenTypes.add(finding.type);
    }
  }

  // Add Layer 1 (regex) if not duplicate
  for (const finding of layer1.findings) {
    if (!seenTypes.has(finding.type)) {
      allFindings.push({
        ...finding,
        source: 'pattern_match',
        confidence: 'medium',
      });
    }
  }

  // Calculate overall risk score
  const riskScore = calculateRiskScore(allFindings);

  return {
    findings: allFindings,
    riskScore,
    criticalCount: allFindings.filter(f => f.severity === 'critical').length,
    highCount: allFindings.filter(f => f.severity === 'high').length,
    mediumCount: allFindings.filter(f => f.severity === 'medium').length,
  };
}

/**
 * Main export: Enhanced parseTerms
 */
export async function parseTermsEnhanced(textRaw, options = {}) {
  const text = cleanText(textRaw);
  const { useAI = true, documentType = 'auto' } = options;

  console.log('[Parser] Starting multi-layer analysis...');

  // Layer 1: Quick scan
  const layer1 = layer1_quickScan(text);
  console.log(`[Parser] Layer 1: Found ${layer1.findings.length} pattern matches`);

  // Layer 2: Industry-specific
  const layer2 = layer2_industrySpecific(text, documentType);
  console.log(`[Parser] Layer 2: Detected type "${layer2.documentType}", found ${layer2.findings.length} findings`);

  // Layer 3: AI analysis (optional, costs $0.01-0.10 per doc)
  let layer3 = [];
  if (useAI) {
    layer3 = await layer3_aiAnalysis(text, layer2.documentType);
    console.log(`[Parser] Layer 3: AI found ${layer3.length} semantic matches`);
  }

  // Layer 4: Merge and score
  const result = layer4_mergeAndScore(layer1, layer2, layer3);

  return {
    ...result,
    documentType: layer2.documentType,
    analyzed: new Date().toISOString(),
  };
}

/**
 * Utility: Extract context around a match
 */
function extractContext(text, pattern, chars = 150) {
  const match = text.match(pattern);
  if (!match) return '';

  const startIdx = Math.max(0, match.index - chars);
  const endIdx = Math.min(text.length, match.index + match[0].length + chars);
  return text.slice(startIdx, endIdx).trim();
}

/**
 * Utility: Get severity level for finding type
 */
function getSeverity(type) {
  const severityMap = {
    clawback: 'critical',
    assetSeizure: 'critical',
    forcedLiquidation: 'critical',
    autoDeleveraging: 'high',
    tradeRollback: 'high',
    riskControl: 'high',
    arbitration: 'high',
    classWaiver: 'high',
    terminationAtWill: 'medium',
    unilateralChange: 'medium',
  };

  return severityMap[type] || 'medium';
}

/**
 * Utility: Calculate overall risk score (0-100)
 */
function calculateRiskScore(findings) {
  let score = 0;

  for (const finding of findings) {
    switch (finding.severity) {
      case 'critical':
        score += 30;
        break;
      case 'high':
        score += 15;
        break;
      case 'medium':
        score += 5;
        break;
      case 'low':
        score += 2;
        break;
    }
  }

  return Math.min(100, score); // Cap at 100
}

/**
 * Generate enhanced summary
 */
export function generateEnhancedSummary(parsed) {
  let summary = `🛡️ DOCUMENT ANALYSIS\n`;
  summary += `Type: ${parsed.documentType}\n`;
  summary += `Risk Score: ${parsed.riskScore}/100 ${getRiskEmoji(parsed.riskScore)}\n`;
  summary += `Analyzed: ${parsed.analyzed}\n\n`;

  if (parsed.criticalCount > 0) {
    summary += `🚨 CRITICAL ISSUES (${parsed.criticalCount}):\n`;
    const critical = parsed.findings.filter(f => f.severity === 'critical');
    critical.forEach((f, i) => {
      summary += `\n${i + 1}. ${formatFindingTitle(f.type)}\n`;
      if (f.clauseNumber) {
        summary += `   Location: Clause ${f.clauseNumber}\n`;
      }
      if (f.context) {
        summary += `   "${f.context.slice(0, 100)}..."\n`;
      }
      summary += `   Impact: ${getImpactDescription(f.type)}\n`;
    });
    summary += `\n`;
  }

  if (parsed.highCount > 0) {
    summary += `⚠️ HIGH RISK (${parsed.highCount}):\n`;
    const high = parsed.findings.filter(f => f.severity === 'high');
    high.forEach((f, i) => {
      summary += `${i + 1}. ${formatFindingTitle(f.type)}\n`;
    });
    summary += `\n`;
  }

  if (parsed.mediumCount > 0) {
    summary += `🟡 MODERATE CONCERNS (${parsed.mediumCount}):\n`;
    const medium = parsed.findings.filter(f => f.severity === 'medium');
    medium.forEach((f, i) => {
      summary += `${i + 1}. ${formatFindingTitle(f.type)}\n`;
    });
    summary += `\n`;
  }

  // Recommendations
  summary += `📋 RECOMMENDED ACTIONS:\n`;
  if (parsed.riskScore >= 70) {
    summary += `⚠️ HIGH RISK - Consider alternatives or use with extreme caution\n`;
  } else if (parsed.riskScore >= 40) {
    summary += `⚠️ MODERATE RISK - Review critical issues before proceeding\n`;
  } else {
    summary += `✓ Relatively standard terms, but review all clauses\n`;
  }

  return summary;
}

function getRiskEmoji(score) {
  if (score >= 70) return '🔴';
  if (score >= 40) return '🟡';
  return '🟢';
}

function formatFindingTitle(type) {
  const titles = {
    clawback: 'Clawback / Profit Seizure',
    assetSeizure: 'Asset Confiscation',
    forcedLiquidation: 'Forced Liquidation',
    autoDeleveraging: 'Auto-Deleveraging (ADL)',
    tradeRollback: 'Trade Rollback Rights',
    riskControl: 'Broad Risk Control Authority',
    arbitration: 'Mandatory Arbitration',
    classWaiver: 'Class Action Waiver',
    terminationAtWill: 'Termination at Will',
    unilateralChange: 'Unilateral Term Changes',
  };

  return titles[type] || type;
}

function getImpactDescription(type) {
  const impacts = {
    clawback: 'Exchange can retroactively take your profits',
    assetSeizure: 'Your funds can be confiscated',
    forcedLiquidation: 'Your positions can be closed without consent',
    autoDeleveraging: 'Your profitable positions may be reduced due to others\' losses',
    tradeRollback: 'Executed trades can be reversed',
    riskControl: 'Account can be frozen based on vague criteria',
    arbitration: 'You cannot sue in court',
    classWaiver: 'Cannot join class action lawsuits',
    terminationAtWill: 'Account can be terminated without notice',
    unilateralChange: 'Terms can change without your consent',
  };

  return impacts[type] || 'Review clause carefully';
}

// Additional helpers
function scanMedicalBill(text) {
  // TODO: Implement medical billing patterns
  return [];
}

function scanSaaSContract(text) {
  // TODO: Implement SaaS contract patterns
  return [];
}

function scanGeneralContract(text) {
  // TODO: Implement general contract patterns
  return [];
}
```

---

## Testing Strategy

### Test Cases

**1. MEXC Terms (Clause 21(c) - KNOWN MISS)**
```
Input: Full MEXC User Agreement
Expected: Detect clawback in Clause 21(c)
Status: MUST PASS
```

**2. Binance Terms**
```
Input: Binance User Agreement
Expected: Detect auto-deleveraging, forced liquidation
```

**3. Hospital Bill**
```
Input: Sample medical bill PDF
Expected: Detect surprise billing, debt collection clauses
```

**4. False Positive Test**
```
Input: Consumer-friendly T&C (e.g., Stripe)
Expected: Low risk score, few findings
```

---

## Deployment Plan

### Phase 1: Add Patterns (No AI) - 2 hours
- Update `parse-terms.js` with crypto patterns
- Test on MEXC terms
- Deploy to Railway

### Phase 2: Multi-Pass System - 1 day
- Implement layer 1-2 (no AI cost)
- Add document type detection
- Test on 10 sample documents

### Phase 3: AI Layer (Optional) - 2 days
- Add GPT-4 semantic analysis
- Gate behind feature flag (costs $0.01-0.10/doc)
- A/B test accuracy vs. cost

### Phase 4: User Feedback Loop - Ongoing
- Log all analyses
- Track which findings users care about most
- Refine patterns based on real data

---

## Cost Analysis

### Per-Document Analysis Cost

**Layer 1-2 (Pattern Matching)**:
- Cost: $0 (runs on your server)
- Speed: <100ms
- Accuracy: 70-80%

**Layer 3 (AI Analysis)**:
- Cost: $0.01-0.10 per document (GPT-4 Turbo)
- Speed: 5-15 seconds
- Accuracy: 90-95%

**Recommendation for MVP**:
- Mirra page ($9.99): Use AI (worth the cost)
- Free tier (2/mo): Use AI (affordable)
- Paid tier (unlimited): Pattern matching only, AI on request

---

## Success Metrics

**Accuracy Targets**:
- 95%+ detection of critical clauses (clawback, forced liquidation)
- <5% false positive rate
- 100% detection of explicitly named clauses (like "Clause 21(c)")

**Performance Targets**:
- Layer 1-2: <500ms
- Layer 3 (AI): <20 seconds
- Total: <25 seconds for full analysis

---

## Next Steps

1. **Immediate**: Add crypto patterns to existing parser (2 hours)
2. **This Week**: Implement multi-layer system (1-2 days)
3. **Next Week**: Test with 20 real documents, refine patterns
4. **Ongoing**: User feedback loop, pattern refinement

---

**END OF PLAN**
