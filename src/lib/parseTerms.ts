// parseTerms.ts
// Deterministic (rules-first) parser that emits ParsedTerms + RiskFlags.
// Works with LegalEasySummaryDynamic / mapParsedToSummary you already have.

export type SectionKey =
  | "eligibility" | "compliance" | "wallet" | "services" | "tokens" | "fees"
  | "risks" | "disputes" | "liability" | "termination" | "modifications"
  | "privacy" | "ip" | "dmca" | "third_party" | "governing_law"
  | "california_notice" | "zora_network";

export type ParsedTerms = {
  product?: string;
  updatedAt?: string;           // ISO (YYYY-MM-DD)
  jurisdiction?: string[];      // e.g., ["Delaware"]
  sections: Array<{
    key: SectionKey;
    title: string;
    bullets?: string[];
    body?: string;
    facts?: Record<string, any>;
  }>;
};

export type RiskFlags = {
  arbitration?: boolean;
  classActionWaiver?: boolean;
  liabilityCap?: number | null;
  terminationAtWill?: boolean;
  walletSelfCustody?: boolean;
  irreversibleTxs?: boolean;
  bridgingL2Risks?: boolean;
  optOutDays?: number | null;
};

// ------------------------------
// Helpers & normalizers
// ------------------------------
const toISODate = (input?: string | null): string | undefined => {
  if (!input) return;
  const d = new Date(input);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

const cleanText = (raw: string): string =>
  raw.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

const dollarsToNumber = (s: string): number | null => {
  const m = s.replace(/[,\s]/g, "").match(/\$?(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

// lightweight sectionizer (mainly for future weighting/debug)
type RawSection = { title: string; body: string };
const splitIntoSections = (text: string): RawSection[] => {
  const lines = text.split(/\n|\r/);
  const sections: RawSection[] = [];
  let current: RawSection | null = null;
  const heading = /^(\d+\.|[A-Z][\w\s/&-]{0,60}):?$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (heading.test(line)) {
      if (current) sections.push(current);
      current = { title: line.replace(/:$/, ""), body: "" };
    } else {
      if (!current) current = { title: "General", body: "" };
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);
  return sections.length ? sections : [{ title: "General", body: text }];
};

// ------------------------------
// Regex extractors (deterministic)
// ------------------------------
const ex = {
  product(text: string) {
    const m = text.match(/\b([A-Z][A-Za-z0-9.&\-\s]{1,40})\b(?=\s+Terms)/);
    return m?.[1]?.trim();
  },
  updatedAt(text: string) {
    const m = text.match(/Last updated\s+([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2})/i);
    return toISODate(m?.[1] ?? null);
  },
  jurisdiction(text: string): string[] | undefined {
    const m = text.match(/governed by.*?law.*?(Delaware|California|New York|England|Wales|Ontario|Texas)/i);
    return m ? [m[1]] : undefined;
  },
  ageMin(text: string) {
    const m = text.match(/at least\s+(\d{1,2})\s+years? of age/i);
    return m ? Number(m[1]) : undefined;
  },
  sanctions(text: string) {
    return /(sanctions|embargoed jurisdiction)/i.test(text) || undefined;
  },
  selfCustody(text: string) {
    return /(do not|no)\s+(have )?custody.*(wallet|keys|assets)/i.test(text) || undefined;
  },
  gasFeesNonRefundable(text: string) {
    return /(gas|network) fees?.*?(non[-\s]?refundable|final)/i.test(text) || undefined;
  },
  irreversibleTxs(text: string) {
    return /(transactions? (are )?final|irreversible)/i.test(text) || undefined;
  },
  bridgingL2(text: string) {
    return /(bridge|rollup|layer[-\s]?two|OP\s*Stack|sequencer|dispute period)/i.test(text) || undefined;
  },
  arbitration(text: string) {
    return /(binding,?\s*individual\s*arbitration|arbitration.*JAMS)/i.test(text) || undefined;
  },
  arbitrationProvider(text: string) {
    const m = text.match(/(JAMS|AAA|ICC)/i);
    return m?.[1]?.toUpperCase();
  },
  classActionWaiver(text: string) {
    return /(class (action|representative).*(waived|waiver)|waive the right to participate in any class)/i.test(text) || undefined;
  },
  optOutDays(text: string) {
    const m = text.match(/opt[-\s]?out[^\d]{0,40}?(\d{1,3})\s+days?/i);
    return m ? Number(m[1]) : undefined;
  },
  liabilityCap(text: string) {
    const m = text.match(/(maximum|aggregate)\s+liability.*?(\$\s?[\d,]+|\d+\s*dollars?)/i);
    if (!m) return undefined;
    const n = dollarsToNumber(m[2]);
    return n ?? undefined;
  },
  terminateAtWill(text: string) {
    return /(suspend|terminate).*(any\s*time|sole\s*discretion)/i.test(text) || undefined;
  },
  modificationsImmediate(text: string) {
    return /(revise|update|change) (these )?terms.*(without prior notice|effective immediately)/i.test(text) || undefined;
  },
  notSecurity(text: string) {
    return /(not intended to be a\s*['"]?security|not (an )?investment)/i.test(text) || undefined;
  },
  noInvestmentAdvice(text: string) {
    return /(no (investment|legal|tax) advice)/i.test(text) || undefined;
  },
  dmcaEmail(text: string) {
    const m = text.match(/dmca@[^\s)>,;]+/i);
    return m?.[0]?.toLowerCase();
  },
  dmcaAddress(text: string) {
    const m = text.match(/110\s+Green\s+Street[^\n]+/i);
    return m?.[0];
  },
  governingLaw(text: string) {
    const m = text.match(/governed by\s+the\s+laws?\s+of\s+([A-Za-z\s]+)/i);
    return m?.[1]?.trim();
  },
  venue(text: string) {
    const m = text.match(/state and federal courts located in\s+the\s+State\s+of\s+([A-Za-z\s]+)/i);
    return m?.[1]?.trim();
  },
  ccp1542(text: string) {
    return /california\s+civil\s+code\s+§?\s*1542/i.test(text) || undefined;
  },
  zoraStack(text: string) {
    return /OP\s*Stack/i.test(text) ? "OP Stack" : undefined;
  },
  sequencer(text: string) {
    return /ConduitXYZ,?\s*Inc\./i.test(text) ? "ConduitXYZ, Inc." : undefined;
  },
  disputeDays(text: string) {
    return /seven[-\s]?day\s+[""']?dispute period[""']?/i.test(text) ? 7 : undefined;
  },
};

// ------------------------------
// Parser core
// ------------------------------
export function parseTerms(raw: string, opts?: { productHint?: string }) {
  const text = cleanText(raw);
  splitIntoSections(raw); // reserved for future weighting if needed

  const product = opts?.productHint || ex.product(text);
  const updatedAt = ex.updatedAt(text);
  const jurisdiction = ex.jurisdiction(text);

  const outSections: ParsedTerms["sections"] = [];

  // Eligibility
  const ageMin = ex.ageMin(text);
  if (ageMin) {
    outSections.push({
      key: "eligibility",
      title: "Eligibility",
      bullets: ["You must be at least " + ageMin + "."],
      facts: { ageMin },
    });
  }

  // Wallet / self-custody
  const selfCustody = ex.selfCustody(text);
  const gasNonRefund = ex.gasFeesNonRefundable(text);
  const irreversible = ex.irreversibleTxs(text);
  if (selfCustody || gasNonRefund || irreversible) {
    const bullets: string[] = [];
    if (selfCustody) bullets.push("Platform is not a custodian; you hold your keys.");
    if (gasNonRefund) bullets.push("Gas/network fees are non-refundable.");
    if (irreversible) bullets.push("On-chain transactions are final/irreversible.");
    outSections.push({
      key: "wallet",
      title: "Wallet & Self-Custody",
      bullets,
      facts: {
        selfCustody: !!selfCustody,
        noCustodyByPlatform: !!selfCustody,
        gasFeesNonRefundable: !!gasNonRefund,
      },
    });
  }

  // Tokens
  const notSecurity = ex.notSecurity(text);
  const noInv = ex.noInvestmentAdvice(text);
  if (notSecurity || noInv) {
    const bullets: string[] = [];
    if (notSecurity) bullets.push("Tokens framed as collectibles, not securities/investments.");
    if (noInv) bullets.push("No investment/legal/tax advice.");
    outSections.push({
      key: "tokens",
      title: "Tokens",
      bullets,
      facts: {
        notSecurity: !!notSecurity,
        collectiblesOnly: !!notSecurity,
        noInvestmentAdvice: !!noInv,
      },
    });
  }

  // Risks
  const bridging = ex.bridgingL2(text);
  if (irreversible || bridging) {
    const bullets: string[] = [];
    if (irreversible) bullets.push("Transactions are irreversible and volatile.");
    if (bridging) bullets.push("Bridging/L2 involves dispute/wait periods and technical risk.");
    outSections.push({
      key: "risks",
      title: "Risks & Gotchas",
      bullets,
      facts: { irreversibleTxs: !!irreversible, bridgingL2: !!bridging },
    });
  }

  // Disputes
  const arbitration = ex.arbitration(text);
  const provider = ex.arbitrationProvider(text);
  const classWaiver = ex.classActionWaiver(text);
  const optOutDays = ex.optOutDays(text);
  if (arbitration || classWaiver || optOutDays) {
    const bullets: string[] = [];
    if (arbitration || provider)
      bullets.push(
        "Binding individual arbitration" +
          (provider ? " (" + provider + ")" : "") +
          "; no class actions."
      );
    if (optOutDays) bullets.push("You can opt out within " + optOutDays + " days by mail.");
    outSections.push({
      key: "disputes",
      title: "Dispute Resolution",
      bullets,
      facts: {
        arbitration: !!arbitration,
        arbitrationProvider: provider,
        classActionWaiver: !!classWaiver,
        optOutDays: typeof optOutDays === "number" ? optOutDays : undefined,
      },
    });
  }

  // Liability
  const liabilityCap = ex.liabilityCap(text);
  if (typeof liabilityCap === "number") {
    outSections.push({
      key: "liability",
      title: "Liability Limit",
      bullets: ["Liability cap: $" + liabilityCap.toLocaleString() + "."],
      facts: { liabilityCap },
    });
  }

  // Termination
  const canSuspendAnytime = ex.terminateAtWill(text);
  if (canSuspendAnytime) {
    outSections.push({
      key: "termination",
      title: "Account Suspension/Termination",
      bullets: ["Platform may suspend/terminate at its discretion."],
      facts: { canSuspendAnytime },
    });
  }

  // Modifications
  const termsChangeEffectiveImmediately = ex.modificationsImmediate(text);
  if (termsChangeEffectiveImmediately) {
    outSections.push({
      key: "modifications",
      title: "Changes to the Terms",
      bullets: ["Terms can change effective immediately without prior notice."],
      facts: { termsChangeEffectiveImmediately },
    });
  }

  // IP / License
  if (/grant.*license|broad license/i.test(text)) {
    outSections.push({
      key: "ip",
      title: "Your Content & License",
      bullets: ["You grant the platform a broad license to operate/promote the service."],
      facts: { broadLicenseToOperate: true },
    });
  }

  // DMCA
  const dmcaEmail = ex.dmcaEmail(text);
  const dmcaAddress = ex.dmcaAddress(text);
  if (dmcaEmail || dmcaAddress) {
    const bullets: string[] = [];
    if (dmcaEmail) bullets.push("DMCA email: " + dmcaEmail + ".");
    if (dmcaAddress) bullets.push("DMCA mailing address present.");
    outSections.push({
      key: "dmca",
      title: "DMCA",
      bullets,
      facts: { dmcaEmail, dmcaAddress },
    });
  }

  // Governing law & venue
  const governingLaw = ex.governingLaw(text) || jurisdiction?.[0];
  const venue = ex.venue(text) || governingLaw;
  if (governingLaw) {
    outSections.push({
      key: "governing_law",
      title: "Governing Law & Venue",
      bullets: [governingLaw + (venue ? "; venue " + venue : "")],
      facts: { governingLaw, venue },
    });
  }

  // California 1542
  const ccp1542 = ex.ccp1542(text);
  if (ccp1542) {
    outSections.push({
      key: "california_notice",
      title: "California §1542",
      bullets: ["California Civil Code §1542 waiver present."],
      facts: { ccp1542Waiver: true },
    });
  }

  // Zora Network specifics
  const stack = ex.zoraStack(text);
  const sequencer = ex.sequencer(text);
  const disputePeriodDays = ex.disputeDays(text);
  if (stack || sequencer || disputePeriodDays) {
    const bullets: string[] = [];
    if (stack) bullets.push(stack + " rollup");
    if (sequencer) bullets.push("Sequencer operated by " + sequencer + ".");
    if (disputePeriodDays) bullets.push("Withdrawals subject to a " + disputePeriodDays + "-day dispute period.");
    outSections.push({
      key: "zora_network",
      title: "Zora Network (L2)",
      bullets,
      facts: { stack, sequencerOperator: sequencer, disputePeriodDays },
    });
  }

  // Risk flags for UI banner
  const risks: RiskFlags = {
    arbitration: !!arbitration,
    classActionWaiver: !!classWaiver,
    liabilityCap: typeof liabilityCap === "number" ? liabilityCap : null,
    terminationAtWill: !!canSuspendAnytime,
    walletSelfCustody: !!selfCustody,
    irreversibleTxs: !!irreversible,
    bridgingL2Risks: !!bridging,
    optOutDays: typeof optOutDays === "number" ? optOutDays : null,
  };

  const parsed: ParsedTerms = { product, updatedAt, jurisdiction, sections: outSections };
  const debug = {
    matched: {
      product,
      updatedAt,
      jurisdiction,
      ageMin,
      selfCustody,
      gasNonRefund,
      irreversible,
      bridging,
      arbitration,
      provider,
      classWaiver,
      optOutDays,
      liabilityCap,
      canSuspendAnytime,
      termsChangeEffectiveImmediately,
      dmcaEmail,
      dmcaAddress,
      governingLaw,
      venue,
      ccp1542,
      stack,
      sequencer,
      disputePeriodDays,
    },
  };

  return { parsed, risks, debug };
}
