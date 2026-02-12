// @ts-check
/**
 * Commerce Policy Parser for Agentic Commerce
 * Parses return, shipping, warranty, and terms policies for AI purchasing agents
 */

const cleanText = (raw) => raw.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

const dollarsToNumber = (s) => {
  const m = s.replace(/[,\s]/g, "").match(/\$?(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

const daysToNumber = (s) => {
  const m = s.match(/(\d+)\s*(?:day|business day|calendar day)/i);
  return m ? Number(m[1]) : null;
};

/**
 * Parse return policy
 * @param {string} textRaw - Raw policy text
 * @returns {Object} Parsed return policy
 */
export function parseReturnPolicy(textRaw) {
  const text = cleanText(textRaw);

  const policy = {
    allowsReturns: true,
    returnWindowDays: null,
    returnWindowType: null, // 'calendar' | 'business'
    restockingFee: null,
    restockingFeePercent: null,
    returnShippingPaidBy: null, // 'customer' | 'seller' | 'prepaid_label'
    exchangeOnly: false,
    storeCreditOnly: false,
    originalPackagingRequired: false,
    receiptRequired: false,
    unusedConditionRequired: false,
    finalSaleItems: [],
    exceptions: [],
    refundMethod: null, // 'original_payment' | 'store_credit' | 'exchange'
    refundTimeframeDays: null,
    riskFlags: [],
    keyPoints: []
  };

  // No returns allowed - be careful not to match "we accept returns" which contains "no return" pattern
  // Check for positive return indicators first
  const hasPositiveReturnIndicators = /(?:accept|offer|allow|provide).*?returns?|returns?\s+(?:accepted|allowed|within)/i.test(text);

  if (!hasPositiveReturnIndicators &&
      /((?:^|\.\s*)no returns?(?:\s|$|\.)|all sales? (?:are )?final|non[-\s]?returnable|cannot be returned|items?\s+(?:cannot|can\s*not)\s+be\s+returned)/i.test(text)) {
    policy.allowsReturns = false;
    policy.riskFlags.push('no_returns');
    policy.keyPoints.push('All sales are final - no returns accepted.');
    return policy;
  }

  // Return window detection
  const windowPatterns = [
    /(?:return|exchange).*?within\s+(\d+)\s*(calendar|business)?\s*days?/i,
    /(\d+)[-\s]?day\s+(?:return|money[- ]?back|refund)/i,
    /(?:return|refund)\s+(?:policy|period|window)[:\s]+(\d+)\s*days?/i
  ];

  for (const pattern of windowPatterns) {
    const match = text.match(pattern);
    if (match) {
      policy.returnWindowDays = Number(match[1]);
      policy.returnWindowType = match[2]?.toLowerCase() || 'calendar';
      policy.keyPoints.push(`${policy.returnWindowDays}-day return window.`);
      break;
    }
  }

  // Restocking fee
  const restockingMatch = text.match(/restocking\s+fee[:\s]*(\d+)%?|\b(\d+)%?\s*restocking/i);
  if (restockingMatch) {
    policy.restockingFeePercent = Number(restockingMatch[1] || restockingMatch[2]);
    policy.riskFlags.push('restocking_fee');
    policy.keyPoints.push(`${policy.restockingFeePercent}% restocking fee on returns.`);
  }

  // Return shipping
  if (/(customer|buyer)\s+(pays?|responsible|covers?)\s+(for\s+)?(return\s+)?shipping/i.test(text)) {
    policy.returnShippingPaidBy = 'customer';
    policy.riskFlags.push('customer_pays_return_shipping');
    policy.keyPoints.push('Customer pays return shipping.');
  } else if (/free\s+return|prepaid\s+(return\s+)?label|we\s+(pay|cover)\s+return\s+shipping/i.test(text)) {
    policy.returnShippingPaidBy = 'seller';
    policy.keyPoints.push('Free return shipping provided.');
  }

  // Exchange only
  if (/exchange\s+only|exchanges?\s+(only|but\s+not\s+refund)/i.test(text)) {
    policy.exchangeOnly = true;
    policy.riskFlags.push('exchange_only');
    policy.keyPoints.push('Exchanges only - no refunds.');
  }

  // Store credit only
  if (/store\s+credit\s+only|refund.*?store\s+credit|credit\s+(?:will\s+be\s+)?issued/i.test(text)) {
    policy.storeCreditOnly = true;
    policy.riskFlags.push('store_credit_only');
    policy.keyPoints.push('Refunds issued as store credit only.');
  }

  // Condition requirements
  if (/original\s+packaging|unopened|sealed/i.test(text)) {
    policy.originalPackagingRequired = true;
    policy.keyPoints.push('Must be in original packaging.');
  }

  if (/receipt\s+required|proof\s+of\s+purchase/i.test(text)) {
    policy.receiptRequired = true;
  }

  if (/unworn|unused|tags?\s+attached|new\s+condition/i.test(text)) {
    policy.unusedConditionRequired = true;
    policy.keyPoints.push('Item must be unused with tags attached.');
  }

  // Final sale items
  const finalSaleMatch = text.match(/final\s+sale[^.]*?(?:include|such\s+as|:)\s*([^.]+)/i);
  if (finalSaleMatch) {
    policy.finalSaleItems = finalSaleMatch[1].split(/,|and/).map(s => s.trim()).filter(Boolean);
    policy.keyPoints.push(`Final sale items: ${policy.finalSaleItems.join(', ')}.`);
  }

  // Refund timeframe
  const refundTimeMatch = text.match(/refund.*?(?:processed|issued).*?(\d+)\s*(?:business\s+)?days?/i);
  if (refundTimeMatch) {
    policy.refundTimeframeDays = Number(refundTimeMatch[1]);
  }

  // Risk assessment for short windows
  if (policy.returnWindowDays && policy.returnWindowDays < 14) {
    policy.riskFlags.push('short_return_window');
  }

  return policy;
}

/**
 * Parse shipping policy
 * @param {string} textRaw - Raw policy text
 * @returns {Object} Parsed shipping policy
 */
export function parseShippingPolicy(textRaw) {
  const text = cleanText(textRaw);

  const policy = {
    freeShippingThreshold: null,
    freeShippingAvailable: false,
    standardShippingDays: null,
    expeditedAvailable: false,
    expeditedShippingDays: null,
    internationalShipping: null, // true | false | 'select_countries'
    shippingCarriers: [],
    handlingTimeDays: null,
    poBoxAllowed: null,
    signatureRequired: null,
    insuranceIncluded: null,
    trackingProvided: true,
    riskFlags: [],
    keyPoints: []
  };

  // Free shipping threshold - multiple patterns
  const freeShipPatterns = [
    /free\s+(?:standard\s+)?shipping\s+(?:on\s+)?(?:orders?\s+)?(?:over|above)\s+\$?(\d+)/i,
    /free\s+(?:standard\s+)?shipping\s+(?:on\s+)?(?:all\s+)?orders?\s+\$?(\d+)\+/i,
    /\$?(\d+)\s+(?:or\s+more\s+)?(?:for\s+)?free\s+shipping/i,
    /orders?\s+(?:over|above)\s+\$?(\d+)[^.]*free\s+shipping/i
  ];

  for (const pattern of freeShipPatterns) {
    const match = text.match(pattern);
    if (match) {
      policy.freeShippingThreshold = Number(match[1]);
      policy.freeShippingAvailable = true;
      policy.keyPoints.push(`Free shipping on orders over $${policy.freeShippingThreshold}.`);
      break;
    }
  }

  // Check for free shipping on all orders (no threshold)
  if (!policy.freeShippingAvailable && /free\s+(?:standard\s+)?shipping\s+(?:on\s+)?all\s+orders?/i.test(text)) {
    policy.freeShippingAvailable = true;
    policy.freeShippingThreshold = 0;
    policy.keyPoints.push('Free shipping on all orders.');
  }

  // Standard shipping time
  const standardMatch = text.match(/(?:standard|regular)\s+(?:shipping|delivery)[^.]*?(\d+)[-–](\d+)\s*(?:business\s+)?days?/i);
  if (standardMatch) {
    policy.standardShippingDays = { min: Number(standardMatch[1]), max: Number(standardMatch[2]) };
    policy.keyPoints.push(`Standard shipping: ${standardMatch[1]}-${standardMatch[2]} days.`);
  } else {
    const singleMatch = text.match(/(?:ships?|deliver(?:ed|y)?)\s+(?:within\s+)?(\d+)\s*(?:business\s+)?days?/i);
    if (singleMatch) {
      policy.standardShippingDays = { min: 1, max: Number(singleMatch[1]) };
    }
  }

  // Expedited shipping
  if (/expedited|express|overnight|next[- ]?day|2[- ]?day/i.test(text)) {
    policy.expeditedAvailable = true;
    const expeditedMatch = text.match(/(?:expedited|express)[^.]*?(\d+)[-–]?(\d+)?\s*(?:business\s+)?days?/i);
    if (expeditedMatch) {
      policy.expeditedShippingDays = {
        min: Number(expeditedMatch[1]),
        max: Number(expeditedMatch[2] || expeditedMatch[1])
      };
    }
    policy.keyPoints.push('Expedited shipping available.');
  }

  // International shipping
  if (/ship\s+(?:to\s+)?(?:most\s+)?(?:countries|worldwide|international)/i.test(text)) {
    policy.internationalShipping = true;
    policy.keyPoints.push('International shipping available.');
  } else if (/(?:only|exclusively)\s+ship.*?(?:within|to)\s+(?:the\s+)?(?:US|United\s+States|domestic)/i.test(text)) {
    policy.internationalShipping = false;
    policy.keyPoints.push('Domestic shipping only (US).');
  } else if (/select\s+countries|limited\s+international/i.test(text)) {
    policy.internationalShipping = 'select_countries';
  }

  // Handling time
  const handlingMatch = text.match(/(?:processing|handling)\s+(?:time)?[:\s]*(\d+)[-–]?(\d+)?\s*(?:business\s+)?days?/i);
  if (handlingMatch) {
    policy.handlingTimeDays = {
      min: Number(handlingMatch[1]),
      max: Number(handlingMatch[2] || handlingMatch[1])
    };
    if (policy.handlingTimeDays.max > 5) {
      policy.riskFlags.push('long_handling_time');
      policy.keyPoints.push(`Note: ${policy.handlingTimeDays.min}-${policy.handlingTimeDays.max} day handling time before shipping.`);
    }
  }

  // Carriers
  const carriers = ['USPS', 'UPS', 'FedEx', 'DHL', 'Amazon'];
  carriers.forEach(carrier => {
    if (new RegExp(carrier, 'i').test(text)) {
      policy.shippingCarriers.push(carrier);
    }
  });

  // PO Box
  if (/(?:do\s+not|cannot|don'?t)\s+ship\s+to\s+(?:PO|P\.?O\.?)\s+box/i.test(text)) {
    policy.poBoxAllowed = false;
    policy.keyPoints.push('Does not ship to PO Boxes.');
  }

  // No tracking (rare but risky)
  if (/no\s+tracking|without\s+tracking/i.test(text)) {
    policy.trackingProvided = false;
    policy.riskFlags.push('no_tracking');
    policy.keyPoints.push('Warning: No tracking provided.');
  }

  return policy;
}

/**
 * Parse warranty policy
 * @param {string} textRaw - Raw policy text
 * @returns {Object} Parsed warranty policy
 */
export function parseWarrantyPolicy(textRaw) {
  const text = cleanText(textRaw);

  const policy = {
    hasWarranty: false,
    warrantyDurationMonths: null,
    warrantyType: null, // 'limited' | 'full' | 'lifetime' | 'manufacturer'
    coversDefects: true,
    coversAccidentalDamage: false,
    coversWaterDamage: false,
    exclusions: [],
    claimProcess: null,
    transferable: null,
    extendedWarrantyAvailable: false,
    riskFlags: [],
    keyPoints: []
  };

  // No warranty
  if (/(no warranty|as[- ]?is|sold without warranty|warranty excluded)/i.test(text)) {
    policy.hasWarranty = false;
    policy.riskFlags.push('no_warranty');
    policy.keyPoints.push('Sold as-is with no warranty.');
    return policy;
  }

  policy.hasWarranty = true;

  // Warranty duration
  const durationPatterns = [
    /(\d+)[-\s]?year\s+(?:limited\s+)?warranty/i,
    /warranty[:\s]+(\d+)\s*(?:year|month)/i,
    /(?:limited|full)\s+(\d+)[-\s]?year/i
  ];

  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const num = Number(match[1]);
      // Assume years if > 24, otherwise could be months
      if (text.toLowerCase().includes('month')) {
        policy.warrantyDurationMonths = num;
      } else {
        policy.warrantyDurationMonths = num * 12;
      }
      break;
    }
  }

  // Lifetime warranty
  if (/lifetime\s+warranty/i.test(text)) {
    policy.warrantyType = 'lifetime';
    policy.warrantyDurationMonths = -1; // Special value for lifetime
    policy.keyPoints.push('Lifetime warranty included.');
  } else if (/limited\s+warranty/i.test(text)) {
    policy.warrantyType = 'limited';
    policy.keyPoints.push(`Limited warranty: ${policy.warrantyDurationMonths ? policy.warrantyDurationMonths + ' months' : 'see terms'}.`);
  } else if (/full\s+warranty/i.test(text)) {
    policy.warrantyType = 'full';
  } else if (/manufacturer('?s)?\s+warranty/i.test(text)) {
    policy.warrantyType = 'manufacturer';
    policy.keyPoints.push('Manufacturer warranty (contact manufacturer for claims).');
  }

  // Exclusions
  const exclusionPatterns = [
    { pattern: /(?:does\s+not|doesn'?t)\s+cover\s+water\s+damage/i, flag: 'water_damage_excluded', item: 'water damage' },
    { pattern: /(?:does\s+not|doesn'?t)\s+cover\s+(?:accidental|physical)\s+damage/i, flag: 'accidental_damage_excluded', item: 'accidental damage' },
    { pattern: /(?:does\s+not|doesn'?t)\s+cover\s+(?:normal\s+)?wear\s+and\s+tear/i, flag: null, item: 'normal wear and tear' },
    { pattern: /(?:does\s+not|doesn'?t)\s+cover\s+(?:mis)?use/i, flag: 'misuse_excluded', item: 'misuse' },
    { pattern: /(?:does\s+not|doesn'?t)\s+cover\s+(?:un)?authorized\s+(?:repair|modification)/i, flag: null, item: 'unauthorized repairs' }
  ];

  for (const { pattern, flag, item } of exclusionPatterns) {
    if (pattern.test(text)) {
      policy.exclusions.push(item);
      if (flag) policy.riskFlags.push(flag);
    }
  }

  if (policy.exclusions.length > 0) {
    policy.keyPoints.push(`Warranty excludes: ${policy.exclusions.join(', ')}.`);
  }

  // Coverage
  if (/covers?\s+(?:accidental|physical)\s+damage/i.test(text)) {
    policy.coversAccidentalDamage = true;
  }
  if (/covers?\s+water\s+damage|waterproof\s+warranty/i.test(text)) {
    policy.coversWaterDamage = true;
  }

  // Short warranty warning
  if (policy.warrantyDurationMonths && policy.warrantyDurationMonths > 0 && policy.warrantyDurationMonths < 12) {
    policy.riskFlags.push('short_warranty');
  }

  return policy;
}

/**
 * Parse terms and conditions (extended from original)
 * @param {string} textRaw - Raw terms text
 * @returns {Object} Parsed terms
 */
export function parseTermsAndConditions(textRaw) {
  const text = cleanText(textRaw);

  const parsed = {
    updatedAt: null,
    hasArbitration: false,
    arbitrationProvider: null,
    hasClassWaiver: false,
    optOutDays: null,
    liabilityCap: null,
    terminationAtWill: false,
    governingLaw: null,
    disputeVenue: null,
    autoRenewal: false,
    cancelAnytime: true,
    priceChangeNotice: null,
    dataRetention: null,
    accountTerminationNotice: null,
    riskFlags: [],
    keyPoints: []
  };

  // Updated date
  const dateMatch = text.match(/last\s+(?:updated|modified)[:\s]+([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    parsed.updatedAt = dateMatch[1];
  }

  // Arbitration
  if (/(binding|mandatory)\s+(?:individual\s+)?arbitration|arbitration.*?(?:JAMS|AAA|ICC)/i.test(text)) {
    parsed.hasArbitration = true;
    parsed.riskFlags.push('binding_arbitration');

    const providerMatch = text.match(/(JAMS|AAA|ICC)/i);
    if (providerMatch) {
      parsed.arbitrationProvider = providerMatch[1].toUpperCase();
    }
    parsed.keyPoints.push(`Binding arbitration required${parsed.arbitrationProvider ? ` (${parsed.arbitrationProvider})` : ''}.`);
  }

  // Class action waiver
  if (/(class\s+action|representative\s+action).*?(waive|waiver)|waive.*?class\s+action/i.test(text)) {
    parsed.hasClassWaiver = true;
    parsed.riskFlags.push('class_action_waiver');
    parsed.keyPoints.push('Class action lawsuits waived.');
  }

  // Opt-out period
  const optOutMatch = text.match(/opt[- ]?out.*?(\d+)\s*days?/i);
  if (optOutMatch) {
    parsed.optOutDays = Number(optOutMatch[1]);
    parsed.keyPoints.push(`${parsed.optOutDays}-day arbitration opt-out window.`);
  }

  // Liability cap
  const liabilityMatch = text.match(/(maximum|aggregate|total)\s+liability[^$]*?\$\s?([\d,]+)/i);
  if (liabilityMatch) {
    parsed.liabilityCap = Number(liabilityMatch[2].replace(/,/g, ''));
    parsed.riskFlags.push('liability_cap');
    parsed.keyPoints.push(`Liability capped at $${parsed.liabilityCap.toLocaleString()}.`);
  }

  // Termination at will
  if (/(terminate|suspend).*?(?:at\s+any\s+time|sole\s+discretion|without\s+(?:prior\s+)?notice)/i.test(text)) {
    parsed.terminationAtWill = true;
    parsed.riskFlags.push('termination_at_will');
    parsed.keyPoints.push('Account can be terminated without notice.');
  }

  // Governing law
  const lawMatch = text.match(/governed\s+by.*?laws?\s+of\s+(?:the\s+)?(?:State\s+of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (lawMatch) {
    parsed.governingLaw = lawMatch[1];
    parsed.keyPoints.push(`Governed by ${parsed.governingLaw} law.`);
  }

  // Auto-renewal
  if (/(auto(?:matically)?[- ]?renew|subscription\s+will\s+(?:automatically\s+)?renew)/i.test(text)) {
    parsed.autoRenewal = true;
    parsed.riskFlags.push('auto_renewal');
    parsed.keyPoints.push('Subscription auto-renews.');
  }

  // Price change notice
  const priceNoticeMatch = text.match(/price\s+change.*?(\d+)\s*days?\s*(?:notice|advance)/i);
  if (priceNoticeMatch) {
    parsed.priceChangeNotice = Number(priceNoticeMatch[1]);
  }

  return parsed;
}

/**
 * Comprehensive seller policy analysis for AI purchasing agents
 * @param {Object} policies - Object containing different policy texts
 * @returns {Object} Complete policy assessment
 */
export function analyzeSellerPolicies(policies) {
  const analysis = {
    overallRiskScore: 'low',
    returnPolicy: policies.returns ? parseReturnPolicy(policies.returns) : null,
    shippingPolicy: policies.shipping ? parseShippingPolicy(policies.shipping) : null,
    warrantyPolicy: policies.warranty ? parseWarrantyPolicy(policies.warranty) : null,
    termsAndConditions: policies.terms ? parseTermsAndConditions(policies.terms) : null,
    allRiskFlags: [],
    allKeyPoints: [],
    buyerProtectionScore: 100,
    recommendation: 'proceed'
  };

  // Aggregate risk flags
  const allPolicies = [
    analysis.returnPolicy,
    analysis.shippingPolicy,
    analysis.warrantyPolicy,
    analysis.termsAndConditions
  ].filter(Boolean);

  for (const policy of allPolicies) {
    if (policy.riskFlags) {
      analysis.allRiskFlags.push(...policy.riskFlags);
    }
    if (policy.keyPoints) {
      analysis.allKeyPoints.push(...policy.keyPoints);
    }
  }

  // Calculate buyer protection score
  const deductions = {
    'no_returns': 30,
    'restocking_fee': 10,
    'customer_pays_return_shipping': 5,
    'exchange_only': 15,
    'store_credit_only': 10,
    'short_return_window': 10,
    'no_warranty': 20,
    'short_warranty': 10,
    'water_damage_excluded': 5,
    'binding_arbitration': 15,
    'class_action_waiver': 10,
    'termination_at_will': 10,
    'liability_cap': 5,
    'no_tracking': 15,
    'long_handling_time': 5,
    'auto_renewal': 5
  };

  for (const flag of analysis.allRiskFlags) {
    if (deductions[flag]) {
      analysis.buyerProtectionScore -= deductions[flag];
    }
  }

  analysis.buyerProtectionScore = Math.max(0, analysis.buyerProtectionScore);

  // Overall risk assessment
  if (analysis.buyerProtectionScore >= 80) {
    analysis.overallRiskScore = 'low';
    analysis.recommendation = 'proceed';
  } else if (analysis.buyerProtectionScore >= 60) {
    analysis.overallRiskScore = 'medium';
    analysis.recommendation = 'proceed_with_caution';
  } else if (analysis.buyerProtectionScore >= 40) {
    analysis.overallRiskScore = 'high';
    analysis.recommendation = 'review_carefully';
  } else {
    analysis.overallRiskScore = 'critical';
    analysis.recommendation = 'not_recommended';
  }

  return analysis;
}

/**
 * Generate human-readable summary for AI agent to present to user
 * @param {Object} analysis - Result from analyzeSellerPolicies
 * @returns {string} Formatted summary
 */
export function generateAgentSummary(analysis) {
  const riskEmoji = {
    'low': '🟢',
    'medium': '🟡',
    'high': '🟠',
    'critical': '🔴'
  };

  let summary = `## Seller Policy Assessment\n\n`;
  summary += `**Risk Level:** ${riskEmoji[analysis.overallRiskScore]} ${analysis.overallRiskScore.toUpperCase()}\n`;
  summary += `**Buyer Protection Score:** ${analysis.buyerProtectionScore}/100\n\n`;

  if (analysis.allKeyPoints.length > 0) {
    summary += `### Key Points\n`;
    for (const point of analysis.allKeyPoints) {
      summary += `- ${point}\n`;
    }
    summary += '\n';
  }

  if (analysis.allRiskFlags.length > 0) {
    summary += `### Risk Flags\n`;
    for (const flag of analysis.allRiskFlags) {
      const readable = flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      summary += `- ⚠️ ${readable}\n`;
    }
    summary += '\n';
  }

  const recommendations = {
    'proceed': '✅ Safe to proceed with purchase.',
    'proceed_with_caution': '⚠️ Proceed with caution. Review policies before purchasing.',
    'review_carefully': '🟠 High risk. Carefully review all policies before deciding.',
    'not_recommended': '🔴 Not recommended. Significant buyer protection concerns.'
  };

  summary += `### Recommendation\n${recommendations[analysis.recommendation]}\n`;

  return summary;
}
