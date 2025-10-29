// @ts-check
/**
 * Simplified Terms & Conditions parser for backend summary generation
 * Focuses on key consumer protection elements
 */

const cleanText = (raw) => raw.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

const dollarsToNumber = (s) => {
  const m = s.replace(/[,\s]/g, "").match(/\$?(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

const toISODate = (input) => {
  if (!input) return undefined;
  const d = new Date(input);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

/**
 * Parse terms text and extract key points
 * @param {string} textRaw - Raw terms text
 * @returns {Object} Parsed summary with key risk flags
 */
export function parseTerms(textRaw) {
  const text = cleanText(textRaw);

  const parsed = {
    updatedAt: undefined,
    keyPoints: [],
    riskFlags: {
      hasArbitration: false,
      hasClassWaiver: false,
      liabilityCap: null,
      terminationAtWill: false,
      optOutDays: null,
      governingLaw: null,
    },
  };

  // Updated date
  const mUpdated = text.match(/Last updated\s+([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (mUpdated) {
    parsed.updatedAt = toISODate(mUpdated[1]);
  }

  // Arbitration clause
  if (/(binding,?\s*individual\s*arbitration|arbitration.*JAMS|arbitration.*AAA)/i.test(text)) {
    parsed.riskFlags.hasArbitration = true;
    const provider = text.match(/(JAMS|AAA|ICC)/i);
    parsed.keyPoints.push(
      `Disputes go to binding arbitration${provider ? ` (${provider[1].toUpperCase()})` : ""}.`
    );
  }

  // Class action waiver
  if (/(class (action|representative).*(waived|waiver)|waive.*right.*class action)/i.test(text)) {
    parsed.riskFlags.hasClassWaiver = true;
    parsed.keyPoints.push("Class actions are waived.");
  }

  // Opt-out period
  const mOptOut = text.match(/opt[-\s]?out[^\d]{0,40}?(\d{1,3})\s+days?/i);
  if (mOptOut) {
    parsed.riskFlags.optOutDays = Number(mOptOut[1]);
    parsed.keyPoints.push(`You have ${mOptOut[1]} days to opt out of arbitration.`);
  }

  // Liability cap
  const mLiability = text.match(/(maximum|aggregate|total)\s+liability[^\$]*?(\$\s?[\d,]+)/i);
  if (mLiability) {
    const cap = dollarsToNumber(mLiability[2]);
    if (cap !== null) {
      parsed.riskFlags.liabilityCap = cap;
      parsed.keyPoints.push(`Liability cap: $${cap.toLocaleString()}.`);
    }
  }

  // Termination at will
  if (/(suspend|terminate).*(any\s*time|sole\s*discretion|without (prior )?notice)/i.test(text)) {
    parsed.riskFlags.terminationAtWill = true;
    parsed.keyPoints.push("Platform can suspend/terminate at its discretion.");
  }

  // Governing law
  const mLaw = text.match(/governed by.*?laws? of (the )?(State of )?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (mLaw) {
    parsed.riskFlags.governingLaw = mLaw[3];
    parsed.keyPoints.push(`Governed by ${mLaw[3]} law.`);
  }

  // Age requirement
  const mAge = text.match(/at least\s+(\d{1,2})\s+years? of age/i);
  if (mAge) {
    parsed.keyPoints.push(`You must be at least ${mAge[1]} years old.`);
  }

  // Data collection (for privacy policies)
  if (/(collect|gather|obtain).*?(personal )?information/i.test(text)) {
    if (/cookies?/i.test(text)) {
      parsed.keyPoints.push("Uses cookies and collects personal information.");
    }
  }

  // Automatic renewal
  if (/(automatically renew|auto[-\s]?renew)/i.test(text)) {
    parsed.keyPoints.push("Subscription automatically renews.");
  }

  // Refund policy
  if (/no refunds?/i.test(text) || /non[-\s]?refundable/i.test(text)) {
    parsed.keyPoints.push("No refunds policy.");
  }

  return parsed;
}

/**
 * Generate a human-readable summary from parsed terms
 * @param {ReturnType<typeof parseTerms>} parsed
 * @returns {string} Formatted summary text
 */
export function generateSummary(parsed) {
  let summary = "";

  if (parsed.updatedAt) {
    summary += `Last updated: ${parsed.updatedAt}\n\n`;
  }

  if (parsed.keyPoints.length > 0) {
    summary += "⚠️ Key Points:\n";
    parsed.keyPoints.forEach((point) => {
      summary += `• ${point}\n`;
    });
  } else {
    summary += "No significant risk factors detected.\n";
  }

  return summary.trim();
}
