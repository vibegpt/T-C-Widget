/**
 * Legal Easy Parser Adapters
 * --------------------------
 * These adapters convert various parser outputs into the standardized ParsedTerms format.
 * Import only what you need to keep your bundle size small.
 */

export type SectionKey =
  | "eligibility" | "compliance" | "wallet" | "services" | "tokens" | "fees"
  | "risks" | "disputes" | "liability" | "termination" | "modifications"
  | "privacy" | "ip" | "dmca" | "third_party" | "governing_law"
  | "california_notice" | "zora_network";

export type ParsedTerms = {
  product?: string;             // e.g., "Zora"
  updatedAt?: string;           // ISO date if detected
  jurisdiction?: string[];      // e.g., ["Delaware", "USA"]
  sections: Array<{
    key: SectionKey;
    title: string;
    bullets?: string[];         // short, plain-English lines for the widget
    body?: string;              // concise paragraph version
    facts?: Record<string, any>;// normalized, machine-readable fields (below)
  }>;
};

/**
 * 1. ADAPT KEYED OBJECT
 * ---------------------
 * Converts a keyed object like { rights: {...}, risks: {...}, disputes: {...} }
 * into the standardized ParsedTerms format.
 */
export function adaptKeyedObjectToParsed(obj: any): ParsedTerms | null {
  if (!obj || typeof obj !== "object") return null;
  
  // Map old keys to new section keys
  const keyMapping: Record<string, SectionKey> = {
    "rights": "wallet",
    "their_rights": "termination", 
    "platform_rights": "compliance",
    "risks": "risks",
    "disputes": "disputes",
    "liability": "liability",
    "wallet": "wallet",
    "services": "services",
    "tokens": "tokens",
    "fees": "fees",
    "eligibility": "eligibility",
    "compliance": "compliance",
    "termination": "termination",
    "modifications": "modifications",
    "privacy": "privacy",
    "ip": "ip",
    "dmca": "dmca",
    "third_party": "third_party",
    "governing_law": "governing_law",
    "california_notice": "california_notice",
    "zora_network": "zora_network"
  };
  
  const found = Object.keys(obj).filter(k => k in keyMapping);
  if (!found.length) return null;
  
  const sections = found.map((k) => {
    const val = obj[k] || {};
    return {
      key: keyMapping[k],
      title: val.title || titleCase(k.replace(/_/g, " ")),
      bullets: Array.isArray(val.bullets) ? val.bullets : undefined,
      body: typeof val.body === "string" ? val.body : undefined,
      facts: typeof val.facts === "object" ? val.facts : undefined,
    };
  });
  
  return { sections } as ParsedTerms;
}

/**
 * 2. ADAPT RAW TEXT
 * -----------------
 * Converts raw terms text into ParsedTerms using regex heuristics.
 * This is a fallback when you only have plain text.
 */
export function adaptRawTextToParsed(
  product: string, 
  updatedAt: string | undefined, 
  raw: string
): ParsedTerms {
  const sections: ParsedTerms["sections"] = [];
  const text = raw;
  
  // Heuristics for big-ticket items
  const hasArb = /arbitration|JAMS/i.test(text);
  const hasClassWaiver = /class action/i.test(text);
  const hasLiabCap = /liabilit[y|ies].{0,40}\$?\s?(\d{1,3}(,\d{3})*)/i.exec(text)?.[1];
  const canSuspend = /suspend|terminate[^\n]{0,40}account/i.test(text);
  const selfCustody = /wallet|private key|seed phrase/i.test(text);
  const irreversible = /irreversible|final|non-refundable|nonrefundable/i.test(text);
  const bridging = /bridge|rollup|layer[- ]?2|optimism|sequencer|dispute period/i.test(text);
  const optOutMatch = /opt[-\s]?out.{0,20}(\d+)\s*days?/i.exec(text);
  const optOutDays = optOutMatch ? Number(optOutMatch[1]) : undefined;

  // Wallet section
  if (selfCustody || /wallet|private key|seed phrase/i.test(text)) {
    sections.push({
      key: "wallet",
      title: "Wallet & Self-Custody",
      bullets: [
        selfCustody ? "You keep wallet & tokens (self-custody)." : "You control your account but must follow the Terms.",
      ],
      facts: { selfCustody },
    });
  }

  // Termination section
  if (canSuspend || /suspend|terminate/i.test(text)) {
    sections.push({
      key: "termination",
      title: "Account Termination",
      bullets: [
        canSuspend ? "Platform can suspend/terminate accounts at its discretion." : "Platform can enforce Terms and restrict access.",
      ],
      facts: { canSuspendAnytime: canSuspend },
    });
  }

  // Risks section
  if (irreversible || bridging || hasLiabCap) {
    sections.push({
      key: "risks",
      title: "Risks & Gotchas",
      bullets: [
        irreversible ? "Transactions are final and gas fees are non‑refundable." : "On‑chain actions may be irreversible and incur fees.",
        bridging ? "Bridging/L2 use has technical and withdrawal‑delay risks." : undefined,
      ].filter(Boolean) as string[],
      facts: { 
        irreversibleTxs: irreversible, 
        bridgingL2: bridging, 
        liabilityCap: hasLiabCap ? Number(hasLiabCap.replace(/,/g, "")) : undefined 
      },
    });
  }

  // Disputes section
  if (hasArb || hasClassWaiver || optOutDays) {
    sections.push({
      key: "disputes",
      title: "Disputes",
      bullets: [
        hasArb ? "Binding arbitration (e.g., JAMS)." : "Disputes handled per governing law.",
        hasClassWaiver ? "Class actions are waived." : undefined,
        optOutDays ? `Opt-out period: ${optOutDays} days to avoid arbitration.` : undefined,
      ].filter(Boolean) as string[],
      facts: { 
        arbitration: hasArb, 
        classActionWaiver: hasClassWaiver,
        optOutDays: optOutDays
      },
    });
  }

  // Liability section (if separate from risks)
  if (hasLiabCap && !sections.find(s => s.key === "risks")) {
    sections.push({
      key: "liability",
      title: "Liability",
      bullets: [
        `Liability cap: $${hasLiabCap.replace(/,/g, "")}`,
      ],
      facts: { 
        liabilityCap: Number(hasLiabCap.replace(/,/g, ""))
      },
    });
  }

  return { product, updatedAt, sections } as ParsedTerms;
}

/**
 * 3. ADAPT ALREADY PARSED
 * -----------------------
 * If your parser already returns the correct format, just forward it.
 */
export function adaptIfAlreadyParsed(obj: any): ParsedTerms | null {
  if (obj && Array.isArray(obj.sections)) {
    return obj as ParsedTerms;
  }
  return null;
}

/**
 * 4. UNIVERSAL ADAPTER
 * --------------------
 * Tries all adapters in order and returns the first successful result.
 */
export function adaptParserOutput(input: {
  product?: string;
  updatedAt?: string;
  parserOutput?: any;
  rawText?: string;
}): ParsedTerms {
  const { product = "", updatedAt, parserOutput, rawText } = input;
  
  const asParsed =
    adaptIfAlreadyParsed(parserOutput) ||
    adaptKeyedObjectToParsed(parserOutput) ||
    (rawText ? adaptRawTextToParsed(product, updatedAt, rawText) : null);

  if (!asParsed) {
    throw new Error("Could not adapt parser output — provide sections[], a keyed object, or rawText.");
  }
  
  return asParsed;
}

/**
 * 5. UTILITY FUNCTIONS
 * --------------------
 */
function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/**
 * 6. TYPE EXPORTS
 * ---------------
 * Re-export types for convenience
 */
export type { ParsedTerms };
