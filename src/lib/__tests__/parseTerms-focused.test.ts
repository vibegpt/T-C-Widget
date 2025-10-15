import { describe, it, expect } from "vitest";
import { parseTerms } from "@/components/LegalEasySummary";

const zoraSample = `
Last updated July 29, 2025
You must be at least 18 years of age.
Zora do not have custody of your wallet or keys. Gas/network fees are non-refundable.
Transactions are final and irreversible.
Disputes resolved by binding individual arbitration with JAMS; you may opt out within 30 days.
Maximum aggregate liability is $100 or the amount received by Zora.
These terms are governed by the laws of Delaware. State and federal courts located in the State of Delaware.
California Civil Code § 1542.
OP Stack rollup; Sequencer operated by ConduitXYZ, Inc.; seven-day dispute period.
`;

describe("parseTerms", () => {
  it("extracts top-level facts", () => {
    const { parsed, risks } = parseTerms(zoraSample, { productHint: "Zora" });
    expect(parsed.product).toBe("Zora");
    expect(parsed.updatedAt).toBe("2025-07-28");
    expect(parsed.jurisdiction).toEqual(["Delaware"]);
    expect(risks.walletSelfCustody).toBe(true);
  });

  it("detects arbitration, class waiver (default false), and 30-day opt-out", () => {
    const { risks, parsed } = parseTerms(zoraSample);
    expect(risks.arbitration).toBe(true);
    expect(risks.classActionWaiver).toBe(false); // not explicitly mentioned
    const disputes = parsed.sections.find(s => s.key === "disputes");
    expect(disputes?.facts?.optOutDays).toBe(30);
  });

  it("detects liability cap and irreversible txs", () => {
    const { risks, parsed } = parseTerms(zoraSample);
    const liability = parsed.sections.find(s => s.key === "liability");
    expect(liability?.facts?.liabilityCap).toBe(100);
    expect(risks.irreversibleTxs).toBe(true);
  });

  it("detects L2 details", () => {
    const { parsed } = parseTerms(zoraSample);
    const l2 = parsed.sections.find(s => s.key === "zora_network");
    expect(l2?.facts?.stack).toBe("OP Stack");
    expect(l2?.facts?.sequencerOperator).toContain("ConduitXYZ");
    expect(l2?.facts?.disputePeriodDays).toBe(7);
  });
});

describe("parseTerms – variants", () => {
  it("UK/EU phrasing for updates & governing law", () => {
    const t = `
      We may update these Terms from time to time without prior notice.
      These Terms are governed by the laws of England and Wales.
    `;
    const { parsed } = parseTerms(t);
    const mods = parsed.sections.find(s => s.key === "modifications");
    expect(mods).toBeTruthy();
    const law = parsed.sections.find(s => s.key === "governing_law");
    expect(law?.bullets?.[0]).toMatch(/England/i);
  });

  it("Liability phrasing: 'greater of $100 or fees paid'", () => {
    const t = `
      Our maximum aggregate liability shall be the greater of $100 or the amount you paid to us.
    `;
    const { parsed, risks } = parseTerms(t);
    const liab = parsed.sections.find(s => s.key === "liability");
    expect(liab?.facts?.liabilityCap).toBe(100);
    expect(risks.liabilityCap).toBe(100);
  });

  it("Class action waiver phrasing near 'participate'", () => {
    const t = `
      You waive the right to participate in any class action or representative proceeding.
    `;
    const { risks } = parseTerms(t);
    expect(risks.classActionWaiver).toBe(true);
  });

  it("Arbitration provider AAA", () => {
    const t = `Disputes shall be resolved by binding arbitration under the rules of the AAA.`;
    const { parsed } = parseTerms(t);
    const d = parsed.sections.find(s => s.key === "disputes");
    expect(d?.facts?.arbitrationProvider).toBe("AAA");
  });

  it("No false positive on random $100 without 'liability' context", () => {
    const t = `We offer a $100 voucher to new users.`;
    const { risks } = parseTerms(t);
    expect(risks.liabilityCap).toBeNull();
  });
});
